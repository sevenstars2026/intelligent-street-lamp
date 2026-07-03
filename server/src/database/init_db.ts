/**
 * MySQL 数据库初始化脚本
 * 运行: npm run init-db
 */
import 'dotenv/config'
import mysql from 'mysql2/promise'

const DB_CONFIG = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4' as const
}

const DB_NAME = process.env.DB_NAME || 'smart_street_light'

async function initDB() {
    const conn = await mysql.createConnection(DB_CONFIG)
    console.log(`✅ 已连接到 MySQL 服务器 ${DB_CONFIG.host}:${DB_CONFIG.port}`)

    const [currentUserRows] = await conn.query('SELECT CURRENT_USER() as current_user')
    console.log(`✅ 当前连接用户: ${(currentUserRows as any[])[0]?.current_user || DB_CONFIG.user}`)

    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`)
    console.log(`✅ 数据库 ${DB_NAME} 已就绪`)

    await conn.query(`USE \`${DB_NAME}\``)

    const createTables = `
    CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`username\` VARCHAR(50) NOT NULL UNIQUE,
        \`password\` VARCHAR(100) NOT NULL,
        \`nickname\` VARCHAR(50) NOT NULL,
        \`role\` VARCHAR(20) NOT NULL,
        \`avatar\` VARCHAR(10) DEFAULT '',
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS \`devices\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`device_id\` VARCHAR(50) NOT NULL UNIQUE,
        \`device_name\` VARCHAR(100) NOT NULL,
        \`location\` VARCHAR(200) DEFAULT '',
        \`online\` TINYINT DEFAULT 0,
        \`last_heartbeat\` DATETIME,
        \`bind_time\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`light_status\` VARCHAR(10) DEFAULT 'off',
        \`mode\` VARCHAR(20) DEFAULT 'auto',
        \`threshold_on\` INT DEFAULT 100,
        \`threshold_off\` INT DEFAULT 800,
        \`current_state\` VARCHAR(10) DEFAULT 'off'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS \`light_records\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`device_id\` VARCHAR(50) NOT NULL,
        \`light_value\` DECIMAL(10,1) NOT NULL,
        \`record_time\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_record_time (\`record_time\`),
        INDEX idx_device_time (\`device_id\`, \`record_time\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS \`alerts\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`device_id\` VARCHAR(50) NOT NULL,
        \`device_name\` VARCHAR(100) NOT NULL,
        \`alert_type\` VARCHAR(50) NOT NULL,
        \`alert_content\` TEXT,
        \`status\` TINYINT DEFAULT 0,
        \`alert_level\` VARCHAR(20) DEFAULT 'low',
        \`create_time\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`handle_time\` DATETIME,
        \`handler_id\` INT DEFAULT NULL,
        \`handler_name\` VARCHAR(50) DEFAULT NULL,
        INDEX idx_status (\`status\`),
        INDEX idx_create_time (\`create_time\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS \`system_config\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`config_key\` VARCHAR(50) NOT NULL UNIQUE,
        \`config_value\` VARCHAR(200) NOT NULL,
        \`description\` VARCHAR(200) DEFAULT '',
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS \`control_logs\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`device_id\` VARCHAR(50) NOT NULL,
        \`device_name\` VARCHAR(100) NOT NULL,
        \`action\` VARCHAR(10) NOT NULL,
        \`mode\` VARCHAR(10) NOT NULL,
        \`operator\` VARCHAR(50) DEFAULT '',
        \`result\` VARCHAR(20) DEFAULT 'success',
        \`create_time\` DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`

    const tableStatements = createTables.split(';').filter(s => s.trim())
    for (const stmt of tableStatements) {
        try { await conn.query(stmt + ';') } catch (_) {}
    }
    console.log('✅ 所有表已创建')

    const [rows] = await conn.query('SELECT COUNT(*) as count FROM users')
    if ((rows as any)[0].count === 0) {
        console.log('📦 导入初始数据...')

        await conn.query(`INSERT IGNORE INTO users (username, password, nickname, role, avatar) VALUES
            ('admin', '123456', '张工', 'municipal', '张'),
            ('manager', '123456', '李管理', 'admin', '李')`)

        await conn.query(`INSERT IGNORE INTO devices (device_id, device_name, location, online, last_heartbeat, bind_time, mode, threshold_on, threshold_off, current_state) VALUES
            ('light-001', '1号路灯', '滨江路A段', 1, NOW(), '2026-06-01 09:00:00', 'auto', 100, 800, 'off'),
            ('light-002', '2号路灯', '滨江路B段', 1, NOW(), '2026-06-01 09:10:00', 'auto', 100, 800, 'off'),
            ('light-003', '3号路灯', '中山路C段', 0, '2026-06-30 13:05:42', '2026-06-03 10:30:00', 'manual', 100, 800, 'off'),
            ('light-004', '4号路灯', '中山路D段', 1, NOW(), '2026-06-05 14:00:00', 'auto', 100, 800, 'off'),
            ('light-005', '5号路灯', '人民路E段', 1, NOW(), '2026-06-10 08:45:00', 'auto', 100, 800, 'off')`)

        for (let i = 6; i >= 0; i--) {
            const val = Math.floor(Math.random() * 400 + 200)
            await conn.query(
                'INSERT INTO light_records (device_id, light_value, record_time) VALUES (?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))',
                ['light-001', val, i]
            )
        }

        await conn.query(`INSERT IGNORE INTO alerts (device_id, device_name, alert_type, alert_content, status, alert_level, create_time, handle_time) VALUES
            ('light-003', '3号路灯', '设备离线', '设备心跳中断超过5分钟，判断为离线', 0, 'low', '2026-06-30 13:05:42', NULL),
            ('light-001', '1号路灯', '设备离线', '设备心跳中断超过5分钟，判断为离线', 1, 'low', '2026-06-28 08:12:10', '2026-06-28 09:30:00'),
            ('light-002', '2号路灯', '设备离线', '设备心跳中断超过5分钟，判断为离线', 1, 'low', '2026-06-25 22:05:33', '2026-06-26 07:45:00'),
            ('light-004', '4号路灯', '设备离线', '设备心跳中断超过5分钟，判断为离线', 0, 'low', '2026-06-20 15:30:00', NULL),
            ('light-005', '5号路灯', '数据异常', '光照数据持续为0，疑似传感器故障', 1, 'low', '2026-06-18 11:20:00', '2026-06-18 14:00:00')`)

        await conn.query(`INSERT IGNORE INTO system_config (config_key, config_value, description) VALUES
            ('threshold_low', '100', '光照下限阈值(lux)'),
            ('threshold_high', '800', '光照上限阈值(lux)'),
            ('control_mode', 'auto', '当前控制模式')`)

        console.log('✅ 初始数据导入完成')
    } else {
        console.log('📌 数据库已有数据，跳过导入')
    }

    await conn.end()
    console.log('🎉 数据库初始化完成!')
}

initDB().catch(err => {
    console.error('❌ 数据库初始化失败:', err.message)
    process.exit(1)
})
