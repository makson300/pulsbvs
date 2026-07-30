export type TelemetryCapability = 'route_only' | 'extended';

export interface BatterySnapshot {
  capability: TelemetryCapability;
  batteryPercent: number;
  packVoltage?: number;
  cellVoltages?: number[];
  batteryTemperatureC?: number;
  dischargeRatePercentPerMinute?: number;
  historicalVoltageSagPercent?: number;
  currentVoltageSagPercent?: number;
  cycleCount?: number;
  knownBatteryError?: boolean;
}

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface RiskAlert {
  code:
    | 'BATTERY_DATA_LIMITED'
    | 'BATTERY_CELL_IMBALANCE'
    | 'BATTERY_OVERHEAT'
    | 'BATTERY_VOLTAGE_SAG'
    | 'BATTERY_UNDERVOLTAGE'
    | 'BATTERY_RAPID_DRAIN'
    | 'BATTERY_DEVICE_ERROR';
  severity: AlertSeverity;
  title: string;
  detail: string;
  recommendation: string;
}

export interface BatteryAssessment {
  healthScore: number | null;
  confidence: 'low' | 'medium' | 'high';
  alerts: RiskAlert[];
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Conservative first-pass rules for T40-class battery telemetry.
 * These are triage signals, not a replacement for the DJI manual or diagnostics.
 */
export function assessBattery(snapshot: BatterySnapshot): BatteryAssessment {
  if (snapshot.capability === 'route_only') {
    return {
      healthScore: null,
      confidence: 'low',
      alerts: [{
        code: 'BATTERY_DATA_LIMITED',
        severity: 'info',
        title: 'Недостаточно данных для оценки батареи',
        detail: 'В этом файле есть маршрутная телеметрия, но нет параметров ячеек и батареи.',
        recommendation: 'Загрузите расширенный экспорт с пульта или DJI Assistant 2 for MG.',
      }],
    };
  }

  let score = 100;
  const alerts: RiskAlert[] = [];
  const cellDeviation = snapshot.cellVoltages?.length
    ? Math.max(...snapshot.cellVoltages) - Math.min(...snapshot.cellVoltages)
    : undefined;

  if (snapshot.knownBatteryError) {
    score -= 45;
    alerts.push({
      code: 'BATTERY_DEVICE_ERROR', severity: 'critical', title: 'Батарея сообщила об ошибке',
      detail: 'Контроллер батареи зафиксировал ошибку в логе.',
      recommendation: 'Исключите батарею из эксплуатации до проверки авторизованным специалистом.',
    });
  }
  if (cellDeviation !== undefined && cellDeviation >= 0.1) {
    score -= 35;
    alerts.push({
      code: 'BATTERY_CELL_IMBALANCE', severity: 'critical', title: 'Критический разбаланс ячеек',
      detail: `Разница напряжений ячеек ${cellDeviation.toFixed(3)} В под нагрузкой.`,
      recommendation: 'Не используйте батарею для рабочих вылетов; проведите диагностику.',
    });
  } else if (cellDeviation !== undefined && cellDeviation >= 0.05) {
    score -= 18;
    alerts.push({
      code: 'BATTERY_CELL_IMBALANCE', severity: 'warning', title: 'Растёт разбаланс ячеек',
      detail: `Разница напряжений ячеек ${cellDeviation.toFixed(3)} В под нагрузкой.`,
      recommendation: 'Повторите контрольный полёт без полной нагрузки и проверьте динамику.',
    });
  }
  if ((snapshot.batteryTemperatureC ?? 0) >= 50) {
    score -= 25;
    alerts.push({
      code: 'BATTERY_OVERHEAT', severity: 'critical', title: 'Перегрев батареи',
      detail: `Температура батареи достигла ${snapshot.batteryTemperatureC} °C.`,
      recommendation: 'Прекратите эксплуатацию, дайте батарее остыть и проверьте разъёмы и режим нагрузки.',
    });
  } else if ((snapshot.batteryTemperatureC ?? 0) >= 45) {
    score -= 10;
    alerts.push({
      code: 'BATTERY_OVERHEAT', severity: 'warning', title: 'Повышенная температура батареи',
      detail: `Температура батареи достигла ${snapshot.batteryTemperatureC} °C.`,
      recommendation: 'Снизьте нагрузку и проконтролируйте температуру на следующем вылете.',
    });
  }
  if ((snapshot.packVoltage ?? Infinity) < 47.6) {
    score -= 35;
    alerts.push({
      code: 'BATTERY_UNDERVOLTAGE', severity: 'critical', title: 'Критически низкое напряжение',
      detail: `Напряжение пакета ${snapshot.packVoltage?.toFixed(1)} В ниже порога автоматической посадки T40.`,
      recommendation: 'Зафиксируйте событие и не используйте батарею повторно без осмотра.',
    });
  }
  if (snapshot.currentVoltageSagPercent && snapshot.historicalVoltageSagPercent &&
      snapshot.currentVoltageSagPercent > snapshot.historicalVoltageSagPercent * 1.2) {
    score -= 14;
    alerts.push({
      code: 'BATTERY_VOLTAGE_SAG', severity: 'warning', title: 'Аномальная просадка напряжения',
      detail: `Просадка выше личной нормы батареи на ${Math.round((snapshot.currentVoltageSagPercent / snapshot.historicalVoltageSagPercent - 1) * 100)}%.`,
      recommendation: 'Ограничьте тяжёлые задачи и сравните батарею с исправной на одинаковой нагрузке.',
    });
  }
  if ((snapshot.dischargeRatePercentPerMinute ?? 0) >= 14) {
    score -= 8;
    alerts.push({
      code: 'BATTERY_RAPID_DRAIN', severity: 'warning', title: 'Ускоренный разряд',
      detail: `Средний расход ${snapshot.dischargeRatePercentPerMinute?.toFixed(1)}% в минуту.`,
      recommendation: 'Оцените загрузку, ветер и маршрут; сравните расход с сопоставимыми вылетами.',
    });
  }

  return {
    healthScore: clamp(score, 0, 100),
    confidence: snapshot.cellVoltages?.length && snapshot.batteryTemperatureC !== undefined ? 'high' : 'medium',
    alerts,
  };
}
