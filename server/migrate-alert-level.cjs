require('dotenv/config')
const mysql = require('mysql2/promise')

async function main() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4'
  }

  const dbName = process.env.DB_NAME || 'smart_street_light'
  const connection = await mysql.createConnection(config)

  try {
    const [rows] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'alerts' AND COLUMN_NAME = 'alert_level'`,
      [dbName]
    )

    if (rows.length > 0) {
      console.log('✅ alert_level 字段已存在，无需修改')
      return
    }

    await connection.query(`ALTER TABLE \`${dbName}\`.alerts ADD COLUMN alert_level VARCHAR(20) DEFAULT 'low' AFTER status`)
    console.log('✅ alert_level 字段已添加')
  } catch (err) {
    console.error('❌ 执行失败:', err.message)
    process.exit(1)
  } finally {
    await connection.end()
  }
}

main()
