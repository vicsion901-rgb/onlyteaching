# 온리티칭 — 오늘 작업 계획서

작성일: 2026-04-08
작성자: 개발팀

---

## 1. 자서전 골자(Outline) 시스템 설계

### 1-1. 핵심 아이디어
현재 백엔드는 받은 `source_data`를 단순 나열만 한다.
이걸 **"내러티브 엔진"**으로 만들어야 진짜 자서전다워진다.

### 1-2. 골자 4가지 모드 (사용자가 선택)

| 모드 | 설명 | 적합 상황 |
|------|------|-----------|
| 시간순 (chronological) | 1월 → 12월 순서대로 일기처럼 | 1년 회고록 |
| 사건순 (event-driven) | 큰 행사·사건 중심으로 그 주변 일상 묶기 | 임팩트 있는 자서전 |
| 학생 관련순 (student-centric) | 특정 학생의 변화 추적 | 학생 자서전 |
| 테마순 (thematic) | 감정·성장·관계 등 주제별 묶음 | 에세이형 자서전 |

### 1-3. 각 모드별 데이터 매핑

```
[시간순]
  뼈대: careClassroom (날짜순) + schedule (학사일정)
  살:   lifeRecords (감정/특이사항)

[사건순]
  뼈대: schedule.events (큰 행사만 필터: 운동회/소풍/시험)
  살:   해당 날짜 ±3일의 careClassroom 기록

[학생 관련순]
  뼈대: studentRecords (학생 목록)
  살:   각 학생별 lifeRecords + observationJournal

[테마순]
  뼈대: 감정 카테고리 5개 (긍정/도전/성장/관계/회고)
  살:   모든 데이터를 분류해서 묶음
```

### 1-4. 구현 단계

| 단계 | 내용 | 예상 시간 |
|------|------|-----------|
| 1 | 프론트: "골자 모드" 라디오 4개 추가 (입력 카드 안) | 10분 |
| 2 | 프론트: payload에 `outline_mode` 필드 추가 | 5분 |
| 3 | 백엔드: 모드별 generator 함수 4개 작성 | 30분 |
| 4 | 백엔드: 사건 필터 로직 (큰 행사 키워드 매칭) | 15분 |

---

## 2. 배민식 ERD — 병목 방지 단계별 인사이트

배민이 잘한 핵심 4가지: **읽기/쓰기 분리, 도메인 분리, 캐싱 계층, 비정규화**

### 2-1. 도메인별 테이블 분리 (현재 → 정상화)

**현재 문제**
- localStorage에 데이터 저장
- 거대한 JSON 한 덩어리

**개선 — 도메인별 명확한 테이블**

```
users               교사 계정
schools             학교
classes             반
students            학생
care_records        돌봄교실 일일 기록 (날짜 + 교사 + 반)
care_todos          돌봄 투두 (care_records FK)
care_moods          감정 기록 (분리)
schedules           학사일정
schedule_events     행사 (큰 행사 플래그)
life_records        생활기록부
observation_logs    관찰일지
meals               급식
```

### 2-2. 인덱스 전략 (병목 1차 방지)

```sql
-- 가장 빈번한 조회 패턴
CREATE INDEX idx_care_records_teacher_date
  ON care_records(teacher_id, date DESC);

CREATE INDEX idx_students_class
  ON students(class_id);

CREATE INDEX idx_schedule_school_date
  ON schedules(school_id, date);

-- 자서전 생성용 (날짜 범위 조회)
CREATE INDEX idx_care_records_date_range
  ON care_records(teacher_id, date)
  WHERE date >= CURRENT_DATE - INTERVAL '1 year';
```

### 2-3. 읽기/쓰기 분리 (Read Replica)

```
                    [App Server]
                    /          \
              쓰기                 읽기
              ↓                     ↓
          [Primary DB]    →    [Read Replica]
          (실시간 저장)         (조회 전용, 1초 지연 OK)
```

- 자서전 생성 = 읽기 90%, 쓰기 0% → Replica로 가면 Primary 부담 0
- 배민도 주문 조회는 전부 Replica

### 2-4. 캐싱 계층 (Redis)

```
사용자 요청 → 캐시 확인 → HIT면 즉시 반환
                      ↓ MISS
                    DB 조회 → 캐시 저장 → 반환
```

**캐시 대상**
- 학사일정 — 1년 단위, TTL 1일
- 학생 명부 — TTL 1시간
- 자서전 결과 — 같은 입력 = 같은 결과, TTL 1주

### 2-5. 비정규화 (배민의 진짜 핵심)

배민은 "주문 조회"를 위해 주문 테이블에 가게명·주소·메뉴명을 **복사해서 저장**한다.
이유: JOIN 없이 한 방에 조회.

**우리 적용 예**

```
care_records 테이블에 students_snapshot JSON 컬럼 추가
→ 그 날 학생이 누구였는지를 스냅샷으로 저장
→ 학생이 전학 가도 과거 기록은 그대로
→ 자서전 생성 시 students 테이블 조인 불필요
```

### 2-6. 도메인별 모듈 분리

배민 규모면 마이크로서비스 필수, 우리 규모면 일단 모놀리식 + 모듈 분리로 충분.

```
NestJS Modules
├── auth         (로그인)
├── classes      (반/학생)
├── care         (돌봄교실)
├── schedule     (학사일정)
├── records      (생활기록부)
└── autobiography (자서전 — 다른 모듈 데이터 읽기 전용)
```

### 2-7. 비동기 큐 (자서전 같은 무거운 작업)

```
사용자: "자서전 생성" 클릭
   ↓
API: 200 OK + jobId 즉시 반환 (0.1초)
   ↓
백그라운드 워커가 BullMQ로 처리 (5초~30초)
   ↓
완료되면 WebSocket/SSE로 클라이언트에 알림
```

- 사용자는 기다리는 동안 다른 작업 가능
- 서버 인스턴스가 동시 요청에 막히지 않음

---

## 3. 우선순위 로드맵

| 시점 | 작업 |
|------|------|
| 오늘 | 자서전 골자 4가지 모드 구현 |
| 이번 주 | 2-1 도메인 분리 + 2-2 인덱스 (DB 마이그레이션) |
| 다음 주 | 2-4 캐싱(Redis) + 2-7 자서전 비동기 큐 |
| 사용자 100명+ | 2-3 읽기 Replica 도입 |
| 사용자 1000명+ | 2-6 모듈 분리 → 마이크로서비스 검토 |
