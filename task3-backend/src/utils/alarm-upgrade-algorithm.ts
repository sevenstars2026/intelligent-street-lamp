/**
 * 告警升级逻辑
 * 根据离线时长计算告警等级
 */

export enum AlarmLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface AlarmUpgradeResult {
  level: AlarmLevel;
  message: string;
  shouldNotify: boolean; // 是否需要发送通知（到达升级时间点）
}

export class AlarmUpgradeAlgorithm {
  // 告警等级时间阈值（小时）
  private static readonly LEVEL_THRESHOLDS = {
    [AlarmLevel.LOW]: 0,      // 0小时：低级
    [AlarmLevel.MEDIUM]: 1,   // 1小时：中级
    [AlarmLevel.HIGH]: 6      // 6小时：高级
  };

  /**
   * 计算当前告警等级
   * @param offlineStartTime 离线开始时间
   * @param currentTime 当前时间
   * @returns 告警等级和信息
   */
  static calculateLevel(
    offlineStartTime: Date,
    currentTime: Date = new Date()
  ): AlarmLevel {
    const offlineHours = this.getOfflineHours(offlineStartTime, currentTime);

    if (offlineHours >= this.LEVEL_THRESHOLDS[AlarmLevel.HIGH]) {
      return AlarmLevel.HIGH;
    } else if (offlineHours >= this.LEVEL_THRESHOLDS[AlarmLevel.MEDIUM]) {
      return AlarmLevel.MEDIUM;
    } else {
      return AlarmLevel.LOW;
    }
  }

  /**
   * 检查是否需要升级告警
   * @param offlineStartTime 离线开始时间
   * @param currentLevel 当前告警等级
   * @param currentTime 当前时间
   * @returns 升级结果
   */
  static checkUpgrade(
    offlineStartTime: Date,
    currentLevel: AlarmLevel,
    currentTime: Date = new Date()
  ): AlarmUpgradeResult {
    const newLevel = this.calculateLevel(offlineStartTime, currentTime);
    const offlineHours = this.getOfflineHours(offlineStartTime, currentTime);

    // 等级未变化
    if (newLevel === currentLevel) {
      return {
        level: currentLevel,
        message: this.getLevelMessage(currentLevel, offlineHours),
        shouldNotify: false
      };
    }

    // 等级已升级
    return {
      level: newLevel,
      message: this.getLevelMessage(newLevel, offlineHours),
      shouldNotify: true
    };
  }

  /**
   * 获取下次升级的时间点
   * @param currentLevel 当前告警等级
   * @param offlineStartTime 离线开始时间
   * @returns 下次升级时间（如果已是最高级则返回null）
   */
  static getNextUpgradeTime(
    currentLevel: AlarmLevel,
    offlineStartTime: Date
  ): Date | null {
    let nextThresholdHours: number | null = null;

    if (currentLevel === AlarmLevel.LOW) {
      nextThresholdHours = this.LEVEL_THRESHOLDS[AlarmLevel.MEDIUM];
    } else if (currentLevel === AlarmLevel.MEDIUM) {
      nextThresholdHours = this.LEVEL_THRESHOLDS[AlarmLevel.HIGH];
    }

    if (nextThresholdHours === null) {
      return null; // 已是最高级
    }

    const nextUpgradeTime = new Date(offlineStartTime);
    nextUpgradeTime.setHours(nextUpgradeTime.getHours() + nextThresholdHours);

    return nextUpgradeTime;
  }

  /**
   * 计算离线时长（小时）
   */
  private static getOfflineHours(startTime: Date, endTime: Date): number {
    const diffMs = endTime.getTime() - startTime.getTime();
    return diffMs / (1000 * 60 * 60);
  }

  /**
   * 获取告警等级对应的消息
   */
  private static getLevelMessage(level: AlarmLevel, offlineHours: number): string {
    const hours = Math.floor(offlineHours);
    const minutes = Math.floor((offlineHours - hours) * 60);

    const timeStr = hours > 0
      ? `${hours}小时${minutes > 0 ? minutes + '分钟' : ''}`
      : `${minutes}分钟`;

    switch (level) {
      case AlarmLevel.LOW:
        return `设备离线${timeStr}`;
      case AlarmLevel.MEDIUM:
        return `设备离线超过1小时（当前${timeStr}）`;
      case AlarmLevel.HIGH:
        return `设备离线超过6小时（当前${timeStr}）`;
      default:
        return `设备离线${timeStr}`;
    }
  }

  /**
   * 获取所有升级时间点（用于定时任务调度）
   */
  static getUpgradeTimePoints(): number[] {
    return [
      this.LEVEL_THRESHOLDS[AlarmLevel.MEDIUM],
      this.LEVEL_THRESHOLDS[AlarmLevel.HIGH]
    ];
  }
}
