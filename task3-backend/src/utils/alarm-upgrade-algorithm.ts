export type AlarmLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AlarmUpgradeContext {
  alarmLevel: AlarmLevel;
  createdAt: Date;
}

export interface AlarmUpgradeResult {
  shouldUpgrade: boolean;
  nextLevel: AlarmLevel | null;
  hoursSinceCreation: number;
}

export function evaluateAlarmUpgrade(
  alarm: AlarmUpgradeContext,
  now: Date = new Date()
): AlarmUpgradeResult {
  const createdAt = alarm.createdAt instanceof Date ? alarm.createdAt : new Date(alarm.createdAt);
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceCreation >= 72 && alarm.alarmLevel !== 'critical') {
    return { shouldUpgrade: true, nextLevel: 'critical', hoursSinceCreation };
  }

  if (hoursSinceCreation >= 48 && alarm.alarmLevel !== 'high' && alarm.alarmLevel !== 'critical') {
    return { shouldUpgrade: true, nextLevel: 'high', hoursSinceCreation };
  }

  if (hoursSinceCreation >= 24 && alarm.alarmLevel === 'low') {
    return { shouldUpgrade: true, nextLevel: 'medium', hoursSinceCreation };
  }

  return { shouldUpgrade: false, nextLevel: null, hoursSinceCreation };
}
