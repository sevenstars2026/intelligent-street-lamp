import cron from 'node-cron'
import { getPool } from './db.js'

/**
 * 告警引擎：离线检测、告警升级、自动恢复
 */
export class AlarmEngine {
    private offlineThresholdSeconds = 300 // 5 分钟无心跳视为离线

    /**
     * 检查离线设备并生成告警
     */
    async checkOfflineDevices(): Promise<void> {
        const pool = getPool()
        const [rows] = await pool.query(
            `SELECT device_id, device_name, last_heartbeat, online
             FROM devices
             WHERE online = 1 OR last_heartbeat IS NOT NULL`
        )

        const devices = rows as Array<{
            device_id: string
            device_name: string
            last_heartbeat: Date | null
            online: number
        }>

        for (const device of devices) {
            const isOffline = this.isOffline(device.last_heartbeat)

            if (isOffline) {
                // 标记设备离线
                await pool.query(
                    'UPDATE devices SET online = 0 WHERE device_id = ?',
                    [device.device_id]
                )

                // 检查是否已有未处理离线告警
                const [existing] = await pool.query(
                    `SELECT id FROM alerts
                     WHERE device_id = ? AND alert_type = '设备离线' AND status = 0`,
                    [device.device_id]
                )

                if ((existing as any[]).length === 0) {
                    await pool.query(
                        `INSERT INTO alerts (device_id, device_name, alert_type, alert_content, status, alert_level, create_time)
                         VALUES (?, ?, '设备离线', '设备心跳中断超过5分钟，判断为离线', 0, 'low', NOW())`,
                        [device.device_id, device.device_name]
                    )
                    console.log(`[AlarmEngine] 设备 ${device.device_id} 离线告警已创建`)
                }
            }
        }
    }

    /**
     * 升级离线告警等级
     */
    async upgradeAlarms(): Promise<void> {
        const pool = getPool()
        const [rows] = await pool.query(
            `SELECT id, device_id, create_time, alert_level
             FROM alerts
             WHERE status = 0 AND alert_type = '设备离线'`
        )

        const alarms = rows as Array<{
            id: number
            device_id: string
            create_time: Date
            alert_level: string
        }>

        for (const alarm of alarms) {
            const durationMinutes = (Date.now() - new Date(alarm.create_time).getTime()) / 60000
            let newLevel = alarm.alert_level

            if (durationMinutes >= 60 && alarm.alert_level === 'low') {
                newLevel = 'medium'
            } else if (durationMinutes >= 360 && alarm.alert_level === 'medium') {
                newLevel = 'high'
            }

            if (newLevel !== alarm.alert_level) {
                await pool.query(
                    `UPDATE alerts SET alert_level = ?, alert_content = ? WHERE id = ?`,
                    [newLevel, `设备离线超过${durationMinutes >= 360 ? '6' : '1'}小时，等级升级为${newLevel}`, alarm.id]
                )
                console.log(`[AlarmEngine] 告警 ${alarm.id} 升级为 ${newLevel}`)
            }
        }
    }

    /**
     * 设备心跳恢复时自动关闭告警
     */
    async recoverDeviceAlerts(deviceId: string): Promise<void> {
        const pool = getPool()
        await pool.query(
            `UPDATE alerts SET status = 1, handle_time = NOW(), handler_id = 0, handler_name = 'system'
             WHERE device_id = ? AND status = 0 AND alert_type = '设备离线'`,
            [deviceId]
        )
    }

    private isOffline(lastHeartbeat: Date | null): boolean {
        if (!lastHeartbeat) return true
        return (Date.now() - new Date(lastHeartbeat).getTime()) / 1000 > this.offlineThresholdSeconds
    }
}

/**
 * 自动化规则引擎：根据光照阈值自动开关灯
 */
export class AutomationEngine {
    private samples = new Map<string, Array<{ value: number; time: number }>>()
    private cooldown = new Map<string, number>()
    private readonly maxSamples = 10
    private readonly cooldownSeconds = 300

    addSample(deviceId: string, value: number): void {
        const now = Date.now()
        const list = this.samples.get(deviceId) || []
        list.push({ value, time: now })
        if (list.length > this.maxSamples) list.shift()
        this.samples.set(deviceId, list)
    }

    shouldAutoControl(deviceId: string, thresholdOn: number, thresholdOff: number): 'on' | 'off' | null {
        const now = Date.now()
        if (this.cooldown.has(deviceId) && now - this.cooldown.get(deviceId)! < this.cooldownSeconds * 1000) {
            return null
        }

        const list = this.samples.get(deviceId)
        if (!list || list.length < 5) return null

        const avg = list.reduce((sum, s) => sum + s.value, 0) / list.length

        if (avg < thresholdOn) {
            this.cooldown.set(deviceId, now)
            return 'on'
        }
        if (avg > thresholdOff) {
            this.cooldown.set(deviceId, now)
            return 'off'
        }
        return null
    }

    setCooldown(deviceId: string): void {
        this.cooldown.set(deviceId, Date.now())
    }
}

export const alarmEngine = new AlarmEngine()
export const automationEngine = new AutomationEngine()

export function startScheduler(): void {
    // 每 60 秒检查离线设备
    cron.schedule('*/1 * * * *', async () => {
        try {
            await alarmEngine.checkOfflineDevices()
        } catch (err) {
            console.error('[Scheduler] 离线检测失败:', err)
        }
    })

    // 每 5 分钟升级告警
    cron.schedule('*/5 * * * *', async () => {
        try {
            await alarmEngine.upgradeAlarms()
        } catch (err) {
            console.error('[Scheduler] 告警升级失败:', err)
        }
    })

    console.log('✅ 定时任务已启动')
}

export function stopScheduler(): void {
    // node-cron 内部维护的任务列表，停止所有任务
    try {
        cron.getTasks().forEach((task) => task.stop())
    } catch (_) {
        // 兼容不同版本的 node-cron 类型定义
    }
}
