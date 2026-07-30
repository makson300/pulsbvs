import { describe, expect, it } from 'vitest';
import { assessBattery } from './batteryRisk';

describe('assessBattery', () => {
  it('does not pretend to assess battery health from route-only data', () => {
    const result = assessBattery({ capability: 'route_only', batteryPercent: 80 });

    expect(result.healthScore).toBeNull();
    expect(result.confidence).toBe('low');
    expect(result.alerts).toContainEqual(expect.objectContaining({ code: 'BATTERY_DATA_LIMITED', severity: 'info' }));
  });

  it('raises a critical alert for T40 undervoltage threshold', () => {
    const result = assessBattery({ capability: 'extended', batteryPercent: 25, packVoltage: 47.3 });

    expect(result.alerts).toContainEqual(expect.objectContaining({ code: 'BATTERY_UNDERVOLTAGE', severity: 'critical' }));
    expect(result.healthScore).toBeLessThan(100);
  });

  it('raises a critical alert for severe cell imbalance', () => {
    const result = assessBattery({
      capability: 'extended',
      batteryPercent: 60,
      cellVoltages: [4.1, 4.09, 3.98, 4.08],
      batteryTemperatureC: 36,
    });

    expect(result.confidence).toBe('high');
    expect(result.alerts).toContainEqual(expect.objectContaining({ code: 'BATTERY_CELL_IMBALANCE', severity: 'critical' }));
  });

  it('raises a critical alert for battery overheat', () => {
    const result = assessBattery({ capability: 'extended', batteryPercent: 55, batteryTemperatureC: 51 });

    expect(result.alerts).toContainEqual(expect.objectContaining({ code: 'BATTERY_OVERHEAT', severity: 'critical' }));
  });
});
