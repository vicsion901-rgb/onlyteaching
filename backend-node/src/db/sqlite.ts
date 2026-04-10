// @ts-nocheck
// 로컬 개발용 SQLite — 프로덕션(Vercel)에서는 Postgres 사용, 이 파일은 로드되지 않음
const path = require('path');
let db;
try {
  const sqlite3 = require('sqlite3');
  const DB_PATH = path.resolve(__dirname, '..', '..', 'db.sqlite');
  db = new sqlite3.Database(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON;');
} catch {
  // sqlite3 미설치 (Vercel 프로덕션) — legacy-routes 미사용이므로 무시
  db = null;
}

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

const exec = (sql) =>
  new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

module.exports = { run, get, all, exec };













