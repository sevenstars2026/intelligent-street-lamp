import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import mqtt from 'mqtt'
import mysql from 'mysql2/promise'
import { initPool, getPool, DB_CONFIG, isSQLite } from './services/db.js'
import { alarmEngine, automationEngine, startScheduler, stopScheduler } from './services/scheduler.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json())

// 生产环境：托管前端静态文件
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist')
app.use(express.static(frontendDist))

// 请求日志
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
    next()
})

// MQTT 客户端（可选，如果连接失败不影响主服务）
let mqttClient: mqtt.MqttClient | null = null
function initMqtt(): void {
    try {
        mqttClient = mqtt.connect(process.env.MQTT_BROKER || 'mqtt://localhost:1883')
        mqttClient.on('connect', () => console.log('✅ MQTT 已连接'))
        mqttClient.on('error', (err) => console.error('[MQTT] 连接错误:', err.message))
    } catch (err) {
        console.error('[MQTT] 初始化失败:', err)
    }
}

// ============================================
// 数据库初始化
// ============================================
async function initDB() {
    if (!isSQLite()) {
        const tmpConn = await mysql.createConnection({
            host: DB_CONFIG.host,
            port: DB_CONFIG.port,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
            charset: 'utf8mb4'
        })
        await tmpConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`)
        await tmpConn.end()
    }

    await initPool()
    const pool = getPool()

    const createSQL = `
    CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY, \`username\` VARCHAR(50) NOT NULL UNIQUE,
        \`password\` VARCHAR(100) NOT NULL, \`nickname\` VARCHAR(50) NOT NULL,
        \`role\` VARCHAR(20) NOT NULL, \`avatar\` VARCHAR(10) DEFAULT '',
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    CREATE TABLE IF NOT EXISTS \`devices\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY, \`device_id\` VARCHAR(50) NOT NULL UNIQUE,
        \`device_name\` VARCHAR(100) NOT NULL, \`location\` VARCHAR(200) DEFAULT '',
        \`online\` TINYINT DEFAULT 0, \`last_heartbeat\` DATETIME,
        \`bind_time\` DATETIME DEFAULT CURRENT_TIMESTAMP, \`light_status\` VARCHAR(10) DEFAULT 'off',
        \`mode\` VARCHAR(20) DEFAULT 'auto', \`threshold_on\` INT DEFAULT 100,
        \`threshold_off\` INT DEFAULT 800, \`current_state\` VARCHAR(10) DEFAULT 'off'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    CREATE TABLE IF NOT EXISTS \`light_records\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY, \`device_id\` VARCHAR(50) NOT NULL,
        \`light_value\` DECIMAL(10,1) NOT NULL, \`record_time\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_record_time (\`record_time\`), INDEX idx_device_time (\`device_id\`, \`record_time\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    CREATE TABLE IF NOT EXISTS \`alerts\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY, \`device_id\` VARCHAR(50) NOT NULL,
        \`device_name\` VARCHAR(100) NOT NULL, \`alert_type\` VARCHAR(50) NOT NULL,
        \`alert_content\` TEXT, \`status\` TINYINT DEFAULT 0,
        \`alert_level\` VARCHAR(20) DEFAULT 'low',
        \`create_time\` DATETIME DEFAULT CURRENT_TIMESTAMP, \`handle_time\` DATETIME,
        \`handler_id\` INT DEFAULT NULL, \`handler_name\` VARCHAR(50) DEFAULT NULL,
        INDEX idx_status (\`status\`), INDEX idx_create_time (\`create_time\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    CREATE TABLE IF NOT EXISTS \`system_config\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY, \`config_key\` VARCHAR(50) NOT NULL UNIQUE,
        \`config_value\` VARCHAR(200) NOT NULL, \`description\` VARCHAR(200) DEFAULT '',
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    CREATE TABLE IF NOT EXISTS \`control_logs\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY, \`device_id\` VARCHAR(50) NOT NULL,
        \`device_name\` VARCHAR(100) NOT NULL, \`action\` VARCHAR(10) NOT NULL,
        \`mode\` VARCHAR(10) NOT NULL, \`operator\` VARCHAR(50) DEFAULT '',
        \`result\` VARCHAR(20) DEFAULT 'success', \`create_time\` DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`

    const stmts = createSQL.split(';').filter(s => s.trim())
    for (const stmt of stmts) {
        try { await pool.execute(stmt + ';') } catch (_) {}
    }

    // 检查是否需要导入初始数据
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM users')
    if ((rows as any)[0].count === 0) {
        console.log('📦 导入初始数据...')
        await pool.execute(`INSERT IGNORE INTO users (username, password, nickname, role, avatar) VALUES
            ('admin', '123456', '张工', 'municipal', '张'),
            ('manager', '123456', '李管理', 'admin', '李')`)
        await pool.execute(`INSERT IGNORE INTO devices (device_id, device_name, location, online, last_heartbeat, bind_time, mode, threshold_on, threshold_off, current_state) VALUES
            ('light-001', '1号路灯', '滨江路A段', 1, NOW(), '2026-06-01 09:00:00', 'auto', 100, 800, 'off'),
            ('light-002', '2号路灯', '滨江路B段', 1, NOW(), '2026-06-01 09:10:00', 'auto', 100, 800, 'off'),
            ('light-003', '3号路灯', '中山路C段', 0, '2026-06-30 13:05:42', '2026-06-03 10:30:00', 'manual', 100, 800, 'off'),
            ('light-004', '4号路灯', '中山路D段', 1, NOW(), '2026-06-05 14:00:00', 'auto', 100, 800, 'off'),
            ('light-005', '5号路灯', '人民路E段', 1, NOW(), '2026-06-10 08:45:00', 'auto', 100, 800, 'off')`)
        for (let i = 6; i >= 0; i--) {
            const v = Math.floor(Math.random() * 400 + 200)
            await pool.execute('INSERT INTO light_records (device_id, light_value, record_time) VALUES (?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))', ['light-001', v, i])
        }
        await pool.execute(`INSERT IGNORE INTO alerts (device_id, device_name, alert_type, alert_content, status, alert_level, create_time, handle_time) VALUES
            ('light-003', '3号路灯', '设备离线', '设备心跳中断超过5分钟，判断为离线', 0, 'low', '2026-06-30 13:05:42', NULL),
            ('light-001', '1号路灯', '设备离线', '设备心跳中断超过5分钟，判断为离线', 1, 'low', '2026-06-28 08:12:10', '2026-06-28 09:30:00'),
            ('light-002', '2号路灯', '设备离线', '设备心跳中断超过5分钟，判断为离线', 1, 'low', '2026-06-25 22:05:33', '2026-06-26 07:45:00'),
            ('light-004', '4号路灯', '设备离线', '设备心跳中断超过5分钟，判断为离线', 0, 'low', '2026-06-20 15:30:00', NULL),
            ('light-005', '5号路灯', '数据异常', '光照数据持续为0，疑似传感器故障', 1, 'low', '2026-06-18 11:20:00', '2026-06-18 14:00:00')`)
        await pool.execute(`INSERT IGNORE INTO system_config (config_key, config_value, description) VALUES
            ('threshold_low', '100', '光照下限阈值(lux)'), ('threshold_high', '800', '光照上限阈值(lux)'), ('control_mode', 'auto', '当前控制模式')`)
        console.log('✅ 初始数据导入完成')
    }
    console.log(`✅ ${isSQLite() ? 'SQLite' : 'MySQL'} 数据库就绪`)
}

// ============================================
// API 路由
// ============================================

// ---- 用户登录 ----
app.post('/api/login', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body
        const pool = getPool()
        const [users] = await pool.query(
            'SELECT * FROM users WHERE username = ? AND password = ?',
            [username, password]
        )
        if ((users as any[]).length > 0) {
            const user = (users as any[])[0]
            delete user.password
            const [devStats] = await pool.query(
                'SELECT COUNT(*) as total, SUM(CASE WHEN online=1 THEN 1 ELSE 0 END) as onlineCount FROM devices'
            )
            user.onlineDevices = (devStats as any[])[0].onlineCount || 0
            res.json({ code: 200, data: user, message: '登录成功' })
        } else {
            res.json({ code: 401, message: '账号或密码错误' })
        }
    } catch (e: any) {
        res.json({ code: 500, message: '服务器错误: ' + e.message })
    }
})

