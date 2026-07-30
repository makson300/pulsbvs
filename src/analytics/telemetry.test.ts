import { describe, expect, it } from 'vitest';
import { analyzeTelemetry, parseTelemetryCsv, parseTelemetryFile } from './telemetry';

describe('telemetry parsing and analysis', () => {
  it('parses CSV battery telemetry and classifies it as extended data', () => {
    const parsed = parseTelemetryCsv('flight.csv', `timestamp,lat,lon,battery_percent,pack_voltage,battery_temperature,cell1,cell2,warning
2026-07-30T09:00:00Z,55.75,37.61,90,51.0,35,4.20,4.19,
2026-07-30T09:02:00Z,55.76,37.62,70,49.0,42,4.05,3.98,cell warning`);
    const analysis = analyzeTelemetry(parsed);

    expect(parsed.sourceKind).toBe('csv');
    expect(parsed.rows).toHaveLength(2);
    expect(analysis.importProfile.capability).toBe('battery_extended');
    expect(analysis.quality.available).toContain('Напряжения ячеек');
    expect(analysis.summary.maxCellDeviation).toBeCloseTo(0.07);
  });

  it('parses KML as route-only telemetry without promising battery diagnostics', () => {
    const parsed = parseTelemetryFile('smartfarm-route.kml', `<?xml version="1.0" encoding="UTF-8"?>
<kml><Document><Placemark><LineString><coordinates>
37.6184,55.7512,10 37.6191,55.7521,12
</coordinates></LineString></Placemark></Document></kml>`);
    const analysis = analyzeTelemetry(parsed);

    expect(parsed.sourceKind).toBe('kml');
    expect(parsed.rows).toEqual([
      expect.objectContaining({ latitude: 55.7512, longitude: 37.6184, altitudeM: 10 }),
      expect.objectContaining({ latitude: 55.7521, longitude: 37.6191, altitudeM: 12 }),
    ]);
    expect(analysis.importProfile.capability).toBe('route_only');
    expect(analysis.battery.alerts).toContainEqual(expect.objectContaining({ code: 'BATTERY_DATA_LIMITED' }));
  });

  it('detects basic battery telemetry when cells are missing', () => {
    const parsed = parseTelemetryCsv('basic.csv', `timestamp,latitude,longitude,battery_percent,voltage,temperature
2026-07-30T09:00:00Z,55.75,37.61,80,50.2,34
2026-07-30T09:03:00Z,55.76,37.62,60,48.9,39`);
    const analysis = analyzeTelemetry(parsed);

    expect(analysis.importProfile.capability).toBe('battery_basic');
    expect(analysis.quality.available).toContain('Заряд батареи');
    expect(analysis.quality.missing).toContain('Напряжения ячеек');
  });
});
