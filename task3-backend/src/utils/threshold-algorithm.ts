/**
 * 光照阈值判定算法
 * 最近5次采样中有4次满足条件才触发
 */

export interface LightSample {
  lightIntensity: number;
  timestamp: Date;
}

export class ThresholdAlgorithm {
  private static readonly SAMPLE_COUNT = 5;
  private static readonly TRIGGER_COUNT = 4;

  /**
   * 判断是否应该开灯
   * @param samples 最近的光照采样数据（最多5个）
   * @param threshold 开灯阈值
   * @returns 是否应该开灯
   */
  static shouldTurnOn(samples: LightSample[], threshold: number): boolean {
    if (samples.length < this.SAMPLE_COUNT) {
      return false; // 采样数不足，不触发
    }

    // 取最近5次采样
    const recentSamples = samples.slice(-this.SAMPLE_COUNT);

    // 计算有多少次低于阈值
    const belowThresholdCount = recentSamples.filter(
      sample => sample.lightIntensity < threshold
    ).length;

    return belowThresholdCount >= this.TRIGGER_COUNT;
  }

  /**
   * 判断是否应该关灯
   * @param samples 最近的光照采样数据（最多5个）
   * @param threshold 关灯阈值
   * @returns 是否应该关灯
   */
  static shouldTurnOff(samples: LightSample[], threshold: number): boolean {
    if (samples.length < this.SAMPLE_COUNT) {
      return false; // 采样数不足，不触发
    }

    // 取最近5次采样
    const recentSamples = samples.slice(-this.SAMPLE_COUNT);

    // 计算有多少次高于阈值
    const aboveThresholdCount = recentSamples.filter(
      sample => sample.lightIntensity > threshold
    ).length;

    return aboveThresholdCount >= this.TRIGGER_COUNT;
  }

  /**
   * 添加新采样到历史记录
   * @param history 历史采样数据
   * @param newSample 新采样
   * @param maxSize 保留的最大采样数
   * @returns 更新后的历史记录
   */
  static addSample(
    history: LightSample[],
    newSample: LightSample,
    maxSize: number = 10
  ): LightSample[] {
    const updated = [...history, newSample];

    // 只保留最近的采样
    if (updated.length > maxSize) {
      return updated.slice(-maxSize);
    }

    return updated;
  }
}