// ---- 获取设备列表 ----
app.get('/api/devices', async (_req: Request, res: Response) => {
    try {
        const pool = getPool()
        const [rows] = await pool.query('SELECT * FROM devices ORDER BY id')
        ;(rows as any[]).forEach((d: any) => { d.online = Boolean(d.online) })
        res.json({ code: 200, data: rows })
    } catch (e: any) {
        res.json({ code: 500, message: e.message })
    }
})

// ---- 添加设备 ----
app.post('/api/devices', async (req: Request, res: Response) => {
    try {
        const { deviceId, deviceName, location } = req.body
        if (!deviceId || !deviceName) {
            return res.json({ code: 400, message: '请填写完整信息' })
        }
        const pool = getPool()
        await pool.query(
            'INSERT INTO devices (device_id, device_name, location, online, bind_time) VALUES (?, ?, ?, 1, NOW())',
            [deviceId, deviceName, location || '']
        )
        res.json({ code: 200, message: '添加成功' })
    } catch (e: any) {
        res.json({ code: 500, message: e.code === 'ER_DUP_ENTRY' ? '设备ID已存在' : e.message })
    }
})

// ---- 解绑设备 ----
app.delete('/api/devices/:deviceId', async (req: Request, res: Response) => {
    try {
        const pool = getPool()
        await pool.query('DELETE FROM devices WHERE device_id = ?', [req.params.deviceId])
        res.json({ code: 200, message: '解绑成功' })
    } catch (e: any) {
        res.json({ code: 500, message: e.message })
    }
})

