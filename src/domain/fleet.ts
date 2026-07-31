import type { FlightAnalysis } from '../analytics/telemetry';

export type AssetTone = 'good' | 'warning' | 'critical';
export type AssetKind = 'drone' | 'battery';
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type IncidentSeverity = 'info' | 'warning' | 'critical';
export type IncidentStatus = 'open' | 'resolved';
export type ChecklistPhase = 'preflight' | 'postflight';

export interface AssetPassport {
  registrationNumber?: string;
  serialNumber?: string;
  owner?: string;
  acquiredOn?: string;
  note?: string;
  updatedAt?: string;
}

export interface DroneAsset {
  id: string;
  name: string;
  model: string;
  status: string;
  health: number | null;
  flightHours: string | null;
  assignedBatteryId?: string;
  tone: AssetTone;
  passport?: AssetPassport;
}

export interface BatteryAsset {
  id: string;
  label: string;
  health: number | null;
  cycles: number | null;
  status: string;
  issue: string;
  tone: AssetTone;
  passport?: AssetPassport;
}

export interface MaintenanceTask {
  id: string;
  assetKind?: AssetKind;
  assetId?: string;
  title: string;
  dueDate?: string;
  status: TaskStatus;
  responsible?: string;
  note?: string;
  completionNote?: string;
  createdAt: string;
  completedAt?: string;
}

