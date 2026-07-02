-- ============================================
-- 智慧路灯管理系统 - 数据库初始化脚本
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    nickname TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('municipal', 'admin')),
    avatar TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 路灯设备表
CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL UNIQUE,
    device_name TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    online INTEGER DEFAULT 0,
    last_heartbeat DATETIME,
    bind_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    light_status TEXT DEFAULT 'off'  -- on/off
);

-- 光照数据记录表（用于趋势图）
CREATE TABLE IF NOT EXISTS light_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    light_value REAL NOT NULL,
    record_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(device_id)
);

-- 告警记录表
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    alert_type TEXT NOT NULL,       -- 设备离线 / 数据异常 等
    alert_content TEXT NOT NULL,
    status INTEGER DEFAULT 0,        -- 0:未处理 1:已处理
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    handle_time DATETIME,
    FOREIGN KEY (device_id) REFERENCES devices(device_id)
);

-- 系统配置表（阈值等参数）
CREATE TABLE IF NOT EXISTS system_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description TEXT DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 控制日志表（开关灯操作记录）
CREATE TABLE IF NOT EXISTS control_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    action TEXT NOT NULL,            -- on/off
    mode TEXT NOT NULL,              -- auto/manual
    operator TEXT DEFAULT '',
    result TEXT DEFAULT 'success',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- 初始化数据
-- ============================================

-- 插入管理员用户
INSERT OR IGNORE INTO users (username, password, nickname, role, avatar) VALUES
('admin', '123456', '张工', 'municipal', '张'),
('manager', '123456', '李管理', 'admin', '李');

-- 插入路灯设备
INSERT OR IGNORE INTO devices (device_id, device_name, location, online, last_heartbeat, bind_time) VALUES
('light-001', '1号路灯', '滨江路A段', 1, datetime('now'), '2026-06-01 09:00:00'),
('light-002', '2号路灯', '滨江路B段', 1, datetime('now'), '2026-06-01 09:10:00'),
('light-003', '3号路灯', '中山路C段', 0, '2026-06-30 13:05:42', '2026-06-03 10:30:00'),
('light-004', '4号路灯', '中山路D段', 1, datetime('now'), '2026-06-05 14:00:00'),
('light-005', '5号路灯', '人民路E段', 1, datetime('now'), '2026-06-10 08:45:00');

-- 插入7天光照历史数据（用于趋势图展示）
INSERT OR IGNORE INTO light_records (device_id, light_value, record_time) VALUES
-- 7天前的数据
('light-001', 285.0, datetime('now', '-6 days', 'localtime')),
('light-001', 320.5, datetime('now', '-6 days', '+8 hours')),
('light-001', 450.2, datetime('now', '-6 days', '+12 hours')),
('light-001', 380.0, datetime('now', '-6 days', '+16 hours')),
-- 5天前
('light-001', 310.0, datetime('now', '-5 days', 'localtime')),
('light-001', 395.8, datetime('now', '-5 days', '+8 hours')),
('light-001', 520.3, datetime('now', '-5 days', '+12 hours')),
('light-001', 410.0, datetime('now', '-5 days', '+16 hours')),
-- 4天前
('light-001', 270.5, datetime('now', '-4 days', 'localtime')),
('light-001', 350.2, datetime('now', '-4 days', '+8 hours')),
('light-001', 480.7, datetime('now', '-4 days', '+12 hours')),
('light-001', 365.0, datetime('now', '-4 days', '+16 hours')),
-- 3天前
('light-001', 295.0, datetime('now', '-3 days', 'localtime')),
('light-001', 380.5, datetime('now', '-3 days', '+8 hours')),
('light-001', 550.0, datetime('now', '-3 days', '+12 hours')),
('light-001', 420.3, datetime('now', '-3 days', '+16 hours')),
-- 2天前
('light-001', 260.8, datetime('now', '-2 days', 'localtime')),
('light-001', 340.0, datetime('now', '-2 days', '+8 hours')),
('light-001', 490.5, datetime('now', '-2 days', '+12 hours')),
('light-001', 355.0, datetime('now', '-2 days', '+16 hours')),
-- 昨天
('light-001', 305.2, datetime('now', '-1 day', 'localtime')),
('light-001', 400.8, datetime('now', '-1 day', '+8 hours')),
('light-001', 580.3, datetime('now', '-1 day', '+12 hours')),
('light-001', 430.0, datetime('now', '-1 day', '+16 hours')),
-- 今天
('light-001', 320.0, datetime('now', 'localtime'));

-- 插入告警记录
INSERT OR IGNORE INTO alerts (device_id, device_name, alert_type, alert_content, status, create_time, handle_time) VALUES
('light-003', '3号路灯', '设备离线', '设备心跳中断超过5分钟，判断为离线', 0, '2026-06-30 13:05:42', NULL),
('light-001', '1号路灯', '设备离线', '设备心跳中断超过5分钟，判断为离线', 1, '2026-06-28 08:12:10', '2026-06-28 09:30:00'),
('light-002', '2号路灯', '设备离线', '设备心跳中断超过5分钟，判断为离线', 1, '2026-06-25 22:05:33', '2026-06-26 07:45:00'),
('light-004', '4号路灯', '设备离线', '设备心跳中断超过5分钟，判断为离线', 0, '2026-06-20 15:30:00', NULL),
('light-005', '5号路灯', '数据异常', '光照数据持续为0，疑似传感器故障', 1, '2026-06-18 11:20:00', '2026-06-18 14:00:00');

-- 插入系统默认配置
INSERT OR IGNORE INTO system_config (config_key, config_value, description) VALUES
('threshold_low', '100', '光照下限阈值(lux)，低于此值自动开灯'),
('threshold_high', '800', '光照上限阈值(lux)，高于此值自动关灯'),
('control_mode', 'auto', '当前控制模式: auto=自动, manual=手动');
