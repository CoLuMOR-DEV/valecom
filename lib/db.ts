import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST ?? '127.0.0.1',
  user: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? '',
  database: process.env.MYSQL_DATABASE ?? 'valorant_shop',
  port: Number(process.env.MYSQL_PORT ?? 3306),
  connectionLimit: 8,
  queueLimit: 0,
  namedPlaceholders: true
});

export default pool;
