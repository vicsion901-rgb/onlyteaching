// generateStudentRecord.ts

import Database from 'better-sqlite3';

const db = new Database('db.sqlite');

type Keyword = {
  subcategory: string;
  attribute: string;
  content: string;
};

// ------------------------------
// DB에서 키워드 불러오기
// ------------------------------
function getKeywords(
  subcategory: string,
  attribute?: string
): Keyword[] {
  if (attribute) {
    return db
      .prepare(
        `
        SELECT subcategory, attribute, content
        FROM student_record_comments
        WHERE subcategory = ? AND attribute = ?
      `
      )
      .all(subcategory, attribute) as Keyword[];
  }

  return db
    .prepare(
      `
      SELECT subcategory, attribute, content
      FROM student_record_comments
      WHERE subcategory = ?
    `
    )
    .all(subcategory) as Keyword[];
}

// ------------------------------
// 랜덤 유틸
// ------------------------------
function pickOne<T>(arr: T[]): T | null {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

// ------------------------------
// 문장 생성 메인 함수
// ------------------------------
export function generateStudentRecord(
  studentName: string,
  lineCount = 3
): string {
  const sentences: string[] = [];

  for (let i = 0; i < lineCount; i++) {
    const subject =
      i === 0 ? `${studentName}은 ` : pickOne(['또한 ', '아울러 ', '']) ?? '';

    const attitude = pickOne(
      getKeywords('learning_attitude', 'trait')
    )?.content;

    const behavior = pickOne(
      getKeywords('learning_process', 'behavior')
    )?.content;

    const process = pickOne(
      getKeywords('thinking', 'process')
    )?.content;

    const result = pickOne(
      getKeywords('learning_result', 'result')
    )?.content;

    // ---------- 조건부 연결어 ----------
    const connector =
      process && Math.random() > 0.4 ? ' 이를 통해 ' : ' ';

    // ---------- 문장 조립 ----------
    const sentenceParts = [
      subject,
      attitude,
      behavior,
      process ? connector + process : '',
      result ? ` ${result}` : '',
    ].filter(Boolean);

    const sentence = sentenceParts.join('').trim() + '.';

    sentences.push(sentence);
  }

  return sentences.join('\n');
}