// ---- 获取当前光照值 ----
app.get('/api/light/current', async (_req: Request, res: Response) => {
    try {
        const pool = getPool()
        const [rows] = await pool.query('SELECT light_value FROM light_records ORDER BY record_time DESC LIMIT 1')
        res.json({
            code: 200,
            data: { value: (rows as any[]).length > 0 ? (rows as any[])[0].light_value : Math.floor(Math.random() * 400 + 200) }
        })
    } catch (e: any) {
        res.json({ code: 500, message: e.message })
    }
})

// ---- 获取7天光照趋势 ----
app.get('/api/light/history', async (_req: Request, res: Response) => {
    try {
        const pool = getPool()
        const [rows] = await pool.query(`
            SELECT DATE(record_time) as date, AVG(light_value) as avg_value
            FROM light_records
            WHERE record_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(record_time)
            ORDER BY date ASC
        `)
        const result = []
        for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().slice(0, 10)
            const found = (rows as any[]).find((r: any) => String(r.date || '').slice(0, 10) === dateStr)
            result.push({
                date: `${d.getMonth() + 1}/${d.getDate()}`,
                value: found ? parseFloat(parseFloat(found.avg_value).toFixed(1)) : Math.floor(Math.random() * 400 + 200)
            })
        }
        res.json({ code: 200, data: result })
    } catch (e: any) {
        res.json({ code: 500, message: e.message })
    }
})

// ---- 记录光照数据（传感器上报） ----
app.post('/api/light/record', async (req: Request, res: Response) => {
    try {
        const { deviceId, value } = req.body
        const pool = getPool()
        await pool.query(
            'INSERT INTO light_records (device_id, light_value) VALUES (?, ?)',
            [deviceId || 'light-001', Number(value)]
        )

        // 自动模式：光照阈值联动
        const [devRows] = await pool.query(
            'SELECT mode, threshold_on, threshold_off, current_state, device_name FROM devices WHERE device_id = ?',
            [deviceId || 'light-001']
        )
        const device = (devRows as any[])[0]
        if (device && device.mode === 'auto') {
            automationEngine.addSample(deviceId || 'light-001', Number(value))
            const action = automationEngine.shouldAutoControl(deviceId || 'light-001', device.threshold_on, device.threshold_off)
            if (action && action !== device.current_state) {
                await pool.query('UPDATE devices SET current_state = ?, light_status = ? WHERE device_id = ?', [action, action, deviceId || 'light-001'])
                await pool.query(
                    'INSERT INTO control_logs (device_id, device_name, action, mode, operator, result) VALUES (?, ?, ?, ?, ?, ?)',
                    [deviceId || 'light-001', device.device_name, action, 'auto', 'system', 'success']
                )
                if (mqttClient && mqttClient.connected) {
                    mqttClient.publish(`devices/${deviceId || 'light-001'}/control`, JSON.stringify({ cmd: 'switch', value: action }))
                }
                console.log(`[Automation] 自动${action === 'on' ? '开灯' : '关灯'}: ${deviceId || 'light-001'}`)
            }
        }

        res.json({ code: 200, message: '记录成功' })
    } catch (e: any) {
        res.json({ code: 500, message: e.message })
    }
})

