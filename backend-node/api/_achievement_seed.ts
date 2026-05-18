// 초등 전교과 성취기준 시드 데이터
// 영역 매핑과 코드 형식은 통일했으나, standard 문장은 공식 교육과정 그대로가 아닌
// 영역 의미를 살린 일반화 표현임. 학교 운영 정식 데이터는 KICE/교육부 자료로 교체 권장.

export interface AchievementSeedRow {
  subject: string;
  grade_group: string; // '1-2' | '3-4' | '5-6'
  area: string;
  code: string;
  standard: string;
}

export const ACHIEVEMENT_SEED: AchievementSeedRow[] = [
  // ============== 국어 ==============
  // 1-2학년군
  { subject: '국어', grade_group: '1-2', area: '듣기·말하기', code: 'K12-LS-01', standard: '바른 자세로 집중하며 남의 말을 듣고 자신의 생각을 또렷하게 말한다.' },
  { subject: '국어', grade_group: '1-2', area: '듣기·말하기', code: 'K12-LS-02', standard: '경험한 일을 친구에게 차례대로 이야기한다.' },
  { subject: '국어', grade_group: '1-2', area: '읽기', code: 'K12-R-01', standard: '글자를 정확하게 읽고 문장의 의미를 파악한다.' },
  { subject: '국어', grade_group: '1-2', area: '읽기', code: 'K12-R-02', standard: '글을 띄어 읽으며 글에 흥미를 가진다.' },
  { subject: '국어', grade_group: '1-2', area: '쓰기', code: 'K12-W-01', standard: '자신의 생각이나 겪은 일을 짧은 문장으로 쓴다.' },
  { subject: '국어', grade_group: '1-2', area: '쓰기', code: 'K12-W-02', standard: '주어진 그림이나 사진을 보고 문장을 만들어 쓴다.' },
  { subject: '국어', grade_group: '1-2', area: '문법', code: 'K12-GR-01', standard: '한글 자모의 이름과 소릿값을 알고 정확하게 쓴다.' },
  { subject: '국어', grade_group: '1-2', area: '문법', code: 'K12-GR-02', standard: '문장 부호의 쓰임을 알고 바르게 사용한다.' },
  { subject: '국어', grade_group: '1-2', area: '문학', code: 'K12-LI-01', standard: '말놀이나 낭독을 즐기며 작품에 흥미를 가진다.' },
  { subject: '국어', grade_group: '1-2', area: '문학', code: 'K12-LI-02', standard: '동시와 짧은 이야기를 읽고 자신의 느낌을 표현한다.' },
  // 3-4학년군
  { subject: '국어', grade_group: '3-4', area: '듣기·말하기', code: 'K34-LS-01', standard: '대화의 즐거움을 알고 예절을 지키며 대화한다.' },
  { subject: '국어', grade_group: '3-4', area: '듣기·말하기', code: 'K34-LS-02', standard: '상황과 듣는 사람을 고려하여 자신의 생각을 발표한다.' },
  { subject: '국어', grade_group: '3-4', area: '읽기', code: 'K34-R-01', standard: '문단의 중심 내용을 파악하며 글을 읽는다.' },
  { subject: '국어', grade_group: '3-4', area: '읽기', code: 'K34-R-02', standard: '글의 내용과 자신의 경험을 관련지어 의미를 이해한다.' },
  { subject: '국어', grade_group: '3-4', area: '쓰기', code: 'K34-W-01', standard: '읽는 이를 고려하여 자신의 마음을 표현하는 글을 쓴다.' },
  { subject: '국어', grade_group: '3-4', area: '쓰기', code: 'K34-W-02', standard: '인상 깊은 경험을 시간 순서에 맞게 정리하여 쓴다.' },
  { subject: '국어', grade_group: '3-4', area: '문법', code: 'K34-GR-01', standard: '국어사전에서 낱말을 찾아 뜻을 파악한다.' },
  { subject: '국어', grade_group: '3-4', area: '문법', code: 'K34-GR-02', standard: '낱말의 짜임과 종류를 알고 상황에 맞게 사용한다.' },
  { subject: '국어', grade_group: '3-4', area: '문학', code: 'K34-LI-01', standard: '작품 속 인물의 마음을 짐작하며 감상한다.' },
  { subject: '국어', grade_group: '3-4', area: '문학', code: 'K34-LI-02', standard: '이야기의 흐름을 파악하고 자신의 생각과 비교한다.' },
  // 5-6학년군
  { subject: '국어', grade_group: '5-6', area: '듣기·말하기', code: 'K56-LS-01', standard: '토의와 토론의 절차를 알고 적극적으로 참여한다.' },
  { subject: '국어', grade_group: '5-6', area: '듣기·말하기', code: 'K56-LS-02', standard: '자료를 활용해 효과적으로 설명하거나 발표한다.' },
  { subject: '국어', grade_group: '5-6', area: '읽기', code: 'K56-R-01', standard: '글의 구조와 글쓴이의 관점을 파악하며 읽는다.' },
  { subject: '국어', grade_group: '5-6', area: '읽기', code: 'K56-R-02', standard: '다양한 매체 글을 읽고 정보를 비교·평가한다.' },
  { subject: '국어', grade_group: '5-6', area: '쓰기', code: 'K56-W-01', standard: '다양한 근거를 들어 주장하는 글을 쓴다.' },
  { subject: '국어', grade_group: '5-6', area: '쓰기', code: 'K56-W-02', standard: '글의 목적·독자를 고려해 적절한 형식으로 쓴다.' },
  { subject: '국어', grade_group: '5-6', area: '문법', code: 'K56-GR-01', standard: '언어의 특성과 국어의 어휘 체계를 이해한다.' },
  { subject: '국어', grade_group: '5-6', area: '문법', code: 'K56-GR-02', standard: '문장 성분과 호응 관계를 알고 바르게 쓴다.' },
  { subject: '국어', grade_group: '5-6', area: '문학', code: 'K56-LI-01', standard: '작품에 반영된 사회·문화적 상황을 이해한다.' },
  { subject: '국어', grade_group: '5-6', area: '문학', code: 'K56-LI-02', standard: '시·소설·희곡 등 갈래의 특성을 알고 감상한다.' },

  // ============== 수학 ==============
  // 1-2학년군
  { subject: '수학', grade_group: '1-2', area: '수와 연산', code: 'M12-NO-01', standard: '100까지의 수를 이해하고 덧셈과 뺄셈을 계산한다.' },
  { subject: '수학', grade_group: '1-2', area: '수와 연산', code: 'M12-NO-02', standard: '두 자리 수의 덧셈·뺄셈을 다양한 방법으로 해결한다.' },
  { subject: '수학', grade_group: '1-2', area: '도형', code: 'M12-GE-01', standard: '세모, 네모, 동그라미 모양을 직관적으로 이해하고 구별한다.' },
  { subject: '수학', grade_group: '1-2', area: '측정', code: 'M12-ME-01', standard: '길이·무게·시각의 양을 비교하고 단위로 측정한다.' },
  { subject: '수학', grade_group: '1-2', area: '규칙성', code: 'M12-RE-01', standard: '주변에서 규칙을 찾고 규칙을 만들어 본다.' },
  { subject: '수학', grade_group: '1-2', area: '자료와 가능성', code: 'M12-DA-01', standard: '실물·그림으로 자료를 분류하고 정리한다.' },
  // 3-4학년군
  { subject: '수학', grade_group: '3-4', area: '수와 연산', code: 'M34-NO-01', standard: '다섯 자리 이상의 수와 분수, 소수를 이해하고 사칙연산을 한다.' },
  { subject: '수학', grade_group: '3-4', area: '수와 연산', code: 'M34-NO-02', standard: '분수와 소수의 의미와 크기 비교를 이해한다.' },
  { subject: '수학', grade_group: '3-4', area: '도형', code: 'M34-GE-01', standard: '삼각형, 사각형, 원의 구성 요소와 성질을 이해한다.' },
  { subject: '수학', grade_group: '3-4', area: '측정', code: 'M34-ME-01', standard: '시간, 길이, 들이, 무게의 단위를 알고 측정한다.' },
  { subject: '수학', grade_group: '3-4', area: '규칙성', code: 'M34-RE-01', standard: '수와 도형의 규칙을 찾아 식이나 표로 나타낸다.' },
  { subject: '수학', grade_group: '3-4', area: '자료와 가능성', code: 'M34-DA-01', standard: '자료를 수집하여 표와 막대그래프로 나타낸다.' },
  // 5-6학년군
  { subject: '수학', grade_group: '5-6', area: '수와 연산', code: 'M56-NO-01', standard: '분수와 소수의 사칙연산을 능숙하게 계산한다.' },
  { subject: '수학', grade_group: '5-6', area: '도형', code: 'M56-GE-01', standard: '직육면체, 정육면체, 각기둥, 각뿔의 성질을 안다.' },
  { subject: '수학', grade_group: '5-6', area: '측정', code: 'M56-ME-01', standard: '평면도형의 둘레와 넓이, 입체도형의 겉넓이와 부피를 구한다.' },
  { subject: '수학', grade_group: '5-6', area: '규칙성', code: 'M56-RE-01', standard: '비와 비율을 이해하고 비례식을 푼다.' },
  { subject: '수학', grade_group: '5-6', area: '자료와 가능성', code: 'M56-DA-01', standard: '평균과 가능성을 이해하고 실생활 문제에 활용한다.' },

  // ============== 사회 ==============
  // 3-4학년군
  { subject: '사회', grade_group: '3-4', area: '지리', code: 'S34-GEO-01', standard: '우리 고장의 자연환경과 인문환경을 탐구한다.' },
  { subject: '사회', grade_group: '3-4', area: '지리', code: 'S34-GEO-02', standard: '지도의 기본 요소와 우리 지역의 위치를 안다.' },
  { subject: '사회', grade_group: '3-4', area: '역사', code: 'S34-HIS-01', standard: '우리 지역의 문화유산과 역사적 인물을 조사한다.' },
  { subject: '사회', grade_group: '3-4', area: '역사', code: 'S34-HIS-02', standard: '옛날과 오늘날의 생활 모습을 비교한다.' },
  { subject: '사회', grade_group: '3-4', area: '일반사회', code: 'S34-SOC-01', standard: '주민 참여와 자치 활동의 중요성을 이해한다.' },
  { subject: '사회', grade_group: '3-4', area: '일반사회', code: 'S34-SOC-02', standard: '가정·학교·지역 사회의 문제와 해결 방안을 생각한다.' },
  // 5-6학년군
  { subject: '사회', grade_group: '5-6', area: '지리', code: 'S56-GEO-01', standard: '우리 국토의 위치와 영역, 자연환경의 특성을 설명한다.' },
  { subject: '사회', grade_group: '5-6', area: '지리', code: 'S56-GEO-02', standard: '세계 여러 지역의 자연환경과 인문환경을 비교한다.' },
  { subject: '사회', grade_group: '5-6', area: '역사', code: 'S56-HIS-01', standard: '조선 후기부터 대한민국 수립까지의 역사적 과정을 이해한다.' },
  { subject: '사회', grade_group: '5-6', area: '역사', code: 'S56-HIS-02', standard: '근현대 한국 사회의 변화와 주요 사건을 설명한다.' },
  { subject: '사회', grade_group: '5-6', area: '일반사회', code: 'S56-SOC-01', standard: '민주주의의 원리와 국가 기관의 역할을 이해한다.' },
  { subject: '사회', grade_group: '5-6', area: '일반사회', code: 'S56-SOC-02', standard: '경제 활동의 의미와 우리나라 경제 체제를 설명한다.' },

  // ============== 과학 ==============
  // 3-4학년군
  { subject: '과학', grade_group: '3-4', area: '탐구', code: 'SCI34-IN-01', standard: '관찰과 측정의 방법을 익혀 과학적 의문을 가진다.' },
  { subject: '과학', grade_group: '3-4', area: '생명', code: 'SCI34-LI-01', standard: '동물의 한살이와 식물의 한살이를 관찰하고 비교한다.' },
  { subject: '과학', grade_group: '3-4', area: '생명', code: 'SCI34-LI-02', standard: '생물의 생김새와 생활 방식, 환경과의 관계를 이해한다.' },
  { subject: '과학', grade_group: '3-4', area: '물질', code: 'SCI34-MA-01', standard: '물체의 성질과 물질의 상태(고체, 액체, 기체)를 알아본다.' },
  { subject: '과학', grade_group: '3-4', area: '물질', code: 'SCI34-MA-02', standard: '혼합물의 분리 방법과 우리 생활에서의 활용을 안다.' },
  { subject: '과학', grade_group: '3-4', area: '운동과 에너지', code: 'SCI34-EN-01', standard: '자석의 성질과 이용, 소리의 성질을 탐구한다.' },
  { subject: '과학', grade_group: '3-4', area: '지구와 우주', code: 'SCI34-EA-01', standard: '지표의 변화와 지층, 화석의 생성 과정을 이해한다.' },
  // 5-6학년군
  { subject: '과학', grade_group: '5-6', area: '탐구', code: 'SCI56-IN-01', standard: '문제 인식·가설 설정·자료 해석 등 탐구 과정을 수행한다.' },
  { subject: '과학', grade_group: '5-6', area: '생명', code: 'SCI56-LI-01', standard: '식물의 구조와 기능, 우리 몸의 구조와 기능을 이해한다.' },
  { subject: '과학', grade_group: '5-6', area: '물질', code: 'SCI56-MA-01', standard: '용해와 용액, 산과 염기의 성질을 실험을 통해 알아본다.' },
  { subject: '과학', grade_group: '5-6', area: '물질', code: 'SCI56-MA-02', standard: '연소와 소화의 조건, 우리 생활에서의 안전을 이해한다.' },
  { subject: '과학', grade_group: '5-6', area: '운동과 에너지', code: 'SCI56-EN-01', standard: '물체의 빠르기, 전기의 이용, 빛과 렌즈를 탐구한다.' },
  { subject: '과학', grade_group: '5-6', area: '지구와 우주', code: 'SCI56-EA-01', standard: '계절의 변화, 날씨와 우리 생활, 지구와 달의 운동을 설명한다.' },

  // ============== 영어 ==============
  // 3-4학년군
  { subject: '영어', grade_group: '3-4', area: '듣기', code: 'E34-LS-01', standard: '알파벳과 낱말의 소리를 식별하고 쉬운 낱말을 듣고 이해한다.' },
  { subject: '영어', grade_group: '3-4', area: '듣기', code: 'E34-LS-02', standard: '간단한 지시나 권유를 듣고 행동한다.' },
  { subject: '영어', grade_group: '3-4', area: '말하기', code: 'E34-SP-01', standard: '인사, 자기소개 등 아주 간단한 표현을 말한다.' },
  { subject: '영어', grade_group: '3-4', area: '말하기', code: 'E34-SP-02', standard: '주변 사물과 인물을 가리키며 간단히 묘사한다.' },
  { subject: '영어', grade_group: '3-4', area: '읽기', code: 'E34-RD-01', standard: '알파벳 대소문자와 쉽고 간단한 낱말을 읽는다.' },
  { subject: '영어', grade_group: '3-4', area: '쓰기', code: 'E34-WR-01', standard: '알파벳 대소문자와 구두점을 바르게 쓴다.' },
  // 5-6학년군
  { subject: '영어', grade_group: '5-6', area: '듣기', code: 'E56-LS-01', standard: '일상생활에 관한 간단한 대화나 담화를 듣고 세부 내용을 파악한다.' },
  { subject: '영어', grade_group: '5-6', area: '듣기', code: 'E56-LS-02', standard: '간단한 이야기를 듣고 사건의 흐름을 이해한다.' },
  { subject: '영어', grade_group: '5-6', area: '말하기', code: 'E56-SP-01', standard: '그림이나 도표 등을 보며 대상을 묘사하거나 설명한다.' },
  { subject: '영어', grade_group: '5-6', area: '말하기', code: 'E56-SP-02', standard: '자신과 주변에 대해 간단한 의견을 말한다.' },
  { subject: '영어', grade_group: '5-6', area: '읽기', code: 'E56-RD-01', standard: '쉽고 간단한 문장과 짧은 글을 읽고 줄거리를 파악한다.' },
  { subject: '영어', grade_group: '5-6', area: '쓰기', code: 'E56-WR-01', standard: '예시문을 참고하여 간단한 초대, 감사, 축하 등의 글을 쓴다.' },

  // ============== 도덕 ==============
  // 3-4학년군
  { subject: '도덕', grade_group: '3-4', area: '자신과의 관계', code: 'ETH34-ME-01', standard: '소중한 나, 성실한 생활의 의미를 알고 실천한다.' },
  { subject: '도덕', grade_group: '3-4', area: '자신과의 관계', code: 'ETH34-ME-02', standard: '시간 관리와 약속 지키기의 중요성을 알고 실천한다.' },
  { subject: '도덕', grade_group: '3-4', area: '타인과의 관계', code: 'ETH34-OT-01', standard: '가족의 소중함과 친구 간의 우정을 알고 예절을 지킨다.' },
  { subject: '도덕', grade_group: '3-4', area: '사회·공동체와의 관계', code: 'ETH34-CO-01', standard: '공공장소에서의 질서와 규칙을 지키는 태도를 기른다.' },
  { subject: '도덕', grade_group: '3-4', area: '자연·초월과의 관계', code: 'ETH34-NA-01', standard: '생명을 존중하고 자연을 아끼는 태도를 가진다.' },
  // 5-6학년군
  { subject: '도덕', grade_group: '5-6', area: '자신과의 관계', code: 'ETH56-ME-01', standard: '감정의 조절과 자아 존중감을 기르고 자주적인 삶을 산다.' },
  { subject: '도덕', grade_group: '5-6', area: '타인과의 관계', code: 'ETH56-OT-01', standard: '사이버 공간에서의 예절과 인권을 존중하는 태도를 가진다.' },
  { subject: '도덕', grade_group: '5-6', area: '타인과의 관계', code: 'ETH56-OT-02', standard: '갈등 상황에서 평화롭게 문제를 해결하는 방법을 안다.' },
  { subject: '도덕', grade_group: '5-6', area: '사회·공동체와의 관계', code: 'ETH56-CO-01', standard: '준법, 공정성, 다양성 존중의 의미를 이해하고 실천한다.' },
  { subject: '도덕', grade_group: '5-6', area: '자연·초월과의 관계', code: 'ETH56-NA-01', standard: '생명 존중과 평화 통일의 의지를 다진다.' },

  // ============== 음악 ==============
  // 1-2학년군
  { subject: '음악', grade_group: '1-2', area: '표현', code: 'MUS12-EX-01', standard: '노랫말과 가락의 재미를 느끼며 노래 부른다.' },
  { subject: '음악', grade_group: '1-2', area: '감상', code: 'MUS12-AP-01', standard: '다양한 소리와 음악을 듣고 느낌을 이야기한다.' },
  { subject: '음악', grade_group: '1-2', area: '생활화', code: 'MUS12-LI-01', standard: '생활 속에서 음악을 즐기고 놀이에 활용한다.' },
  // 3-4학년군
  { subject: '음악', grade_group: '3-4', area: '표현', code: 'MUS34-EX-01', standard: '악곡의 특징을 살려 노래 부르거나 악기로 연주한다.' },
  { subject: '음악', grade_group: '3-4', area: '표현', code: 'MUS34-EX-02', standard: '간단한 가락을 만들어 노래하거나 연주한다.' },
  { subject: '음악', grade_group: '3-4', area: '감상', code: 'MUS34-AP-01', standard: '음악 요소와 개념을 이해하며 음악을 듣는다.' },
  { subject: '음악', grade_group: '3-4', area: '생활화', code: 'MUS34-LI-01', standard: '음악을 통해 가족, 친구와 소통하며 행사 음악에 참여한다.' },
  // 5-6학년군
  { subject: '음악', grade_group: '5-6', area: '표현', code: 'MUS56-EX-01', standard: '화음과 형식을 이해하며 어울림을 느껴 합창하거나 합주한다.' },
  { subject: '음악', grade_group: '5-6', area: '감상', code: 'MUS56-AP-01', standard: '다양한 문화권의 음악을 듣고 특징을 비교한다.' },
  { subject: '음악', grade_group: '5-6', area: '감상', code: 'MUS56-AP-02', standard: '국악과 서양 음악의 갈래·시대 특징을 안다.' },
  { subject: '음악', grade_group: '5-6', area: '생활화', code: 'MUS56-LI-01', standard: '음악이 우리 삶과 사회에 미치는 영향을 이해한다.' },

  // ============== 미술 ==============
  // 1-2학년군
  { subject: '미술', grade_group: '1-2', area: '체험', code: 'ART12-EX-01', standard: '자연과 생활 속에서 아름다움을 발견하고 오감을 통해 탐색한다.' },
  { subject: '미술', grade_group: '1-2', area: '표현', code: 'ART12-PR-01', standard: '느낌과 생각을 다양한 방법으로 자유롭게 나타낸다.' },
  { subject: '미술', grade_group: '1-2', area: '감상', code: 'ART12-AP-01', standard: '자신과 친구의 작품을 소중히 여기며 감상한다.' },
  // 3-4학년군
  { subject: '미술', grade_group: '3-4', area: '체험', code: 'ART34-EX-01', standard: '환경과 현상, 대상을 관찰하고 특징을 파악한다.' },
  { subject: '미술', grade_group: '3-4', area: '표현', code: 'ART34-PR-01', standard: '조형 요소와 원리를 탐색하고 주제를 효과적으로 표현한다.' },
  { subject: '미술', grade_group: '3-4', area: '표현', code: 'ART34-PR-02', standard: '다양한 재료와 도구를 안전하게 사용해 작품을 만든다.' },
  { subject: '미술', grade_group: '3-4', area: '감상', code: 'ART34-AP-01', standard: '미술 작품의 특징과 작가의 의도를 생각하며 감상한다.' },
  // 5-6학년군
  { subject: '미술', grade_group: '5-6', area: '체험', code: 'ART56-EX-01', standard: '나와 타인, 사회와 환경의 관계를 탐색하고 시각 문화에 관심을 가진다.' },
  { subject: '미술', grade_group: '5-6', area: '표현', code: 'ART56-PR-01', standard: '다양한 재료와 매체를 활용하여 창의적으로 제작한다.' },
  { subject: '미술', grade_group: '5-6', area: '감상', code: 'ART56-AP-01', standard: '우리나라와 다른 나라 미술의 특징을 비교하고 존중한다.' },

  // ============== 체육 ==============
  // 1-2학년군
  { subject: '체육', grade_group: '1-2', area: '건강', code: 'PE12-HE-01', standard: '건강한 생활 습관을 기르고 신체 활동을 즐긴다.' },
  { subject: '체육', grade_group: '1-2', area: '도전', code: 'PE12-CH-01', standard: '기본적인 움직임 기술을 익히고 활동에 참여한다.' },
  { subject: '체육', grade_group: '1-2', area: '표현', code: 'PE12-EX-01', standard: '리듬에 맞춰 신체를 움직이며 표현하는 즐거움을 느낀다.' },
  { subject: '체육', grade_group: '1-2', area: '안전', code: 'PE12-SA-01', standard: '운동 시 발생하는 위험을 알고 안전 수칙을 지킨다.' },
  // 3-4학년군
  { subject: '체육', grade_group: '3-4', area: '건강', code: 'PE34-HE-01', standard: '체력의 중요성을 알고 꾸준히 운동한다.' },
  { subject: '체육', grade_group: '3-4', area: '도전', code: 'PE34-CH-01', standard: '거리·시간 등 자신의 기록에 도전하며 노력한다.' },
  { subject: '체육', grade_group: '3-4', area: '경쟁', code: 'PE34-CO-01', standard: '경쟁 활동의 규칙을 지키며 협동심을 기른다.' },
  { subject: '체육', grade_group: '3-4', area: '표현', code: 'PE34-EX-01', standard: '움직임 언어로 생각과 느낌을 표현한다.' },
  { subject: '체육', grade_group: '3-4', area: '안전', code: 'PE34-SA-01', standard: '학교생활 속 안전사고를 예방하고 응급 상황에 대처한다.' },
  // 5-6학년군
  { subject: '체육', grade_group: '5-6', area: '건강', code: 'PE56-HE-01', standard: '건강 관리 방법을 알고 실천하며 질병을 예방한다.' },
  { subject: '체육', grade_group: '5-6', area: '도전', code: 'PE56-CH-01', standard: '도전 목표를 정하고 자기 관리 능력을 기른다.' },
  { subject: '체육', grade_group: '5-6', area: '경쟁', code: 'PE56-CO-01', standard: '다양한 스포츠 활동의 기능과 전략을 익혀 경기에 참여한다.' },
  { subject: '체육', grade_group: '5-6', area: '표현', code: 'PE56-EX-01', standard: '주제 표현과 창작 움직임을 통해 자기 생각을 나타낸다.' },
  { subject: '체육', grade_group: '5-6', area: '안전', code: 'PE56-SA-01', standard: '운동 중 발생할 수 있는 안전사고의 예방과 대처 방법을 안다.' },

  // ============== 실과 (5-6학년군) ==============
  { subject: '실과', grade_group: '5-6', area: '인간 발달과 가족', code: 'TEC56-FA-01', standard: '아동기의 발달 특징을 알고 건강한 발달을 위해 노력한다.' },
  { subject: '실과', grade_group: '5-6', area: '인간 발달과 가족', code: 'TEC56-FA-02', standard: '가족 구성원의 역할과 가족 관계의 중요성을 안다.' },
  { subject: '실과', grade_group: '5-6', area: '가정생활과 안전', code: 'TEC56-HM-01', standard: '균형 잡힌 식사의 중요성을 알고 식사를 계획한다.' },
  { subject: '실과', grade_group: '5-6', area: '가정생활과 안전', code: 'TEC56-HM-02', standard: '의생활·주생활에서의 자원 관리와 안전 수칙을 안다.' },
  { subject: '실과', grade_group: '5-6', area: '자원 관리와 자립', code: 'TEC56-RE-01', standard: '용돈 관리와 합리적 소비의 의미를 안다.' },
  { subject: '실과', grade_group: '5-6', area: '기술 시스템', code: 'TEC56-TE-01', standard: '생활 속의 다양한 발명품을 탐색하고 아이디어를 구상한다.' },
  { subject: '실과', grade_group: '5-6', area: '기술 활용', code: 'TEC56-TE-02', standard: '소프트웨어와 로봇의 기초 원리를 이해하고 체험한다.' },
  { subject: '실과', grade_group: '5-6', area: '기술 활용', code: 'TEC56-TE-03', standard: '디지털 기기와 정보 윤리의 중요성을 안다.' },

  // ============== 통합교과 (1-2학년군) ==============
  // 바른 생활
  { subject: '통합교과', grade_group: '1-2', area: '바른 생활', code: 'INT12-RL-01', standard: '학교 생활 규칙을 알고 바르게 생활한다.' },
  { subject: '통합교과', grade_group: '1-2', area: '바른 생활', code: 'INT12-RL-02', standard: '가족과 친척의 소중함을 알고 예절을 지킨다.' },
  { subject: '통합교과', grade_group: '1-2', area: '바른 생활', code: 'INT12-RL-03', standard: '다른 사람을 배려하고 공공질서를 실천한다.' },
  { subject: '통합교과', grade_group: '1-2', area: '바른 생활', code: 'INT12-RL-04', standard: '안전한 생활을 위한 규칙과 행동을 안다.' },
  // 슬기로운 생활
  { subject: '통합교과', grade_group: '1-2', area: '슬기로운 생활', code: 'INT12-WL-01', standard: '학교와 주변의 모습을 관찰하고 탐구한다.' },
  { subject: '통합교과', grade_group: '1-2', area: '슬기로운 생활', code: 'INT12-WL-02', standard: '봄, 여름, 가을, 겨울의 변화와 특징을 알아본다.' },
  { subject: '통합교과', grade_group: '1-2', area: '슬기로운 생활', code: 'INT12-WL-03', standard: '우리 동네의 모습과 사람들이 하는 일을 조사한다.' },
  { subject: '통합교과', grade_group: '1-2', area: '슬기로운 생활', code: 'INT12-WL-04', standard: '우리나라와 다른 나라의 생활 모습을 비교한다.' },
  // 즐거운 생활
  { subject: '통합교과', grade_group: '1-2', area: '즐거운 생활', code: 'INT12-PL-01', standard: '다양한 놀이와 표현 활동에 즐겁게 참여한다.' },
  { subject: '통합교과', grade_group: '1-2', area: '즐거운 생활', code: 'INT12-PL-02', standard: '노래와 춤, 만들기를 통해 느낌과 생각을 표현한다.' },
  { subject: '통합교과', grade_group: '1-2', area: '즐거운 생활', code: 'INT12-PL-03', standard: '문화 예술 공연과 전시를 관람하고 즐긴다.' },
];
