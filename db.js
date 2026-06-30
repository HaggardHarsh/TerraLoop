const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'terraloop.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_data TEXT
  );

  CREATE TABLE IF NOT EXISTS garage_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT 1,
    icon TEXT,
    name TEXT,
    material TEXT,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS impact_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT 1,
    action_type TEXT,
    points INTEGER,
    kg_diverted REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Helper to calculate time ago
function timeAgo(dateString) {
  const date = new Date(dateString + 'Z'); // UTC
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hrs ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

module.exports = { db, timeAgo };
