BEGIN TRANSACTION;

-- =========================
-- 학습 태도 (learning_attitude)
-- =========================
INSERT OR IGNORE INTO student_record_comments (category, subcategory, attribute, content)
VALUES
('keyword_seed','learning_attitude','trait','성실한 태도를 보임'),
('keyword_seed','learning_attitude','trait','자기주도적으로 학습함'),
('keyword_seed','learning_attitude','trait','학습에 대한 책임감이 높음'),
('keyword_seed','learning_attitude','behavior','수업에 적극적으로 참여함'),
('keyword_seed','learning_attitude','behavior','과제를 성실히 수행함'),
('keyword_seed','learning_attitude','behavior','학습 준비를 철저히 함'),
('keyword_seed','learning_attitude','growth','학습 태도가 점차 안정됨'),
('keyword_seed','learning_attitude','growth','집중력이 향상됨');

-- =========================
-- 학습 과정 (learning_process)
-- =========================
INSERT OR IGNORE INTO student_record_comments (category, subcategory, attribute, content)
VALUES
('keyword_seed','learning_process','process','탐구 과정을 충실히 수행함'),
('keyword_seed','learning_process','process','자료를 체계적으로 정리함'),
('keyword_seed','learning_process','process','문제를 단계적으로 해결함'),
('keyword_seed','learning_process','behavior','실습 및 활동에 적극 참여함'),
('keyword_seed','learning_process','behavior','조별 활동에 기여함'),
('keyword_seed','learning_process','growth','학습 과정에서의 이해가 깊어짐');

-- =========================
-- 학습 결과 (learning_result)
-- =========================
INSERT OR IGNORE INTO student_record_comments (category, subcategory, attribute, content)
VALUES
('keyword_seed','learning_result','result','학습 목표를 달성함'),
('keyword_seed','learning_result','result','과제 완성도가 높음'),
('keyword_seed','learning_result','result','학업 성취도가 향상됨'),
('keyword_seed','learning_result','growth','지속적인 성장을 보임'),
('keyword_seed','learning_result','growth','노력의 성과가 나타남');

-- =========================
-- 사고력 (thinking)
-- =========================
INSERT OR IGNORE INTO student_record_comments (category, subcategory, attribute, content)
VALUES
('keyword_seed','thinking','trait','비판적으로 사고함'),
('keyword_seed','thinking','trait','창의적인 관점을 지님'),
('keyword_seed','thinking','process','문제를 논리적으로 분석함'),
('keyword_seed','thinking','process','다양한 해결 방안을 탐색함'),
('keyword_seed','thinking','growth','사고의 유연성이 향상됨');

-- =========================
-- 의사소통 (communication)
-- =========================
INSERT OR IGNORE INTO student_record_comments (category, subcategory, attribute, content)
VALUES
('keyword_seed','communication','trait','의사 표현이 명확함'),
('keyword_seed','communication','behavior','자신의 생각을 논리적으로 설명함'),
('keyword_seed','communication','behavior','질문과 토론에 적극 참여함'),
('keyword_seed','communication','behavior','상대의 의견을 경청함'),
('keyword_seed','communication','growth','표현력이 향상됨');

-- =========================
-- 협력·관계 (collaboration)
-- =========================
INSERT OR IGNORE INTO student_record_comments (category, subcategory, attribute, content)
VALUES
('keyword_seed','collaboration','trait','협력적인 태도를 지님'),
('keyword_seed','collaboration','behavior','조원과 원활하게 협력함'),
('keyword_seed','collaboration','behavior','공동 목표 달성에 기여함'),
('keyword_seed','collaboration','behavior','갈등 상황을 원만히 조정함'),
('keyword_seed','collaboration','growth','대인 관계가 더욱 원활해짐');

-- =========================
-- 인성·생활 (character)
-- =========================
INSERT OR IGNORE INTO student_record_comments (category, subcategory, attribute, content)
VALUES
('keyword_seed','character','trait','책임감이 강함'),
('keyword_seed','character','trait','배려심이 돋보임'),
('keyword_seed','character','behavior','규칙을 성실히 준수함'),
('keyword_seed','character','behavior','학교 생활 태도가 모범적임'),
('keyword_seed','character','growth','생활 습관이 안정됨');

-- =========================
-- 진로 (career)
-- =========================
INSERT OR IGNORE INTO student_record_comments (category, subcategory, attribute, content)
VALUES
('keyword_seed','career','trait','진로에 대한 목표 의식이 분명함'),
('keyword_seed','career','process','자신의 적성을 탐색함'),
('keyword_seed','career','behavior','진로 관련 활동에 적극 참여함'),
('keyword_seed','career','growth','진로 계획이 구체화됨');

-- =========================
-- 문장 연결어 (expression_connector)
-- =========================
INSERT OR IGNORE INTO student_record_comments (category, subcategory, attribute, content)
VALUES
('keyword_seed','expression_connector','connector','함으로써'),
('keyword_seed','expression_connector','connector','과정에서'),
('keyword_seed','expression_connector','connector','이를 통해'),
('keyword_seed','expression_connector','connector','바탕으로'),
('keyword_seed','expression_connector','connector','해 나가며'),
('keyword_seed','expression_connector','connector','그 결과');

COMMIT;