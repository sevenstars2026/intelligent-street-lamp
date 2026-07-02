import 'dotenv/config'
import mysql from 'mysql2/promise'

export interface DBConfig {
    host: string
    port: number
    user: string
    password: string
    database: string
}

export const DB_CONFIG: DBConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_street_light'
}

let pool: mysql.Pool | null = null

export async function initPool(): Promise<mysql.Pool> {
    if (pool) return pool

    pool = mysql.createPool({
        host: DB_CONFIG.host,
        port: DB_CONFIG.port,
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        database: DB_CONFIG.database,
        charset: 'utf8mb4',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    })

    return pool
}

export function getPool(): mysql.Pool {
    if (!pool) {
        throw new Error('数据库连接池尚未初始化')
    }
    return pool
}

export async function closePool(): Promise<void> {
    if (pool) {
        await pool.end()
        pool = null
    }
}
