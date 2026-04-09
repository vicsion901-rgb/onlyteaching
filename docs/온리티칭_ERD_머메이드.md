# 온리티칭 ERD — Mermaid 다이어그램

```mermaid
erDiagram
    SCHOOLS ||--o{ TEACHERS : "소속"
    SCHOOLS ||--o{ CLASSES : "보유"
    SCHOOLS ||--o{ SCHEDULES : "운영"

    TEACHERS ||--o{ CLASSES : "담임"
    TEACHERS ||--o{ CARE_RECORDS : "작성"
    TEACHERS ||--o{ LIFE_RECORDS : "작성"
    TEACHERS ||--o{ OBSERVATION_LOGS : "작성"
    TEACHERS ||--o{ AUTOBIOGRAPHY_JOBS : "생성"
    TEACHERS ||--o{ TOOL_LOGS : "사용"

    CLASSES ||--o{ STUDENTS : "포함"

    STUDENTS ||--o{ LIFE_RECORDS : "대상"
    STUDENTS ||--o{ OBSERVATION_LOGS : "대상"
    STUDENTS ||--o{ CARE_STUDENT_MOODS : "감정"

    CARE_RECORDS ||--o{ CARE_TODOS : "투두"
    CARE_RECORDS ||--o{ CARE_STUDENT_MOODS : "감정기록"

    SCHOOLS {
        bigint schoolId PK
        varchar name
        varchar schoolCode UK
        varchar region
        varchar address
        varchar phone
        timestamp createdDate
        varchar status
    }

    TEACHERS {
        bigint teacherId PK
        bigint schoolId FK
        varchar loginId UK
        varchar password
        varchar name
        varchar role
        varchar subject
        varchar phone
        varchar email
        timestamp lastLoginAt
        varchar status
    }

    CLASSES {
        bigint classId PK
        bigint schoolId FK
        bigint teacherId FK
        int year
        int grade
        int classNo
        varchar status
    }

    STUDENTS {
        bigint studentId PK
        bigint classId FK
        int number
        varchar name
        char gender
        date birthDate
        varchar guardianName
        varchar guardianPhone
        varchar address
        varchar status
    }

    CARE_RECORDS {
        bigint careRecordId PK
        bigint teacherId FK
        bigint classId FK
        date recordDate
        varchar overallMood
        text importantEvents
        int todoCount
        int doneTodoCount
        varchar status
    }

    CARE_TODOS {
        bigint todoId PK
        bigint careRecordId FK
        varchar content
        tinyint isDeadline
        tinyint isDone
        int sortOrder
        varchar status
    }

    CARE_STUDENT_MOODS {
        bigint moodId PK
        bigint careRecordId FK
        bigint studentId FK
        varchar studentName
        varchar mood
        varchar customMood
        varchar note
        varchar status
    }

    SCHEDULES {
        bigint scheduleId PK
        bigint schoolId FK
        varchar title
        text description
        date startDate
        date endDate
        tinyint isMajorEvent
        varchar eventType
        varchar status
    }

    LIFE_RECORDS {
        bigint lifeRecordId PK
        bigint studentId FK
        bigint teacherId FK
        varchar keyword
        text content
        int year
        int semester
        varchar status
    }

    OBSERVATION_LOGS {
        bigint logId PK
        bigint studentId FK
        bigint teacherId FK
        date observedDate
        varchar category
        text content
        varchar status
    }

    AUTOBIOGRAPHY_JOBS {
        bigint jobId PK
        bigint teacherId FK
        varchar mode
        varchar outlineMode
        text prompt
        json sourceData
        longtext generatedText
        varchar jobStatus
        timestamp processedAt
        varchar status
    }

    TOOL_LOGS {
        bigint logId PK
        bigint teacherId FK
        varchar toolType
        json inputData
        json outputData
        varchar status
    }
```

---

## 관계 요약

| Parent | Child | 관계 | 의미 |
|--------|-------|------|------|
| SCHOOLS | TEACHERS | 1:N | 학교에 소속된 교사들 |
| SCHOOLS | CLASSES | 1:N | 학교의 학급들 |
| SCHOOLS | SCHEDULES | 1:N | 학교 학사일정 |
| TEACHERS | CLASSES | 1:N | 담임 교사 |
| TEACHERS | CARE_RECORDS | 1:N | 돌봄교실 일일 기록 |
| TEACHERS | AUTOBIOGRAPHY_JOBS | 1:N | 자서전 생성 작업 |
| CLASSES | STUDENTS | 1:N | 반 → 학생 |
| STUDENTS | LIFE_RECORDS | 1:N | 학생별 생활기록부 |
| STUDENTS | OBSERVATION_LOGS | 1:N | 학생별 관찰일지 |
| STUDENTS | CARE_STUDENT_MOODS | 1:N | 학생별 감정 기록 |
| CARE_RECORDS | CARE_TODOS | 1:N | 일일 기록 → 투두들 |
| CARE_RECORDS | CARE_STUDENT_MOODS | 1:N | 일일 기록 → 학생별 감정들 |
