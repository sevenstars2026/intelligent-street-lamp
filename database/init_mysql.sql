-- ============================================
-- 智慧路灯管理系统 - MySQL 数据库初始化脚本
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password` VARCHAR(100) NOT NULL,
    `nickname` VARCHAR(50) NOT NULL,
    `role` VARCHAR(20) NOT NULL COMMENT 'municipal=市政人员, admin=路灯管理员',
    `avatar` VARCHAR(10) DEFAULT '',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 路灯设备表
CREATE TABLE IF NOT EXISTS `devices` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `device_id` VARCHAR(50) NOT NULL UNIQUE,
    `device_name` VARCHAR(100) NOT NULL,
    `location` VARCHAR(200) DEFAULT '',
    `online` TINYINT DEFAULT 0,
    `last_heartbeat` DATETIME,
    `bind_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `light_status` VARCHAR(10) DEFAULT 'off'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 光照数据记录表
CREATE TABLE IF NOT EXISTS `light_records` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `device_id` VARCHAR(50) NOT NULL,
    `light_value` DECIMAL(10,1) NOT NULL,
    `record_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_record_time` (`record_time`),
    INDEX `idx_device_time` (`device_id`, `record_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 告警记录表
CREATE TABLE IF NOT EXISTS `alerts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `device_id` VARCHAR(50) NOT NULL,
    `device_name` VARCHAR(100) NOT NULL,
    `alert_type` VARCHAR(50) NOT NULL,
    `alert_content` TEXT,
    `status` TINYINT DEFAULT 0 COMMENT '0=未处理 1=已处理',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `handle_time` DATETIME,
    INDEX `idx_status` (`status`),
    INDEX `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 系统配置表
CREATE TABLE IF NOT EXISTS `system_config` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `config_key` VARCHAR(50) NOT NULL UNIQUE,
    `config_value` VARCHAR(200) NOT NULL,
    `description` VARCHAR(200) DEFAULT '',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 控制日志表
CREATE TABLE IF NOT EXISTS `control_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `device_id` VARCHAR(50) NOT NULL,
    `device_name` VARCHAR(100) NOT NULL,
    `action` VARCHAR(10) NOT NULL COMMENT 'on=开灯 off=关灯',
    `mode` VARCHAR(10) NOT NULL COMMENT 'auto=自动 manual=手动',
    `operator` VARCHAR(50) DEFAULT '',
    `result` VARCHAR(20) DEFAULT 'success',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================
-- 初始化数据
-- ============================================

-- 用户数据
INSERT IGNORE INTO `users` (`username`, `password`, `nickname`, `role`, `avatar`) VALUES
('admin', '123456', '张工', 'municipal', '张'),
('manager', '123456', '李管理', 'admin', '李');

-- 设备数据
INSERT IGNORE INTO `devices` (`device_id`, `device_name`, `location`, `online`, `last_heartbeat`, `bind_time`, `light_status`) VALUES
('light-001', '1号路灯', '滨江路A段', 1, NOW(), '2026-06-01 09:00:00', 'on'),
('light-002', '2号路灯', '滨江路B段', 1, NOW(), '2026-06-01 09:10:00', 'on'),
('light-003', '3号路灯', '中山路C段', 0, '2026-06-30 13:05:42', '2026-06-03 10:30:00', 'off'),
('light-004', '4号路灯', '中山路D段', 1, NOW(), '2026-06-05 14:00:00', 'on'),
('light-005', '5号路灯', '人民路E段', 1, NOW(), '2026-06-10 08:45:00', 'on');

-- 光照历史数据（7天，每天一个均值）
INSERT IGNORE INTO `light_records` (`device_id`, `light_value`, `record_time`) VALUES
('light-001', 285.0, DATE_SUB(NOW(), INTERVAL 6 DAY)),
('light-001', 350.5, DATE_SUB(NOW(), INTERVAL 5 DAY)),
('light-001', 310.0, DATE_SUB(NOW(), INTERVAL 4 DAY)),
('light-001', 395.8, DATE_SUB(NOW(), INTERVAL 3 DAY)),
('light-001', 270.5, DATE_SUB(NOW(), INTERVAL 2 DAY)),
('light-001', 340.0, DATE_SUB(NOW(), INTERVAL 1 DAY)),
('light-001', 320.0, NOW());

-- 告警数据
INSERT IGNORE INTO `alerts` (`device_id`, `device_name`, `alert_type`, `alert_content`, `status`, `create_time`, `handle_time`) VALUES
('light-003', '3号路灯', '设备离线', '设备心跳中断超过5分钟，判断为离线', 0, '2026-06-30 13:05:42', NULL),
('light-001', '1号路灯', '设备离线', '设备心跳中断超过5分钟，判断为离线', 1, '2026-06-28 08:12:10', '2026-06-28 09:30:00'),
('light-002', '2号路灯', '设备离线', '设备心跳中断超过5分钟，判断为离线', 1, '2026-06-25 22:05:33', '2026-06-26 07:45:00'),
('light-004', '4号路灯', '设备离线', '设备心跳中断超过5分钟，判断为离线', 0, '2026-06-20 15:30:00', NULL),
('light-005', '5号路灯', '数据异常', '光照数据持续为0，疑似传感器故障', 1, '2026-06-18 11:20:00', '2026-06-18 14:00:00');

-- 系统配置
INSERT IGNORE INTO `system_config` (`config_key`, `config_value`, `description`) VALUES
('threshold_low', '100', '光照下限阈值(lux)，低于此值自动开灯'),
('threshold_high', '800', '光照上限阈值(lux)，高于此值自动关灯'),
('control_mode', 'auto', '当前控制模式: auto=自动, manual=手动');
