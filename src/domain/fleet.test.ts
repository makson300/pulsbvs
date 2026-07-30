import { describe, expect, it } from 'vitest';
import { analyzeTelemetry, parseTelemetryCsv, parseTelemetryFile } from '../analytics/telemetry';
import { createDefaultFleetState, createPendingImport, createSavedImport, loadFleetState, saveFleetState, upsertImport, upsertPendingImport } from './fleet';

function memoryStorage(initial?: string) {
  const store = new Map<string, string>();
  if (initial) store.set('puls-bvs-fleet-state', initial);
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  };
}

describe('fleet domain state', () => {
  it('loads a safe default fleet state when storage is empty', () => {
    const state = loadFleetState(memoryStorage());

    expect(state.drones.map((drone) => drone.model)).toEqual(['DJI Avata 2', 'DJI Avata 360', 'DJI Mini 4 Pro']);
    expect(state.drones.every((drone) => drone.health === null && drone.flightHours === null)).toBe(true);
    expect(state.batteries.length).toBeGreaterThan(0);
    expect(state.batteries[0].health).toBeNull();
    expect(state.batteries[0].cycles).toBeNull();
    expect(state.imports).toEqual([]);
    expect(state.pendingImports).toEqual([]);
    expect(state.selectedDroneId).toBe(state.drones[0].id);
    expect(state.selectedBatteryId).toBe(state.batteries[0].id);
  });

  it('persists and restores supported telemetry imports with asset links', () => {
    const state = createDefaultFleetState();
    const analysis = analyzeTelemetry(parseTelemetryCsv('flight.csv', 'timestamp,battery_percent,pack_voltage\n2026-07-30T09:00:00Z,90,51\n2026-07-30T09:04:00Z,82,49'));
    const saved = createSavedImport(analysis, state.selectedDroneId, state.selectedBatteryId, new Date('2026-07-30T09:10:00Z'));

    expect(saved).not.toBeNull();
    const nextState = upsertImport(state, saved!);
    const storage = memoryStorage();
    saveFleetState(nextState, storage);
    const restored = loadFleetState(storage);

    expect(restored.imports).toHaveLength(1);
    expect(restored.imports[0].sourceName).toBe('flight.csv');
    expect(restored.imports[0].droneId).toBe(state.selectedDroneId);
    expect(restored.imports[0].batteryId).toBe(state.selectedBatteryId);
    expect(restored.imports[0].analysis.summary.points).toBe(2);
  });

  it('does not create full history entries for unsupported DAT or ZIP imports', () => {
    const state = createDefaultFleetState();
    const analysis = analyzeTelemetry(parseTelemetryFile('raw.zip', 'binary'));

    expect(createSavedImport(analysis, state.selectedDroneId, state.selectedBatteryId)).toBeNull();
  });

  it('keeps unsupported DAT or ZIP imports in a research queue', () => {
    const state = createDefaultFleetState();
    const analysis = analyzeTelemetry(parseTelemetryFile('raw.zip', 'binary'));
    const pending = createPendingImport(analysis, state.selectedDroneId, state.selectedBatteryId, new Date('2026-07-30T10:00:00Z'));

    expect(pending).not.toBeNull();
    const nextState = upsertPendingImport(state, pending!);
    const storage = memoryStorage();
    saveFleetState(nextState, storage);
    const restored = loadFleetState(storage);

    expect(restored.imports).toEqual([]);
    expect(restored.pendingImports).toHaveLength(1);
    expect(restored.pendingImports[0].sourceName).toBe('raw.zip');
    expect(restored.pendingImports[0].reason).toContain('автоматический разбор этого формата ещё не подключён');
  });
});
