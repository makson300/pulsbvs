import { describe, expect, it } from 'vitest';
import { analyzeTelemetry, parseTelemetryCsv, parseTelemetryFile } from '../analytics/telemetry';
import {
  createChecklistRun,
  createDefaultFleetState,
  createDocumentRecord,
  createIncidentRecord,
  createMaintenanceSchedule,
  createMaintenanceTask,
  createManualFlightEntry,
  createPendingImport,
  createSavedImport,
  getOperationalReportSummary,
  getFleetReadiness,
  getDocumentExpiryStatus,
  getMaintenanceScheduleStatus,
  getManualFlightMinutes,
  isChecklistComplete,
  toLocalDateKey,
  loadFleetState,
  saveFleetState,
  setIncidentStatus,
  setMaintenanceTaskStatus,
  removeManualFlightEntry,
  removeDocumentRecord,
  removeIncidentRecord,
  removeMaintenanceTask,
  removeMaintenanceSchedule,
  updateDocumentRecord,
  updateIncidentRecord,
  updateMaintenanceTask,
  updateMaintenanceSchedule,
  updateManualFlightEntry,
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
    expect(state.maintenanceSchedules).toEqual([]);
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
    if (!saved) throw new Error('Ожидалась поддержанная запись импорта.');
    const nextState = upsertImport(state, saved);
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
    if (!pending) throw new Error('Ожидалась запись файла в очереди проверки.');
    const nextState = upsertPendingImport(state, pending);
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
    expect(restored.maintenanceSchedules).toEqual([]);
    expect(restored.incidents).toEqual([]);
    expect(restored.documents).toEqual([]);
    expect(restored.manualFlights).toEqual([]);
    expect(restored.checklistRuns).toEqual([]);
  });

  it('creates operational records independently from telemetry and preserves manual semantics', () => {
    const state = createDefaultFleetState();
    const now = new Date('2026-07-30T10:00:00Z');
    const flight = createManualFlightEntry({ flightDate: '2026-07-30', droneId: state.selectedDroneId, batteryId: state.selectedBatteryId, pilot: 'Иван', purpose: 'Осмотр поля', durationMin: 18, location: 'Поле 7' }, now);
    const checklist = createChecklistRun({ flightId: flight.id, phase: 'preflight', answers: { airframe: true, battery: true, airspace: true, mission: true } }, now);
    const passport = updateAssetPassport(state.drones[0], { serialNumber: 'SN-001', owner: 'АгроСфера' }, now);

    expect(flight.durationMin).toBe(18);
    expect(flight.createdAt).toBe(now.toISOString());
    expect(checklist?.flightId).toBe(flight.id);
    expect(passport.passport).toMatchObject({ serialNumber: 'SN-001', owner: 'АгроСфера' });
  });

  it('requires every checklist item and totals only manual flight minutes', () => {
    const state = createDefaultFleetState();
    const now = new Date('2026-07-30T10:00:00Z');
    const flight = createManualFlightEntry({ flightDate: '2026-07-30', droneId: state.selectedDroneId, pilot: 'Иван', purpose: 'Осмотр', durationMin: 18 }, now);

    expect(isChecklistComplete('preflight', { airframe: true, battery: true, airspace: true, mission: true })).toBe(true);
    expect(createChecklistRun({ flightId: flight.id, phase: 'preflight', answers: { airframe: true } }, now)).toBeNull();
    expect(getManualFlightMinutes([flight], state.selectedDroneId)).toBe(18);
    expect(getManualFlightMinutes([flight], 'another-drone')).toBe(0);
  });

  it('updates operational records and keeps completion and resolution notes', () => {
    const state = createDefaultFleetState();
    const now = new Date('2026-07-30T10:00:00Z');
    const task = createMaintenanceTask({ title: 'Осмотр', responsible: 'Иван' }, now);
    const incident = createIncidentRecord({ title: 'Царапина', severity: 'warning', occurredOn: '2026-07-30' }, now);
    const document = createDocumentRecord({ title: 'Страховка', documentType: 'Страховка' }, now);
    const flight = createManualFlightEntry({ flightDate: '2026-07-30', droneId: state.selectedDroneId, pilot: 'Иван', purpose: 'Осмотр', durationMin: 10 }, now);

    expect(updateMaintenanceTask(task, { status: 'completed', completionNote: 'Крепления проверены' }, now)).toMatchObject({ status: 'completed', responsible: 'Иван', completionNote: 'Крепления проверены', completedAt: now.toISOString() });
    expect(updateIncidentRecord(incident, { status: 'resolved', resolutionNote: 'Осмотр завершён' }, now)).toMatchObject({ status: 'resolved', resolutionNote: 'Осмотр завершён', resolvedAt: now.toISOString() });
    expect(updateDocumentRecord(document, { expiresOn: '2027-07-30', reference: 'Полис 42' })).toMatchObject({ expiresOn: '2027-07-30', reference: 'Полис 42' });
    expect(updateManualFlightEntry(flight, { durationMin: -5, purpose: '  Проверка  ' }, now)).toMatchObject({ durationMin: 0, purpose: 'Проверка' });
    expect(removeMaintenanceTask({ ...state, maintenanceTasks: [task] }, task.id).maintenanceTasks).toEqual([]);
    expect(removeIncidentRecord({ ...state, incidents: [incident] }, incident.id).incidents).toEqual([]);
    expect(removeDocumentRecord({ ...state, documents: [document] }, document.id).documents).toEqual([]);
  });

  it('stores manual calendar maintenance schedules without creating a task', () => {
    const state = createDefaultFleetState();
    const now = new Date('2026-07-30T10:00:00Z');
    const schedule = createMaintenanceSchedule({ assetKind: 'drone', assetId: state.selectedDroneId, title: '  Плановый осмотр  ', nextDueDate: '2026-08-10', intervalDays: 30.8, responsible: '  Иван  ', note: '  Вручную по внутреннему плану  ' }, now);
    const updated = updateMaintenanceSchedule(schedule, { nextDueDate: '2026-09-10', intervalDays: 0, note: '  Перенесено вручную  ' }, now);
    const invalidDate = createMaintenanceSchedule({ title: 'Проверка даты', nextDueDate: '2026-02-30' }, now);

    expect(schedule).toMatchObject({ title: 'Плановый осмотр', intervalDays: 30, responsible: 'Иван', note: 'Вручную по внутреннему плану', createdAt: now.toISOString() });
    expect(updated).toMatchObject({ nextDueDate: '2026-09-10', intervalDays: undefined, note: 'Перенесено вручную', updatedAt: now.toISOString() });
    expect(invalidDate.nextDueDate).toBeUndefined();
    expect(removeMaintenanceSchedule({ ...state, maintenanceSchedules: [schedule] }, schedule.id).maintenanceSchedules).toEqual([]);
    expect(state.maintenanceTasks).toEqual([]);
  });

  it('removes only linked checklist runs and unlinks incidents when a manual flight is removed', () => {
    const state = createDefaultFleetState();
    const now = new Date('2026-07-30T10:00:00Z');
    const first = createManualFlightEntry({ flightDate: '2026-07-30', droneId: state.selectedDroneId, pilot: 'Иван', purpose: 'Первый', durationMin: 10 }, now);
    const second = createManualFlightEntry({ flightDate: '2026-07-30', droneId: state.selectedDroneId, pilot: 'Иван', purpose: 'Второй', durationMin: 10 }, now);
    const answers = { airframe: true, battery: true, airspace: true, mission: true };
    const linkedRun = createChecklistRun({ flightId: first.id, phase: 'preflight', answers }, now);
    const retainedRun = createChecklistRun({ flightId: second.id, phase: 'preflight', answers }, now);
    if (!linkedRun || !retainedRun) throw new Error('Ожидались заполненные чек-листы.');
    const linkedIncident = createIncidentRecord({ title: 'Наблюдение', severity: 'info', occurredOn: '2026-07-30', flightId: first.id }, now);
    const next = removeManualFlightEntry({ ...state, manualFlights: [first, second], checklistRuns: [linkedRun, retainedRun], incidents: [linkedIncident] }, first.id);

    expect(next.manualFlights).toEqual([second]);
    expect(next.checklistRuns).toEqual([retainedRun]);
    expect(next.incidents[0].flightId).toBeUndefined();
  });

  it('builds an operational report only from manual records in the selected period and asset', () => {
    const state = createDefaultFleetState();
    const now = new Date('2026-07-30T10:00:00Z');
    const selectedFlight = createManualFlightEntry({ flightDate: '2026-07-30', droneId: state.selectedDroneId, pilot: 'Иван', purpose: 'Осмотр', durationMin: 16 }, now);
    const otherFlight = createManualFlightEntry({ flightDate: '2026-07-20', droneId: 'other-drone', pilot: 'Мария', purpose: 'Тест', durationMin: 30 }, now);
    const answers = { airframe: true, battery: true, airspace: true, mission: true };
    const checklist = createChecklistRun({ flightId: selectedFlight.id, phase: 'preflight', answers }, now);
    if (!checklist) throw new Error('Ожидался заполненный чек-лист.');
    const task = createMaintenanceTask({ assetKind: 'drone', assetId: state.selectedDroneId, title: 'Осмотр' }, now);
    const schedule = createMaintenanceSchedule({ assetKind: 'drone', assetId: state.selectedDroneId, title: 'Ежемесячный осмотр' }, now);
    const incident = createIncidentRecord({ assetKind: 'drone', assetId: state.selectedDroneId, title: 'Вмятина', severity: 'warning', occurredOn: '2026-07-30', flightId: selectedFlight.id }, now);
    const summary = getOperationalReportSummary({ ...state, manualFlights: [selectedFlight, otherFlight], checklistRuns: [checklist], maintenanceTasks: [task], maintenanceSchedules: [schedule], incidents: [incident] }, { from: '2026-07-25', to: '2026-07-31', assetKind: 'drone', assetId: state.selectedDroneId });
    const unfilteredSummary = getOperationalReportSummary({ ...state, maintenanceSchedules: [schedule] });

    expect(summary.flightMinutes).toBe(16);
    expect(summary.flights).toEqual([selectedFlight]);
    expect(summary.openTaskCount).toBe(1);
    expect(summary.openIncidentCount).toBe(1);
    expect(summary.incompleteChecklistFlightCount).toBe(1);
    expect(summary.schedules).toEqual([]);
    expect(unfilteredSummary.schedules).toEqual([schedule]);
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

  it('marks incomplete manual checklists and open warning incidents as operational attention, not a block', () => {
    const state = createDefaultFleetState();
    const now = new Date('2026-07-30T10:00:00Z');
    const flight = createManualFlightEntry({ flightDate: '2026-07-30', droneId: state.selectedDroneId, pilot: 'Иван', purpose: 'Осмотр', durationMin: 10 }, now);
    const incident = createIncidentRecord({ title: 'Осмотреть винт', severity: 'warning', occurredOn: '2026-07-30' }, now);
    const readiness = getFleetReadiness({ ...state, manualFlights: [flight], incidents: [incident] }, now);

    expect(readiness.status).toBe('attention');
    expect(readiness.facts).toEqual(expect.arrayContaining(['Незакрытых событий, требующих внимания: 1', 'Ручных записей с незавершёнными чек-листами: 1']));
  });

  it('labels document expiry deterministically', () => {
    const now = new Date('2026-07-30T10:00:00Z');
    const base = { title: 'Страховка', documentType: 'Страховка' };

    expect(getDocumentExpiryStatus(createDocumentRecord({ ...base, expiresOn: '2026-07-29' }, now), now)).toBe('expired');
    expect(getDocumentExpiryStatus(createDocumentRecord({ ...base, expiresOn: '2026-08-10' }, now), now)).toBe('expires_soon');
    expect(getDocumentExpiryStatus(createDocumentRecord({ ...base, expiresOn: '2026-09-10' }, now), now)).toBe('current');
    expect(getDocumentExpiryStatus(createDocumentRecord(base, now), now)).toBe('no_expiry');
  });

  it('labels manual calendar schedule dates without treating them as readiness facts', () => {
    const state = createDefaultFleetState();
    const now = new Date('2026-07-30T10:00:00Z');
    const base = { title: 'Плановый осмотр' };
    const overdue = createMaintenanceSchedule({ ...base, nextDueDate: '2026-07-29' }, now);
    const dueSoon = createMaintenanceSchedule({ ...base, nextDueDate: '2026-08-10' }, now);
    const current = createMaintenanceSchedule({ ...base, nextDueDate: '2026-09-10' }, now);
    const noDate = createMaintenanceSchedule(base, now);

    expect(getMaintenanceScheduleStatus(overdue, now)).toBe('overdue');
    expect(getMaintenanceScheduleStatus(dueSoon, now)).toBe('due_soon');
    expect(getMaintenanceScheduleStatus(current, now)).toBe('current');
    expect(getMaintenanceScheduleStatus(noDate, now)).toBe('no_date');
    expect(getFleetReadiness({ ...state, maintenanceSchedules: [overdue] }, now).status).toBe('ready');
  });

  it('uses a local calendar date instead of UTC when setting operational dates', () => {
    const localLateEvening = new Date(2026, 6, 30, 23, 30);

    expect(toLocalDateKey(localLateEvening)).toBe('2026-07-30');
  });
});
