import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection('mysql://root:@127.0.0.1:3306/modern_cms');
  try {
    const [rows] = await connection.query('SELECT * FROM plugins');
    console.log('--- PLUGINS STATUS ---');
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

main();