// ---- 获取告警列表（分页） ----
app.get('/api/alerts', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1
        const pageSize = parseInt(req.query.pageSize as string) || 10
        const pool = getPool()
        const [countRows] = await pool.query('SELECT COUNT(*) as total FROM alerts')
        const total = (countRows as any[])[0].total
        const [rows] = await pool.query(
            'SELECT * FROM alerts ORDER BY create_time DESC LIMIT ? OFFSET ?',
            [pageSize, (page - 1) * pageSize]
        )
        ;(rows as any[]).forEach((a: any) => {
            a.createTime = a.create_time
            a.handleTime = a.handle_time
        })
        res.json({ code: 200, data: { list: rows, total, page, pageSize } })
    } catch (e: any) {
        res.json({ code: 500, message: e.message })
    }
})

// ---- 处理告警 ----
app.put('/api/alerts/:id/handle', async (req: Request, res: Response) => {
    try {
        const pool = getPool()
        await pool.query(
            'UPDATE alerts SET status=1, handle_time=NOW() WHERE id=?',
            [req.params.id]
        )
        res.json({ code: 200, message: '已标记处理' })
    } catch (e: any) {
        res.json({ code: 500, message: e.message })
    }
})

// ---- 获取系统配置 ----
app.get('/api/config', async (_req: Request, res: Response) => {
    try {
        const pool = getPool()
        const [rows] = await pool.query('SELECT * FROM system_config')
        const config: any = {}
        ;(rows as any[]).forEach((r: any) => { config[r.config_key] = r.config_value })
        res.json({ code: 200, data: config })
    } catch (e: any) {
        res.json({ code: 500, message: e.message })
    }
})

// ---- 更新系统配置 ----
app.put('/api/config', async (req: Request, res: Response) => {
    try {
        const { threshold_low, threshold_high, control_mode } = req.body
        const pool = getPool()
        if (threshold_low !== undefined) {
            await pool.query("UPDATE system_config SET config_value=? WHERE config_key='threshold_low'", [String(threshold_low)])
        }
        if (threshold_high !== undefined) {
            await pool.query("UPDATE system_config SET config_value=? WHERE config_key='threshold_high'", [String(threshold_high)])
        }
        if (control_mode !== undefined) {
            await pool.query("UPDATE system_config SET config_value=? WHERE config_key='control_mode'", [String(control_mode)])
        }
        res.json({ code: 200, message: '配置已更新' })
    } catch (e: any) {
        res.json({ code: 500, message: e.message })
    }
})

// ---- 设备控制（开关灯） ----
app.post('/api/control/:deviceId/:action', async (req: Request, res: Response) => {
    try {
        const { deviceId, action } = req.params
        const pool = getPool()
        const [modeRows] = await pool.query("SELECT config_value FROM system_config WHERE config_key='control_mode'")
        const mode = (modeRows as any[]).length > 0 ? (modeRows as any[])[0].config_value : 'manual'

        await pool.query('UPDATE devices SET light_status=?, current_state=? WHERE device_id=?', [action, action, deviceId])
        const [devRows] = await pool.query('SELECT device_name FROM devices WHERE device_id=?', [deviceId])
        const deviceName = (devRows as any[]).length > 0 ? (devRows as any[])[0].device_name : ''

        await pool.query(
            'INSERT INTO control_logs (device_id, device_name, action, mode, operator) VALUES (?, ?, ?, ?, ?)',
            [deviceId, deviceName, action, mode, 'system']
        )

        if (mqttClient && mqttClient.connected) {
            mqttClient.publish(`devices/${deviceId}/control`, JSON.stringify({ cmd: 'switch', value: action }))
        }

        res.json({
            code: 200,
            message: `${action === 'on' ? '开灯' : '关灯'}指令已下发`,
            data: { deviceId, action, mode }
        })
    } catch (e: any) {
        res.json({ code: 500, message: e.message })
    }
})

