/**
 * Mock Redis服务
 * 模拟Redis操作，方便独立开发和测试
 */

interface RedisValue {
  value: any;
  expireAt: number | null; // 过期时间戳，null表示永不过期
}

export class MockRedis {
  private store: Map<string, RedisValue> = new Map();

  /**
   * 设置值
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const expireAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;

    this.store.set(key, {
      value,
      expireAt
    });
  }

  /**
   * 获取值
   */
  async get(key: string): Promise<any | null> {
    const item = this.store.get(key);

    if (!item) {
      return null;
    }

    // 检查是否过期
    if (item.expireAt && Date.now() > item.expireAt) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * 删除键
   */
  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<number> {
    const item = this.store.get(key);

    if (!item) {
      return 0;
    }

    // 检查是否过期
    if (item.expireAt && Date.now() > item.expireAt) {
      this.store.delete(key);
      return 0;
    }

    return 1;
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);

    if (!item) {
      return 0;
    }

    item.expireAt = Date.now() + seconds * 1000;
    return 1;
  }

  /**
   * 获取TTL（剩余生存时间）
   */
  async ttl(key: string): Promise<number> {
    const item = this.store.get(key);

    if (!item) {
      return -2; // 键不存在
    }

    if (!item.expireAt) {
      return -1; // 永不过期
    }

    const remaining = Math.floor((item.expireAt - Date.now()) / 1000);

    if (remaining <= 0) {
      this.store.delete(key);
      return -2;
    }

    return remaining;
  }

  /**
   * 获取匹配模式的所有键
   */
  async keys(pattern: string): Promise<string[]> {
    const regex = this.patternToRegex(pattern);
    const matchedKeys: string[] = [];

    this.store.forEach((value, key) => {
      // 检查是否过期
      if (value.expireAt && Date.now() > value.expireAt) {
        this.store.delete(key);
        return;
      }

      if (regex.test(key)) {
        matchedKeys.push(key);
      }
    });

    return matchedKeys;
  }

  /**
   * 递增值
   */
  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const newValue = (parseInt(current || '0') || 0) + 1;
    await this.set(key, newValue);
    return newValue;
  }

  /**
   * 递减值
   */
  async decr(key: string): Promise<number> {
    const current = await this.get(key);
    const newValue = (parseInt(current || '0') || 0) - 1;
    await this.set(key, newValue);
    return newValue;
  }

  /**
   * 哈希表操作 - 设置字段
   */
  async hset(key: string, field: string, value: any): Promise<number> {
    const hash = await this.get(key) || {};
    const isNew = !hash.hasOwnProperty(field);
    hash[field] = value;
    await this.set(key, hash);
    return isNew ? 1 : 0;
  }

  /**
   * 哈希表操作 - 获取字段
   */
  async hget(key: string, field: string): Promise<any | null> {
    const hash = await this.get(key);
    return hash ? hash[field] || null : null;
  }

  /**
   * 哈希表操作 - 获取所有字段
   */
  async hgetall(key: string): Promise<Record<string, any> | null> {
    return await this.get(key);
  }

  /**
   * 哈希表操作 - 删除字段
   */
  async hdel(key: string, field: string): Promise<number> {
    const hash = await this.get(key);
    if (!hash || !hash.hasOwnProperty(field)) {
      return 0;
    }
    delete hash[field];
    await this.set(key, hash);
    return 1;
  }

  /**
   * 列表操作 - 左推入
   */
  async lpush(key: string, value: any): Promise<number> {
    const list = await this.get(key) || [];
    list.unshift(value);
    await this.set(key, list);
    return list.length;
  }

  /**
   * 列表操作 - 右推入
   */
  async rpush(key: string, value: any): Promise<number> {
    const list = await this.get(key) || [];
    list.push(value);
    await this.set(key, list);
    return list.length;
  }

  /**
   * 列表操作 - 获取范围
   */
  async lrange(key: string, start: number, stop: number): Promise<any[]> {
    const list = await this.get(key) || [];
    return list.slice(start, stop === -1 ? undefined : stop + 1);
  }

  /**
   * 清空所有数据
   */
  async flushall(): Promise<void> {
    this.store.clear();
  }

  /**
   * 获取所有键的数量
   */
  async dbsize(): Promise<number> {
    // 清理过期键
    this.store.forEach((value, key) => {
      if (value.expireAt && Date.now() > value.expireAt) {
        this.store.delete(key);
      }
    });

    return this.store.size;
  }

  /**
   * 将模式转换为正则表达式
   */
  private patternToRegex(pattern: string): RegExp {
    // 将Redis的通配符转换为正则表达式
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    return new RegExp(`^${regexPattern}$`);
  }

  /**
   * 定期清理过期键（后台任务）
   */
  startExpirationCleanup(intervalMs: number = 10000): NodeJS.Timeout {
    return setInterval(() => {
      let cleanedCount = 0;
      this.store.forEach((value, key) => {
        if (value.expireAt && Date.now() > value.expireAt) {
          this.store.delete(key);
          cleanedCount++;
        }
      });

      if (cleanedCount > 0) {
        console.log(`[MockRedis] Cleaned ${cleanedCount} expired keys`);
      }
    }, intervalMs);
  }
}

// 单例模式
export const mockRedis = new MockRedis();
