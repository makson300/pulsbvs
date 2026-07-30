import { describe, expect, it } from 'vitest';
import { analyzeTelemetry, parseTelemetryCsv, parseTelemetryFile } from '../analytics/telemetry';
import {
  createChecklistRun,
  createDefaultFleetState,
  createDocumentRecord,
  createIncidentRecord,
  createMaintenanceTask,
  createManualFlightEntry,
  createPendingImport,
  createSavedImport,
  getFleetReadiness,
  loadFleetState,
  saveFleetState,
  setIncidentStatus,
  setMaintenanceTaskStatus,
  updateAssetPassport,
  upsertImport,
  upsertPendingImport,
} from './fleet';

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
    expect(state.maintenanceTasks).toEqual([]);
    expect(state.manualFlights).toEqual([]);
    expect(state.selectedDroneId).toBe(state.drones[0].id);
    expect(state.selectedBatteryId).toBe(state.batteries[0].id);
  });

  it('loads a safe default state when browser storage rejects access', () => {
    const storage = { getItem: () => { throw new Error('storage unavailable'); } };

    expect(loadFleetState(storage).imports).toEqual([]);
  });

  it('does not throw when browser storage rejects a save', () => {
    const storage = { setItem: () => { throw new Error('storage unavailable'); } };

    expect(saveFleetState(createDefaultFleetState(), storage)).toBe(false);
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

  it('stores file origin notes with supported telemetry imports', () => {
    const state = createDefaultFleetState();
    const analysis = analyzeTelemetry(parseTelemetryCsv('flight.csv', 'timestamp,battery_percent\n2026-07-30T09:00:00Z,90'));
    const saved = createSavedImport(analysis, state.selectedDroneId, state.selectedBatteryId, new Date('2026-07-30T09:10:00Z'), {
      source: 'телефон пилота',
      flightDate: '30.07 утро',
      scenario: 'проверочный полёт',
      hiddenData: 'точные координаты',
    });

    expect(saved?.originNote).toEqual({ source: 'телефон пилота', flightDate: '30.07 утро', scenario: 'проверочный полёт', hiddenData: 'точные координаты' });
  });

  it('does not create full history entries for unsupported DAT or ZIP imports', () => {
    const state = createDefaultFleetState();
    const analysis = analyzeTelemetry(parseTelemetryFile('raw.zip', 'binary'));

    expect(createSavedImport(analysis, state.selectedDroneId, state.selectedBatteryId)).toBeNull();
  });

  it('does not create full history entries for empty supported files', () => {
    const state = createDefaultFleetState();
    const analysis = analyzeTelemetry(parseTelemetryCsv('empty.csv', ''));

    expect(createSavedImport(analysis, state.selectedDroneId, state.selectedBatteryId)).toBeNull();
    expect(createPendingImport(analysis, state.selectedDroneId, state.selectedBatteryId)).not.toBeNull();
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
    expect(restored.pendingImports[0].reason).toContain('этот тип файла пока не читается');
  });

  it('stores file origin notes with unsupported files in the research queue', () => {
    const state = createDefaultFleetState();
    const analysis = analyzeTelemetry(parseTelemetryFile('raw.zip', 'binary'));
    const pending = createPendingImport(analysis, state.selectedDroneId, state.selectedBatteryId, new Date('2026-07-30T10:00:00Z'), { source: 'пульт', hiddenData: 'имя пилота' });

    expect(pending?.originNote).toEqual({ source: 'пульт', flightDate: undefined, scenario: undefined, hiddenData: 'имя пилота' });
  });

  it('adds missing operational collections when restoring older browser data', () => {
    const storage = memoryStorage(JSON.stringify({ drones: createDefaultFleetState().drones, batteries: createDefaultFleetState().batteries, imports: [] }));

    const restored = loadFleetState(storage);

    expect(restored.maintenanceTasks).toEqual([]);
    expect(restored.incidents).toEqual([]);
    expect(restored.documents).toEqual([]);
    expect(restored.manualFlights).toEqual([]);
    expect(restored.checklistRuns).toEqual([]);
  });

  it('creates operational records independently from telemetry and preserves manual semantics', () => {
    const state = createDefaultFleetState();
    const now = new Date('2026-07-30T10:00:00Z');
    const flight = createManualFlightEntry({ flightDate: '2026-07-30', droneId: state.selectedDroneId, batteryId: state.selectedBatteryId, pilot: 'Иван', purpose: 'Осмотр поля', durationMin: 18, location: 'Поле 7' }, now);
    const checklist = createChecklistRun({ flightId: flight.id, phase: 'preflight', answers: { airframe: true, battery: true } }, now);
    const passport = updateAssetPassport(state.drones[0], { serialNumber: 'SN-001', owner: 'АгроСфера' }, now);

    expect(flight.durationMin).toBe(18);
    expect(flight.createdAt).toBe(now.toISOString());
    expect(checklist.flightId).toBe(flight.id);
    expect(passport.passport).toMatchObject({ serialNumber: 'SN-001', owner: 'АгроСфера' });
  });

  it('calculates readiness only from explicit operational facts', () => {
    const state = createDefaultFleetState();
    const now = new Date('2026-07-30T10:00:00Z');
    const task = createMaintenanceTask({ assetKind: 'drone', assetId: state.selectedDroneId, title: 'Проверить пропеллеры', dueDate: '2026-07-29' }, now);
    const incident = createIncidentRecord({ assetKind: 'drone', assetId: state.selectedDroneId, title: 'Повреждение луча', severity: 'critical', occurredOn: '2026-07-30' }, now);
    const expiredDocument = createDocumentRecord({ assetKind: 'drone', assetId: state.selectedDroneId, title: 'Страховка', documentType: 'Страховка', expiresOn: '2026-07-20' }, now);

    expect(getFleetReadiness({ ...state, maintenanceTasks: [task] }, now).status).toBe('attention');
    expect(getFleetReadiness({ ...state, incidents: [incident] }, now).status).toBe('blocked');
    expect(getFleetReadiness({ ...state, documents: [expiredDocument] }, now).status).toBe('blocked');
    expect(setMaintenanceTaskStatus(task, 'completed', now).completedAt).toBe(now.toISOString());
    expect(setIncidentStatus(incident, 'resolved', now).resolvedAt).toBe(now.toISOString());
  });
});