// ---- 获取统计概览 ----
app.get('/api/dashboard/stats', async (_req: Request, res: Response) => {
    try {
        const pool = getPool()
        const [devStats] = await pool.query('SELECT COUNT(*) as total, SUM(CASE WHEN online=1 THEN 1 ELSE 0 END) as onlineCount FROM devices')
        const [alertCount] = await pool.query('SELECT COUNT(*) as count FROM alerts WHERE status=0')
        const [lightRow] = await pool.query('SELECT light_value FROM light_records ORDER BY record_time DESC LIMIT 1')
        const [threshRow] = await pool.query("SELECT config_value FROM system_config WHERE config_key='threshold_low'")
        res.json({
            code: 200,
            data: {
                onlineDevices: (devStats as any[])[0].onlineCount || 0,
                totalDevices: (devStats as any[])[0].total || 0,
                pendingAlerts: (alertCount as any[])[0].count || 0,
                currentLight: (lightRow as any[]).length > 0 ? (lightRow as any[])[0].light_value : 320,
                thresholdLow: (threshRow as any[]).length > 0 ? parseInt((threshRow as any[])[0].config_value) : 100,
                thresholdHigh: 800
            }
        })
    } catch (e: any) {
        res.json({ code: 500, message: e.message })
    }
})

// ============================================
// 任务3新增接口
// ============================================

// ---- 批量控制 ----
app.post('/api/devices/batch-control', async (req: Request, res: Response) => {
    try {
        const { deviceIds, command } = req.body
        const pool = getPool()
        const [modeRows] = await pool.query("SELECT config_value FROM system_config WHERE config_key='control_mode'")
        const mode = (modeRows as any[]).length > 0 ? (modeRows as any[])[0].config_value : 'manual'

        const results = []
        for (const deviceId of deviceIds) {
            await pool.query('UPDATE devices SET light_status=?, current_state=? WHERE device_id=?', [command, command, deviceId])
            const [devRows] = await pool.query('SELECT device_name FROM devices WHERE device_id=?', [deviceId])
            const deviceName = (devRows as any[])[0]?.device_name || ''
            await pool.query(
                'INSERT INTO control_logs (device_id, device_name, action, mode, operator) VALUES (?, ?, ?, ?, ?)',
                [deviceId, deviceName, command, mode, 'system']
            )
            if (mqttClient && mqttClient.connected) {
                mqttClient.publish(`devices/${deviceId}/control`, JSON.stringify({ cmd: 'switch', value: command }))
            }
            results.push({ deviceId, status: 'success', message: `${command === 'on' ? '开灯' : '关灯'}成功` })
        }

        res.json({
            code: 200,
            message: '批量控制完成',
            data: { results, summary: { total: results.length, success: results.length, failed: 0 } }
        })
    } catch (e: any) {
        res.json({ code: 500, message: e.message })
    }
})

// ---- 获取设备阈值 ----
app.get('/api/devices/:deviceId/threshold', async (req: Request, res: Response) => {
    try {
        const pool = getPool()
        const [rows] = await pool.query('SELECT threshold_on, threshold_off FROM devices WHERE device_id = ?', [req.params.deviceId])
        if ((rows as any[]).length === 0) return res.json({ code: 404, message: '设备不存在' })
        const d = (rows as any[])[0]
        res.json({
            code: 200,
            data: { deviceId: req.params.deviceId, lightThresholdOn: d.threshold_on, lightThresholdOff: d.threshold_off }
        })
    } catch (e: any) {
        res.json({ code: 500, message: e.message })
    }
})

// ---- 设置设备阈值 ----
app.post('/api/devices/:deviceId/threshold', async (req: Request, res: Response) => {
    try {
        const { lightThresholdOn, lightThresholdOff } = req.body
        if (lightThresholdOn >= lightThresholdOff) {
            return res.json({ code: 400, message: '开灯阈值必须小于关灯阈值' })
        }
        const pool = getPool()
        await pool.query(
            'UPDATE devices SET threshold_on = ?, threshold_off = ? WHERE device_id = ?',
            [lightThresholdOn, lightThresholdOff, req.params.deviceId]
        )
        res.json({ code: 200, message: '阈值设置成功' })
    } catch (e: any) {
        res.json({ code: 500, message: e.message })
    }
})

