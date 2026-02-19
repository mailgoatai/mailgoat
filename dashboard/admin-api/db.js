const mysql = require('mysql2/promise');

const DEFAULT_DB_URL =
  'mysql://postal:PASSWORD@91.98.35.3:3306/postal-server-4';

let pool;

function createPool() {
  if (pool) {
    return pool;
  }

  const dbUrl = process.env.POSTAL_DB_URL || DEFAULT_DB_URL;
  const parsed = new URL(dbUrl);

  pool = mysql.createPool({
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
    waitForConnections: true,
    connectionLimit: Number(process.env.POSTAL_DB_POOL_SIZE || 10),
    queueLimit: 0,
    timezone: 'Z',
    charset: 'utf8mb4',
  });

  return pool;
}

async function query(sql, params = []) {
  const activePool = createPool();
  const [rows] = await activePool.query(sql, params);
  return rows;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  createPool,
  query,
  closePool,
};