export interface MaintenanceSchedule {
  id: string;
  assetKind?: AssetKind;
  assetId?: string;
  title: string;
  nextDueDate?: string;
  intervalDays?: number;
  responsible?: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface IncidentRecord {
  id: string;
  assetKind?: AssetKind;
  assetId?: string;
  title: string;
  description?: string;
  severity: IncidentSeverity;
  occurredOn: string;
  flightId?: string;
  status: IncidentStatus;
  createdAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

export interface DocumentRecord {
  id: string;
  assetKind?: AssetKind;
  assetId?: string;
  title: string;
  documentType: string;
  expiresOn?: string;
  reference?: string;
  createdAt: string;
}

export interface ChecklistRun {
  id: string;
  flightId: string;
  phase: ChecklistPhase;
  answers: Record<string, boolean>;
  note?: string;
  completedAt: string;
}

export interface ManualFlightEntry {
  id: string;
  flightDate: string;
  droneId: string;
  batteryId?: string;
  pilot: string;
  purpose: string;
  durationMin: number;
  location?: string;
  note?: string;
  createdAt: string;
}

export interface FleetReadiness {
  status: 'ready' | 'attention' | 'blocked';
  label: string;
  facts: string[];
}

export interface OperationalReportFilters {
  from?: string;
  to?: string;
  assetKind?: AssetKind;
  assetId?: string;
}

export interface OperationalReportSummary {
  flights: ManualFlightEntry[];
  tasks: MaintenanceTask[];
  schedules: MaintenanceSchedule[];
  incidents: IncidentRecord[];
  documents: DocumentRecord[];
  checklistRuns: ChecklistRun[];
  flightMinutes: number;
  openTaskCount: number;
  openIncidentCount: number;
  criticalOpenIncidentCount: number;
  incompleteChecklistFlightCount: number;
}

export type DocumentExpiryStatus = 'current' | 'expires_soon' | 'expired' | 'no_expiry';
export type MaintenanceScheduleStatus = 'current' | 'due_soon' | 'overdue' | 'no_date';

export const checklistItemIds: Record<ChecklistPhase, string[]> = {
  preflight: ['airframe', 'battery', 'airspace', 'mission'],
  postflight: ['inspection', 'batteryRemoved', 'notes', 'storage'],
};

export function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface FileOriginNote {
  source?: string;
  flightDate?: string;
  scenario?: string;
  hiddenData?: string;
}

export interface SavedTelemetryImport {
  id: string;
  sourceName: string;
  importedAt: string;
  droneId: string;
  batteryId: string;
  sourceKind: FlightAnalysis['parsed']['sourceKind'];
  capability: FlightAnalysis['importProfile']['capability'];
  qualityScore: number;
  qualityLevel: FlightAnalysis['quality']['level'];
  alertCount: number;
  criticalAlertCount: number;
  limitation: string;
  originNote?: FileOriginNote;
  analysis: FlightAnalysis;
}

export interface PendingTelemetryImport {
  id: string;
  sourceName: string;
  importedAt: string;
  droneId: string;
  batteryId: string;
  sourceKind: FlightAnalysis['parsed']['sourceKind'];
  reason: string;
  nextStep: string;
  originNote?: FileOriginNote;
}

export interface FleetState {
  drones: DroneAsset[];
  batteries: BatteryAsset[];
  imports: SavedTelemetryImport[];
  pendingImports: PendingTelemetryImport[];
  maintenanceTasks: MaintenanceTask[];
  maintenanceSchedules: MaintenanceSchedule[];
  incidents: IncidentRecord[];
  documents: DocumentRecord[];
  manualFlights: ManualFlightEntry[];
  checklistRuns: ChecklistRun[];
  selectedDroneId: string;
  selectedBatteryId: string;
}

export const FLEET_STORAGE_KEY = 'puls-bvs-fleet-state';

export const defaultDrones: DroneAsset[] = [
  { id: 'drone-avata-2', name: 'Avata 2', model: 'DJI Avata 2', status: 'Журнал не добавлен', health: null, flightHours: null, tone: 'warning' },
  { id: 'drone-avata-360', name: 'Avata 360', model: 'DJI Avata 360', status: 'Журнал не добавлен', health: null, flightHours: null, tone: 'warning' },
  { id: 'drone-mini-4-pro', name: 'Mini 4 Pro', model: 'DJI Mini 4 Pro', status: 'Журнал не добавлен', health: null, flightHours: null, tone: 'warning' },
];

export const defaultBatteries: BatteryAsset[] = [
  { id: 'battery-not-specified', label: 'Батарея не указана', health: null, cycles: null, status: 'Добавьте батарею', issue: 'Циклы и состояние не подтверждены', tone: 'warning' },
];

export function createDefaultFleetState(): FleetState {
  return {
    drones: defaultDrones,
    batteries: defaultBatteries,
    imports: [],
    pendingImports: [],
    maintenanceTasks: [],
    maintenanceSchedules: [],
    incidents: [],
    documents: [],
    manualFlights: [],
    checklistRuns: [],
    selectedDroneId: defaultDrones[0].id,
    selectedBatteryId: defaultBatteries[0].id,
  };
}

export function loadFleetState(storage?: Pick<Storage, 'getItem'>): FleetState {
  const fallback = createDefaultFleetState();
  try {
    const raw = (storage ?? localStorage).getItem(FLEET_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<FleetState>;
    const drones = Array.isArray(parsed.drones) && parsed.drones.length ? parsed.drones : fallback.drones;
    const batteries = Array.isArray(parsed.batteries) && parsed.batteries.length ? parsed.batteries : fallback.batteries;
    return {
      drones,
      batteries,
      imports: Array.isArray(parsed.imports) ? parsed.imports : [],
      pendingImports: Array.isArray(parsed.pendingImports) ? parsed.pendingImports : [],
      maintenanceTasks: Array.isArray(parsed.maintenanceTasks) ? parsed.maintenanceTasks : [],
      maintenanceSchedules: Array.isArray(parsed.maintenanceSchedules) ? parsed.maintenanceSchedules : [],
      incidents: Array.isArray(parsed.incidents) ? parsed.incidents : [],
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
      manualFlights: Array.isArray(parsed.manualFlights) ? parsed.manualFlights : [],
      checklistRuns: Array.isArray(parsed.checklistRuns) ? parsed.checklistRuns : [],
      selectedDroneId: parsed.selectedDroneId && drones.some((drone) => drone.id === parsed.selectedDroneId) ? parsed.selectedDroneId : drones[0].id,
      selectedBatteryId: parsed.selectedBatteryId && batteries.some((battery) => battery.id === parsed.selectedBatteryId) ? parsed.selectedBatteryId : batteries[0].id,
    };
  } catch {
    return fallback;
  }
}

export function saveFleetState(state: FleetState, storage?: Pick<Storage, 'setItem'>) {
  try {
    (storage ?? localStorage).setItem(FLEET_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function createDroneAsset(name: string, model = 'DJI Mini 4 Pro'): DroneAsset {
  const safeName = name.trim() || `Дрон ${new Date().toLocaleTimeString('ru-RU')}`;
  return {
    id: `drone-${Date.now()}`,
    name: safeName,
    model: model.trim() || 'DJI Mini 4 Pro',
    status: 'Журнал не добавлен',
    health: null,
    flightHours: null,
    tone: 'warning',
  };
}

export function createBatteryAsset(label: string): BatteryAsset {
  const safeLabel = label.trim() || `BT-${Math.floor(Date.now() % 1000).toString().padStart(3, '0')}`;
  return {
    id: safeLabel,
    label: safeLabel,
    health: null,
    cycles: null,
    status: 'Журнал не добавлен',
    issue: 'Циклы и состояние не подтверждены',
    tone: 'warning',
  };
}

function createId(prefix: string, now = new Date()) {
  return `${prefix}-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function updateAssetPassport<T extends DroneAsset | BatteryAsset>(asset: T, passport: AssetPassport, now = new Date()): T {
  const clean = Object.fromEntries(Object.entries(passport).map(([key, value]) => [key, value?.trim()]).filter(([, value]) => Boolean(value)));
  return { ...asset, passport: { ...clean, updatedAt: now.toISOString() } } as T;
}

export function createMaintenanceTask(input: Omit<MaintenanceTask, 'id' | 'createdAt' | 'completedAt' | 'status'> & { status?: TaskStatus }, now = new Date()): MaintenanceTask {
  return {
    ...input,
    id: createId('maintenance', now),
    title: input.title.trim() || 'Задача обслуживания',
    responsible: input.responsible?.trim() || undefined,
    note: input.note?.trim() || undefined,
    completionNote: input.completionNote?.trim() || undefined,
    dueDate: input.dueDate || undefined,
    status: input.status ?? 'open',
    createdAt: now.toISOString(),
  };
}

export function setMaintenanceTaskStatus(task: MaintenanceTask, status: TaskStatus, now = new Date()): MaintenanceTask {
  return { ...task, status, completedAt: status === 'completed' ? now.toISOString() : undefined };
}

export function updateMaintenanceTask(task: MaintenanceTask, update: Partial<Omit<MaintenanceTask, 'id' | 'createdAt' | 'completedAt'>>, now = new Date()): MaintenanceTask {
  const next = { ...task, ...update };
  return {
    ...next,
    title: next.title.trim() || 'Задача обслуживания',
    responsible: next.responsible?.trim() || undefined,
    note: next.note?.trim() || undefined,
    completionNote: next.completionNote?.trim() || undefined,
    dueDate: next.dueDate || undefined,
    completedAt: next.status === 'completed' ? task.completedAt ?? now.toISOString() : undefined,
  };
}

export function removeMaintenanceTask(state: FleetState, taskId: string): FleetState {
  return { ...state, maintenanceTasks: state.maintenanceTasks.filter((task) => task.id !== taskId) };
}

function cleanIntervalDays(value?: number) {
  const interval = Math.floor(Number(value));
  return Number.isFinite(interval) && interval > 0 ? interval : undefined;
}

function cleanCalendarDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? value : undefined;
}

export function createMaintenanceSchedule(input: Omit<MaintenanceSchedule, 'id' | 'createdAt' | 'updatedAt'>, now = new Date()): MaintenanceSchedule {
  return {
    ...input,
    id: createId('maintenance-schedule', now),
    title: input.title.trim() || 'Регламент обслуживания',
    nextDueDate: cleanCalendarDate(input.nextDueDate),
    intervalDays: cleanIntervalDays(input.intervalDays),
    responsible: input.responsible?.trim() || undefined,
    note: input.note?.trim() || undefined,
    createdAt: now.toISOString(),
  };
}

export function updateMaintenanceSchedule(schedule: MaintenanceSchedule, update: Partial<Omit<MaintenanceSchedule, 'id' | 'createdAt' | 'updatedAt'>>, now = new Date()): MaintenanceSchedule {
  const next = { ...schedule, ...update };
  return {
    ...next,
    title: next.title.trim() || 'Регламент обслуживания',
    nextDueDate: cleanCalendarDate(next.nextDueDate),
    intervalDays: cleanIntervalDays(next.intervalDays),
    responsible: next.responsible?.trim() || undefined,
    note: next.note?.trim() || undefined,
    updatedAt: now.toISOString(),
  };
}

export function removeMaintenanceSchedule(state: FleetState, scheduleId: string): FleetState {
  return { ...state, maintenanceSchedules: state.maintenanceSchedules.filter((schedule) => schedule.id !== scheduleId) };
}

export function createIncidentRecord(input: Omit<IncidentRecord, 'id' | 'createdAt' | 'resolvedAt' | 'status'> & { status?: IncidentStatus }, now = new Date()): IncidentRecord {
  return {
    ...input,
    id: createId('incident', now),
    title: input.title.trim() || 'Наблюдение без названия',
    description: input.description?.trim() || undefined,
    flightId: input.flightId || undefined,
    occurredOn: input.occurredOn || toLocalDateKey(now),
    status: input.status ?? 'open',
    createdAt: now.toISOString(),
  };
}

export function setIncidentStatus(incident: IncidentRecord, status: IncidentStatus, now = new Date()): IncidentRecord {
  return { ...incident, status, resolvedAt: status === 'resolved' ? now.toISOString() : undefined };
}

export function updateIncidentRecord(incident: IncidentRecord, update: Partial<Omit<IncidentRecord, 'id' | 'createdAt' | 'resolvedAt'>>, now = new Date()): IncidentRecord {
  const next = { ...incident, ...update };
  return {
    ...next,
    title: next.title.trim() || 'Наблюдение без названия',
    description: next.description?.trim() || undefined,
    flightId: next.flightId || undefined,
    resolutionNote: next.resolutionNote?.trim() || undefined,
    occurredOn: next.occurredOn || toLocalDateKey(now),
    resolvedAt: next.status === 'resolved' ? incident.resolvedAt ?? now.toISOString() : undefined,
  };
}

export function removeIncidentRecord(state: FleetState, incidentId: string): FleetState {
  return { ...state, incidents: state.incidents.filter((incident) => incident.id !== incidentId) };
}

export function createDocumentRecord(input: Omit<DocumentRecord, 'id' | 'createdAt'>, now = new Date()): DocumentRecord {
  return {
    ...input,
    id: createId('document', now),
    title: input.title.trim() || 'Документ без названия',
    documentType: input.documentType.trim() || 'Другой документ',
    reference: input.reference?.trim() || undefined,
    expiresOn: input.expiresOn || undefined,
    createdAt: now.toISOString(),
  };
}

export function updateDocumentRecord(document: DocumentRecord, update: Partial<Omit<DocumentRecord, 'id' | 'createdAt'>>): DocumentRecord {
  const next = { ...document, ...update };
  return {
    ...next,
    title: next.title.trim() || 'Документ без названия',
    documentType: next.documentType.trim() || 'Другой документ',
    reference: next.reference?.trim() || undefined,
    expiresOn: next.expiresOn || undefined,
  };
}

export function removeDocumentRecord(state: FleetState, documentId: string): FleetState {
  return { ...state, documents: state.documents.filter((document) => document.id !== documentId) };
}

export function createManualFlightEntry(input: Omit<ManualFlightEntry, 'id' | 'createdAt'>, now = new Date()): ManualFlightEntry {
  return {
    ...input,
    id: createId('manual-flight', now),
    flightDate: input.flightDate || toLocalDateKey(now),
    pilot: input.pilot.trim() || 'Пилот не указан',
    purpose: input.purpose.trim() || 'Рабочий вылет',
    durationMin: Math.max(0, Number(input.durationMin) || 0),
    location: input.location?.trim() || undefined,
    note: input.note?.trim() || undefined,
    createdAt: now.toISOString(),
  };
}

export function updateManualFlightEntry(flight: ManualFlightEntry, update: Partial<Omit<ManualFlightEntry, 'id' | 'createdAt'>>, now = new Date()): ManualFlightEntry {
  const next = { ...flight, ...update };
  return {
    ...next,
    flightDate: next.flightDate || toLocalDateKey(now),
    pilot: next.pilot.trim() || 'Пилот не указан',
    purpose: next.purpose.trim() || 'Рабочий вылет',
    durationMin: Math.max(0, Number(next.durationMin) || 0),
    batteryId: next.batteryId || undefined,
    location: next.location?.trim() || undefined,
    note: next.note?.trim() || undefined,
  };
}

export function removeManualFlightEntry(state: FleetState, flightId: string): FleetState {
  return {
    ...state,
    manualFlights: state.manualFlights.filter((flight) => flight.id !== flightId),
    checklistRuns: state.checklistRuns.filter((run) => run.flightId !== flightId),
    incidents: state.incidents.map((incident) => incident.flightId === flightId ? { ...incident, flightId: undefined } : incident),
  };
}

export function isChecklistComplete(phase: ChecklistPhase, answers: Record<string, boolean>) {
  return checklistItemIds[phase].every((id) => answers[id] === true);
}

export function createChecklistRun(input: Omit<ChecklistRun, 'id' | 'completedAt'>, now = new Date()): ChecklistRun | null {
  if (!input.flightId || !isChecklistComplete(input.phase, input.answers)) return null;
  return {
    ...input,
    id: createId('checklist', now),
    note: input.note?.trim() || undefined,
    completedAt: now.toISOString(),
  };
}

export function updateChecklistRun(run: ChecklistRun, input: Omit<ChecklistRun, 'id' | 'completedAt'>, now = new Date()): ChecklistRun | null {
  if (run.flightId !== input.flightId || run.phase !== input.phase || !isChecklistComplete(input.phase, input.answers)) return null;
  return { ...run, answers: input.answers, note: input.note?.trim() || undefined, completedAt: now.toISOString() };
}

export function getManualFlightMinutes(flights: ManualFlightEntry[], droneId?: string) {
  return flights.filter((flight) => !droneId || flight.droneId === droneId).reduce((total, flight) => total + flight.durationMin, 0);
}

function isWithinPeriod(date: string | undefined, filters: OperationalReportFilters) {
  return Boolean(date && (!filters.from || date >= filters.from) && (!filters.to || date <= filters.to));
}

function matchesAsset(item: Pick<MaintenanceTask, 'assetKind' | 'assetId'>, filters: OperationalReportFilters) {
  if (!filters.assetId) return true;
  return item.assetKind === filters.assetKind && item.assetId === filters.assetId;
}

export function getOperationalReportSummary(state: FleetState, filters: OperationalReportFilters = {}): OperationalReportSummary {
  const flights = state.manualFlights.filter((flight) => isWithinPeriod(flight.flightDate, filters) && (!filters.assetId || (filters.assetKind === 'drone' && flight.droneId === filters.assetId) || (filters.assetKind === 'battery' && flight.batteryId === filters.assetId)));
  const flightIds = new Set(flights.map((flight) => flight.id));
  const tasks = state.maintenanceTasks.filter((task) => matchesAsset(task, filters) && isWithinPeriod(task.createdAt.slice(0, 10), filters));
  const schedules = state.maintenanceSchedules.filter((schedule) => matchesAsset(schedule, filters) && (!filters.from && !filters.to || isWithinPeriod(schedule.nextDueDate, filters)));
  const incidents = state.incidents.filter((incident) => matchesAsset(incident, filters) && isWithinPeriod(incident.occurredOn, filters));
  const documents = state.documents.filter((document) => matchesAsset(document, filters) && isWithinPeriod(document.createdAt.slice(0, 10), filters));
  const checklistRuns = state.checklistRuns.filter((run) => flightIds.has(run.flightId));
  const completedChecklists = new Set(checklistRuns.map((run) => `${run.flightId}:${run.phase}`));
  const incompleteChecklistFlightCount = flights.filter((flight) => !completedChecklists.has(`${flight.id}:preflight`) || !completedChecklists.has(`${flight.id}:postflight`)).length;
  const openIncidents = incidents.filter((incident) => incident.status === 'open');

  return {
    flights,
    tasks,
    schedules,
    incidents,
    documents,
    checklistRuns,
    flightMinutes: getManualFlightMinutes(flights),
    openTaskCount: tasks.filter((task) => task.status !== 'completed' && task.status !== 'cancelled').length,
    openIncidentCount: openIncidents.length,
    criticalOpenIncidentCount: openIncidents.filter((incident) => incident.severity === 'critical').length,
    incompleteChecklistFlightCount,
  };
}

export function getDocumentExpiryStatus(document: DocumentRecord, now = new Date()): DocumentExpiryStatus {
  if (!document.expiresOn) return 'no_expiry';
  const today = toLocalDateKey(now);
  const inThirtyDays = toLocalDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30));
  if (document.expiresOn < today) return 'expired';
  if (document.expiresOn <= inThirtyDays) return 'expires_soon';
  return 'current';
}

export function getMaintenanceScheduleStatus(schedule: MaintenanceSchedule, now = new Date()): MaintenanceScheduleStatus {
  if (!schedule.nextDueDate) return 'no_date';
  const today = toLocalDateKey(now);
  const inThirtyDays = toLocalDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30));
  if (schedule.nextDueDate < today) return 'overdue';
  if (schedule.nextDueDate <= inThirtyDays) return 'due_soon';
  return 'current';
}

function isDueOnOrBefore(date: string | undefined, today: string) {
  return Boolean(date && date <= today);
}

export function getFleetReadiness(state: FleetState, now = new Date()): FleetReadiness {
  const today = toLocalDateKey(now);
  const overdueTasks = state.maintenanceTasks.filter((task) => task.status !== 'completed' && task.status !== 'cancelled' && isDueOnOrBefore(task.dueDate, today));
  const criticalIncidents = state.incidents.filter((item) => item.status === 'open' && item.severity === 'critical');
  const warningIncidents = state.incidents.filter((item) => item.status === 'open' && item.severity === 'warning');
  const expiredDocuments = state.documents.filter((item) => getDocumentExpiryStatus(item, now) === 'expired');
  const expiringDocuments = state.documents.filter((item) => getDocumentExpiryStatus(item, now) === 'expires_soon');
  const incompleteChecklistFlightCount = getOperationalReportSummary(state).incompleteChecklistFlightCount;
  const facts = [
    overdueTasks.length ? `Открытых задач со сроком: ${overdueTasks.length}` : '',
    criticalIncidents.length ? `Незакрытых критичных событий: ${criticalIncidents.length}` : '',
    warningIncidents.length ? `Незакрытых событий, требующих внимания: ${warningIncidents.length}` : '',
    expiredDocuments.length ? `Просроченных документов: ${expiredDocuments.length}` : '',
    expiringDocuments.length ? `Документов истекают в ближайшие 30 дней: ${expiringDocuments.length}` : '',
    incompleteChecklistFlightCount ? `Ручных записей с незавершёнными чек-листами: ${incompleteChecklistFlightCount}` : '',
  ].filter(Boolean);

  if (criticalIncidents.length || expiredDocuments.length) return { status: 'blocked', label: 'Требует решения', facts };
  if (overdueTasks.length || warningIncidents.length || expiringDocuments.length || incompleteChecklistFlightCount) return { status: 'attention', label: 'Нужно внимание', facts };
  return { status: 'ready', label: 'Нет зафиксированных ограничений', facts: ['Нет открытых критичных событий, просроченных задач и документов.'] };
}

export function canPersistImport(analysis: FlightAnalysis) {
  return (analysis.parsed.sourceKind === 'csv' || analysis.parsed.sourceKind === 'kml') && analysis.parsed.rows.length > 0;
}

function cleanOriginNote(note?: FileOriginNote): FileOriginNote | undefined {
  if (!note) return undefined;
  const cleaned = {
    source: note.source?.trim(),
    flightDate: note.flightDate?.trim(),
    scenario: note.scenario?.trim(),
    hiddenData: note.hiddenData?.trim(),
  };
  return Object.values(cleaned).some(Boolean) ? cleaned : undefined;
}

export function createSavedImport(analysis: FlightAnalysis, droneId: string, batteryId: string, now = new Date(), originNote?: FileOriginNote): SavedTelemetryImport | null {
  if (!canPersistImport(analysis)) return null;
  const criticalAlertCount = analysis.alerts.filter((alert) => alert.severity === 'critical').length;
  return {
    id: `import-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    sourceName: analysis.parsed.sourceName,
    importedAt: now.toISOString(),
    droneId,
    batteryId,
    sourceKind: analysis.parsed.sourceKind,
    capability: analysis.importProfile.capability,
    qualityScore: analysis.quality.score,
    qualityLevel: analysis.quality.level,
    alertCount: analysis.alerts.length,
    criticalAlertCount,
    limitation: analysis.importProfile.verdict,
    originNote: cleanOriginNote(originNote),
    analysis,
  };
}

export function createPendingImport(analysis: FlightAnalysis, droneId: string, batteryId: string, now = new Date(), originNote?: FileOriginNote): PendingTelemetryImport | null {
  if (canPersistImport(analysis)) return null;
  return {
    id: `pending-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    sourceName: analysis.parsed.sourceName,
    importedAt: now.toISOString(),
    droneId,
    batteryId,
    sourceKind: analysis.parsed.sourceKind,
    reason: analysis.parsed.notice ?? analysis.importProfile.verdict,
    nextStep: 'Сохраните исходный файл у себя в закрытой папке, уберите лишние чувствительные данные из копии и проверьте, какие данные можно прочитать.',
    originNote: cleanOriginNote(originNote),
  };
}

export function upsertImport(state: FleetState, savedImport: SavedTelemetryImport): FleetState {
  return { ...state, imports: [savedImport, ...state.imports.filter((item) => item.id !== savedImport.id)].slice(0, 50) };
}

export function upsertPendingImport(state: FleetState, pendingImport: PendingTelemetryImport): FleetState {
  return { ...state, pendingImports: [pendingImport, ...state.pendingImports.filter((item) => item.id !== pendingImport.id)].slice(0, 50) };
}