// ---- 获取设备模式 ----
app.get('/api/devices/:deviceId/mode', async (req: Request, res: Response) => {
    try {
        const pool = getPool()
        const [rows] = await pool.query('SELECT mode FROM devices WHERE device_id = ?', [req.params.deviceId])
        if ((rows as any[]).length === 0) return res.json({ code: 404, message: '设备不存在' })
        res.json({ code: 200, data: { deviceId: req.params.deviceId, mode: (rows as any[])[0].mode } })
    } catch (e: any) {
        res.json({ code: 500, message: e.message })
    }
})

// ---- 设置设备模式 ----
app.put('/api/devices/:deviceId/mode', async (req: Request, res: Response) => {
    try {
        const { mode } = req.body
        const pool = getPool()
        await pool.query('UPDATE devices SET mode = ? WHERE device_id = ?', [mode, req.params.deviceId])
        res.json({ code: 200, message: '模式切换成功' })
    } catch (e: any) {
        res.json({ code: 500, message: e.message })
    }
})

// ---- 获取设备控制日志 ----
app.get('/api/devices/:deviceId/control-logs', async (req: Request, res: Response) => {
    try {
        const pool = getPool()
        const page = parseInt(req.query.page as string) || 1
        const pageSize = parseInt(req.query.pageSize as string) || 20
        const [countRows] = await pool.query('SELECT COUNT(*) as total FROM control_logs WHERE device_id = ?', [req.params.deviceId])
        const [rows] = await pool.query(
            'SELECT * FROM control_logs WHERE device_id = ? ORDER BY create_time DESC LIMIT ? OFFSET ?',
            [req.params.deviceId, pageSize, (page - 1) * pageSize]
        )
        res.json({ code: 200, data: { list: rows, total: (countRows as any[])[0].total, page, pageSize } })
    } catch (e: any) {
        res.json({ code: 500, message: e.message })
    }
})

// ---- 获取设备历史光照数据 ----
app.get('/api/devices/:deviceId/light-history', async (req: Request, res: Response) => {
    try {
        const pool = getPool()
        const range = (req.query.range as string) || '7d'
        let days = 7
        if (range === '24h') days = 1
        if (range === '30d') days = 30

        const [rows] = await pool.query(
            `SELECT DATE(record_time) as date, AVG(light_value) as avg_value, MAX(light_value) as max_value, MIN(light_value) as min_value, COUNT(*) as count
             FROM light_records
             WHERE device_id = ? AND record_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY DATE(record_time)
             ORDER BY date ASC`,
            [req.params.deviceId, days]
        )

        const records = (rows as any[]).map((r: any) => ({
            date: String(r.date).slice(0, 10),
            value: parseFloat(parseFloat(r.avg_value).toFixed(1)),
            max: parseFloat(parseFloat(r.max_value).toFixed(1)),
            min: parseFloat(parseFloat(r.min_value).toFixed(1)),
            count: r.count
        }))

        res.json({ code: 200, data: records })
    } catch (e: any) {
        res.json({ code: 500, message: e.message })
    }
})

// ---- 获取设备运行统计 ----
app.get('/api/devices/:deviceId/statistics', async (req: Request, res: Response) => {
    try {
        const pool = getPool()
        const range = (req.query.range as string) || '7d'
        let days = 7
        if (range === '30d') days = 30

        const [rows] = await pool.query(
            `SELECT AVG(light_value) as avg, MAX(light_value) as max, MIN(light_value) as min, COUNT(*) as total
             FROM light_records
             WHERE device_id = ? AND record_time >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [req.params.deviceId, days]
        )
        const d = (rows as any[])[0] || {}

        // 统计该设备在区间内的自动控制/手动控制次数
        const [logRows] = await pool.query(
            `SELECT mode, COUNT(*) as cnt FROM control_logs
             WHERE device_id = ? AND create_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY mode`,
            [req.params.deviceId, days]
        )
        const modeMap: Record<string, number> = {}
        ;(logRows as any[]).forEach((r: any) => { modeMap[r.mode] = r.cnt })

        // 在线率：按天粗算，在线天数 / 总天数
        const [onlineRows] = await pool.query(
            `SELECT COUNT(DISTINCT DATE(record_time)) as onlineDays
             FROM light_records
             WHERE device_id = ? AND record_time >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [req.params.deviceId, days]
        )
        const onlineDays = (onlineRows as any[])[0]?.onlineDays || 0
        const onlineRate = days > 0 ? Math.round((onlineDays / days) * 100) : 0

        res.json({
            code: 200,
            data: {
                deviceId: req.params.deviceId,
                range,
                dataPoints: d.total || 0,
                avgLight: parseFloat(d.avg) || 0,
                maxLight: d.max !== null ? parseFloat(d.max) : null,
                minLight: d.min !== null ? parseFloat(d.min) : null,
                onlineRate,
                autoControlCount: modeMap['auto'] || 0,
                manualControlCount: modeMap['manual'] || 0
            }
        })
    } catch (e: any) {
        res.json({ code: 500, message: e.message })
    }
})

