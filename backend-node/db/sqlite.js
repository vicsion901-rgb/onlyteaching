const path = require('path');
const sqlite3 = require('sqlite3');

// Single shared connection (sqlite3 is serialized by default)
const DB_PATH = path.resolve(__dirname, '..', 'db.sqlite');
const db = new sqlite3.Database(DB_PATH);

// Ensure FK constraints
db.exec('PRAGMA foreign_keys = ON;');

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



