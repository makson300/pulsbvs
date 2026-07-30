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

  it('treats empty CSV as an unknown limited source', () => {
    const parsed = parseTelemetryCsv('empty.csv', '');
    const analysis = analyzeTelemetry(parsed);

    expect(parsed.sourceKind).toBe('unknown');
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.missingCoreFields).toEqual(['timestamp', 'batteryPercent', 'coordinates']);
    expect(analysis.importProfile.capability).toBe('route_only');
    expect(analysis.quality.score).toBe(0);
    expect(analysis.battery.alerts).toContainEqual(expect.objectContaining({ code: 'BATTERY_DATA_LIMITED' }));
  });

  it('does not invent battery diagnostics for malformed CSV values', () => {
    const parsed = parseTelemetryCsv('broken.csv', `timestamp,latitude,longitude,battery_percent,pack_voltage,battery_temperature,cell1,cell2
not-a-date,not-a-lat,37.61,unknown,voltage-hot,NaN,bad,cell`);
    const analysis = analyzeTelemetry(parsed);

    expect(parsed.sourceKind).toBe('csv');
    expect(parsed.rows).toEqual([expect.objectContaining({ timestamp: 'not-a-date', longitude: 37.61 })]);
    expect(analysis.importProfile.capability).toBe('route_only');
    expect(analysis.quality.available).not.toContain('Заряд батареи');
    expect(analysis.summary.minVoltage).toBeNull();
  });

  it('keeps malformed KML as route-only telemetry with no fake points', () => {
    const parsed = parseTelemetryFile('broken.kml', '<kml><coordinates>not-a-coordinate</coordinates></kml>');
    const analysis = analyzeTelemetry(parsed);

    expect(parsed.sourceKind).toBe('kml');
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.detectedColumns).toEqual([]);
    expect(analysis.importProfile.capability).toBe('route_only');
    expect(analysis.quality.score).toBe(0);
  });

  it('accepts DAT without running fake analytics before format support exists', () => {
    const parsed = parseTelemetryFile('flight.dat', 'binary-ish-content');
    const analysis = analyzeTelemetry(parsed);

    expect(parsed.sourceKind).toBe('unsupported');
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.notice).toContain('этот тип файла пока не читается');
    expect(analysis.importProfile.title).toBe('Тип файла ждёт проверки');
    expect(analysis.importProfile.capability).toBe('route_only');
    expect(analysis.summary.points).toBe(0);
  });

  it('accepts ZIP without running fake analytics before format support exists', () => {
    const parsed = parseTelemetryFile('logs.zip', 'compressed-placeholder');
    const analysis = analyzeTelemetry(parsed);

    expect(parsed.sourceKind).toBe('unsupported');
    expect(parsed.detectedColumns).toEqual([]);
    expect(analysis.quality.score).toBe(0);
    expect(analysis.battery.alerts).toContainEqual(expect.objectContaining({ code: 'BATTERY_DATA_LIMITED' }));
  });

  it('keeps JSON exports in the research queue until a decoder is confirmed', () => {
    const parsed = parseTelemetryFile('flight-record.json', '{"battery":90}');
    const analysis = analyzeTelemetry(parsed);

    expect(parsed.sourceKind).toBe('unsupported');
    expect(parsed.detectedColumns).toEqual([]);
    expect(analysis.importProfile.capability).toBe('route_only');
    expect(analysis.summary.points).toBe(0);
  });
});
