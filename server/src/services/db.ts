import 'dotenv/config'
import mysql from 'mysql2/promise'
import initSqlJs from 'sql.js'

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

export const DB_TYPE = process.env.DB_TYPE || 'mysql'

let pool: mysql.Pool | null = null
let sqliteDb: any = null

export function isSQLite(): boolean {
    return DB_TYPE === 'sqlite'
}

export async function initPool(): Promise<mysql.Pool | SQLiteAdapter> {
    if (isSQLite()) {
        if (sqliteDb) return new SQLiteAdapter(sqliteDb)
        const SQL = await initSqlJs()
        sqliteDb = new SQL.Database()
        return new SQLiteAdapter(sqliteDb)
    }

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

export function getPool(): mysql.Pool | SQLiteAdapter {
    if (isSQLite()) {
        if (!sqliteDb) {
            throw new Error('SQLite 数据库尚未初始化')
        }
        return new SQLiteAdapter(sqliteDb)
    }
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
    if (sqliteDb) {
        sqliteDb.close()
        sqliteDb = null
    }
}

/**
 * SQLite 适配器：提供与 mysql2/promise 兼容的 query/execute 接口
 */
export class SQLiteAdapter {
    constructor(private db: any) {}

    async query(sql: string, params?: any[]): Promise<any> {
        return [this.run(sql, params)]
    }

    async execute(sql: string, params?: any[]): Promise<any> {
        return [this.run(sql, params)]
    }

    private run(sql: string, params?: any[]): any[] {
        const rewritten = rewriteSQL(sql)
        const normalizedParams = (params || []).map(p => {
            if (p instanceof Date) return p.toISOString()
            return p
        })

        try {
            const stmt = this.db.prepare(rewritten, normalizedParams)
            const rows: any[] = []
            while (stmt.step()) {
                rows.push(stmt.getAsObject())
            }
            stmt.free()
            return rows
        } catch (err: any) {
            // 统一唯一约束错误码，让上层可以按 ER_DUP_ENTRY 处理
            if (err.message && err.message.includes('UNIQUE constraint failed')) {
                const e: any = new Error(err.message)
                e.code = 'ER_DUP_ENTRY'
                throw e
            }
            throw err
        }
    }
}

function rewriteSQL(sql: string): string {
    // 移除 MySQL 引擎与字符集声明
    sql = sql.replace(/ENGINE\s*=\s*InnoDB\s*DEFAULT\s*CHARSET\s*=\s*utf8mb4/gi, '')
    sql = sql.replace(/DEFAULT\s*CHARSET\s*=\s*utf8mb4/gi, '')

    // 将 MySQL 反引号替换为 SQLite 双引号
    sql = sql.replace(/`/g, '"')

    // AUTO_INCREMENT -> AUTOINCREMENT，但 SQLite 需要 INTEGER PRIMARY KEY AUTOINCREMENT
    sql = sql.replace(/INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')

    // TINYINT -> INTEGER
    sql = sql.replace(/\bTINYINT\b/gi, 'INTEGER')

    // DECIMAL -> REAL
    sql = sql.replace(/\bDECIMAL\([^)]+\)/gi, 'REAL')

    // ON UPDATE CURRENT_TIMESTAMP 在 SQLite 中不直接支持，移除
    sql = sql.replace(/ON\s+UPDATE\s+CURRENT_TIMESTAMP/gi, '')

    // DATE_SUB(NOW(), INTERVAL ? DAY) -> datetime('now', '-' || ? || ' days')
    // 必须在 NOW() 替换之前执行，否则内部的 NOW() 会被先替换为 datetime('now')
    sql = sql.replace(
        /DATE_SUB\s*\(\s*NOW\s*\(\s*\)\s*,\s*INTERVAL\s+\?\s+DAY\s*\)/gi,
        "datetime('now', '-' || ? || ' days')"
    )

    // NOW() -> datetime('now')
    sql = sql.replace(/\bNOW\s*\(\s*\)/gi, "datetime('now')")

    // INSERT IGNORE -> INSERT OR IGNORE
    sql = sql.replace(/INSERT\s+IGNORE\s+INTO/gi, 'INSERT OR IGNORE INTO')

    // SQLite 不支持 CREATE TABLE 内联 INDEX 声明，移除
    sql = sql.replace(/,\s*INDEX\s+\w+\s*\([^)]+\)/gi, '')

    return sql.trim()
}
