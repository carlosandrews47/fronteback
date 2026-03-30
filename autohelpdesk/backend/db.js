// db.js - Conexão com MySQL
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'autohelpdesk',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone: '-03:00',
  charset:  'utf8mb4',
});

// Testa conexão ao iniciar
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL conectado com sucesso!');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Erro ao conectar MySQL:', err.message);
    console.error('   Verifique suas configurações no arquivo .env');
  });

module.exports = pool;
