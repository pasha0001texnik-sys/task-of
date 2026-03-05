import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve('database.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT,
    tags TEXT,
    folder TEXT DEFAULT '/',
    is_guide BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT,
    path TEXT,
    size INTEGER,
    type TEXT,
    parent_id TEXT,
    is_folder BOOLEAN DEFAULT 0,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    title TEXT,
    service TEXT,
    username TEXT,
    password TEXT,
    url TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    amount REAL,
    type TEXT CHECK(type IN ('income', 'expense')),
    category TEXT,
    model_name TEXT,
    description TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    role TEXT CHECK(role IN ('user', 'model')),
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    status TEXT CHECK(status IN ('todo', 'in_progress', 'done')),
    priority TEXT CHECK(priority IN ('low', 'medium', 'high')),
    start_date DATETIME,
    due_date DATETIME,
    assignee TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Add columns if they don't exist
try {
  const tableInfo = db.pragma('table_info(transactions)');
  const hasModelName = tableInfo.some((col: any) => col.name === 'model_name');
  if (!hasModelName) {
    db.exec('ALTER TABLE transactions ADD COLUMN model_name TEXT DEFAULT "General"');
  }
  
  const hasPlatform = tableInfo.some((col: any) => col.name === 'platform');
  if (!hasPlatform) {
    db.exec('ALTER TABLE transactions ADD COLUMN platform TEXT DEFAULT "Other"');
  }

  const tableInfoAccounts = db.pragma('table_info(accounts)');
  const hasTitle = tableInfoAccounts.some((col: any) => col.name === 'title');
  if (!hasTitle) {
    db.exec('ALTER TABLE accounts ADD COLUMN title TEXT');
  }

  const tableInfoFiles = db.pragma('table_info(files)');
  const hasContent = tableInfoFiles.some((col: any) => col.name === 'content');
  if (!hasContent) {
    db.exec('ALTER TABLE files ADD COLUMN content TEXT');
  }
} catch (error) {
  console.error('Migration error:', error);
}

export default db;