// ---- 获取所有设备统计概览 ----
app.get('/api/statistics/overview', async (_req: Request, res: Response) => {
    try {
        const pool = getPool()
        const [[devStats], [alertStats], [lightStats]] = await Promise.all([
            pool.query('SELECT COUNT(*) as total, SUM(CASE WHEN online=1 THEN 1 ELSE 0 END) as onlineCount FROM devices'),
            pool.query('SELECT COUNT(*) as active FROM alerts WHERE status=0'),
            pool.query('SELECT AVG(light_value) as avg FROM light_records')
        ])
        const totalDevices = (devStats as any[])[0]?.total || 0
        const onlineDevices = (devStats as any[])[0]?.onlineCount || 0
        const activeAlerts = (alertStats as any[])[0]?.active || 0
        const avgLight = parseFloat((lightStats as any[])[0]?.avg) || 0
        res.json({
            code: 200,
            data: { totalDevices, onlineDevices, activeAlerts, avgLight, offlineDevices: totalDevices - onlineDevices }
        })
    } catch (e: any) {
        res.json({ code: 500, message: e.message })
    }
})

// ---- 健康检查 ----
app.get('/api/health', async (_req: Request, res: Response) => {
    try {
        await getPool().query('SELECT 1')
        res.json({
            code: 200,
            message: 'healthy',
            data: {
                status: 'up',
                timestamp: new Date().toISOString(),
                services: { database: 'up', mqtt: mqttClient && mqttClient.connected ? 'up' : 'down' }
            }
        })
    } catch (e: any) {
        res.json({ code: 500, message: '数据库连接异常: ' + e.message })
    }
})

// ---- 心跳上报 ----
app.post('/api/devices/:deviceId/heartbeat', async (req: Request, res: Response) => {
    try {
        const pool = getPool()
        await pool.query('UPDATE devices SET online = 1, last_heartbeat = NOW() WHERE device_id = ?', [req.params.deviceId])
        await alarmEngine.recoverDeviceAlerts(req.params.deviceId)
        res.json({ code: 200, message: '心跳已更新' })
    } catch (e: any) {
        res.json({ code: 500, message: e.message })
    }
})

// ============================================
// SPA 回退：所有非 /api 请求返回前端页面
// ============================================
app.get('*', (req: Request, res: Response) => {
    if (req.path.startsWith('/api')) {
        res.status(404).json({ code: 404, message: '接口不存在', data: null })
    } else {
        res.sendFile(path.join(frontendDist, 'index.html'))
    }
})

// 错误处理
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err)
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null })
})

// ============================================
// 启动服务器
// ============================================
await initDB()
initMqtt()
startScheduler()

const PORT = parseInt(process.env.PORT || '3000', 10)
const HOST = '0.0.0.0'
app.listen(PORT, HOST, () => {
    console.log(`🚀 智慧路灯管理系统已启动`)
    console.log(`   API服务: http://${HOST}:${PORT}/api/*`)
    console.log(`   前端页面: http://${HOST}:${PORT}`)
})

process.on('SIGINT', () => {
    console.log('正在关闭服务...')
    stopScheduler()
    process.exit(0)
})

process.on('SIGTERM', () => {
    console.log('正在关闭服务...')
    stopScheduler()
    process.exit(0)
})
