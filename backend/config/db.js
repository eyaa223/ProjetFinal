import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

async function testDB() {
  try {
    const conn = await db.getConnection();
    console.log('✅ MySQL CONNECTÉ VRAIMENT !');
    conn.release();
  } catch (err) {
    console.error('❌ MySQL ERREUR :', err.message);
  }
}

testDB();

export default db;