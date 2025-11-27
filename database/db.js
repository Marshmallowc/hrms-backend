import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize database
const db = new Database(join(__dirname, 'hrms.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
const initializeDatabase = () => {
  try {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    db.exec(schema);
    console.log('✓ Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Initialize on first run
initializeDatabase();

export default db;
