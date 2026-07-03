declare module 'sql.js' {
    export interface QueryResults {
        columns: string[]
        values: any[][]
    }

    export interface ParamsObject {
        [key: string]: number | string | null
    }

    export type SqlValue = number | string | Uint8Array | null
    export type Params = SqlValue[] | ParamsObject

    export interface Statement {
        bind(values?: Params): boolean
        step(): boolean
        getAsObject<T = any>(): T
        get(params?: Params): SqlValue[]
        getColumnNames(): string[]
        free(): boolean
        reset(): void
    }

    export interface Database {
        run(sql: string, params?: Params): void
        exec(sql: string): QueryResults[]
        each(sql: string, params: Params, callback: (row: any) => void, done: () => void): void
        prepare(sql: string, params?: Params): Statement
        export(): Uint8Array
        close(): void
        getRowsModified(): number
        create_function(name: string, func: (...args: any[]) => any): void
    }

    export interface SqlJsStatic {
        Database: new (data?: Uint8Array) => Database
        Statement: new (...args: any[]) => Statement
    }

    function initSqlJs(config?: { locateFile?: (file: string) => string }): Promise<SqlJsStatic>

    export default initSqlJs
}
