/**
 * 数据聚合算法
 * 计算光照数据的统计信息
 */

export interface RawLightData {
  lightIntensity: number;
  timestamp: Date;
}

export interface AggregatedData {
  avgLightIntensity: number;
  maxLightIntensity: number;
  minLightIntensity: number;
  sampleCount: number;
  timeWindow?: Date;  // 可选字段，用于聚合数据
}

export class DataAggregationAlgorithm {
  /**
   * 聚合光照数据
   * @param data 原始光照数据数组
   * @returns 聚合结果
   */
  static aggregate(data: RawLightData[]): AggregatedData | null {
    if (data.length === 0) {
      return null;
    }

    const intensities = data.map(d => d.lightIntensity);

    return {
      avgLightIntensity: this.calculateAverage(intensities),
      maxLightIntensity: Math.max(...intensities),
      minLightIntensity: Math.min(...intensities),
      sampleCount: data.length
    };
  }

  /**
   * 按小时聚合数据
   * @param data 原始数据
   * @returns 按小时分组的聚合数据
   */
  static aggregateByHour(data: RawLightData[]): Map<string, AggregatedData> {
    const hourlyData = new Map<string, RawLightData[]>();

    // 按小时分组
    data.forEach(item => {
      const hourKey = this.getHourKey(item.timestamp);

      if (!hourlyData.has(hourKey)) {
        hourlyData.set(hourKey, []);
      }

      hourlyData.get(hourKey)!.push(item);
    });

    // 对每个小时的数据进行聚合
    const result = new Map<string, AggregatedData>();

    hourlyData.forEach((items, hourKey) => {
      const aggregated = this.aggregate(items);
      if (aggregated) {
        result.set(hourKey, aggregated);
      }
    });

    return result;
  }

  /**
   * 计算平均值（保留1位小数）
   */
  private static calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;

    const sum = numbers.reduce((acc, val) => acc + val, 0);
    const avg = sum / numbers.length;

    return Math.round(avg * 10) / 10;
  }

  /**
   * 获取小时键（格式：YYYY-MM-DD-HH）
   */
  private static getHourKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');

    return `${year}-${month}-${day}-${hour}`;
  }

  /**
   * 解析小时键为Date对象
   */
  static parseHourKey(hourKey: string): Date {
    const [year, month, day, hour] = hourKey.split('-').map(Number);
    return new Date(year, month - 1, day, hour, 0, 0, 0);
  }

  /**
   * 获取时间范围内的所有小时键
   */
  static getHourKeysInRange(startTime: Date, endTime: Date): string[] {
    const keys: string[] = [];
    const current = new Date(startTime);
    current.setMinutes(0, 0, 0);

    while (current <= endTime) {
      keys.push(this.getHourKey(current));
      current.setHours(current.getHours() + 1);
    }

    return keys;
  }
}
