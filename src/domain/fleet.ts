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
  note?: string;
  createdAt: string;
  completedAt?: string;
}

export interface IncidentRecord {
  id: string;
  assetKind?: AssetKind;
  assetId?: string;
  title: string;
  description?: string;
  severity: IncidentSeverity;
  occurredOn: string;
  status: IncidentStatus;
  createdAt: string;
  resolvedAt?: string;
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

export type DocumentExpiryStatus = 'current' | 'expires_soon' | 'expired' | 'no_expiry';

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
    note: input.note?.trim() || undefined,
    dueDate: input.dueDate || undefined,
    status: input.status ?? 'open',
    createdAt: now.toISOString(),
  };
}

export function setMaintenanceTaskStatus(task: MaintenanceTask, status: TaskStatus, now = new Date()): MaintenanceTask {
  return { ...task, status, completedAt: status === 'completed' ? now.toISOString() : undefined };
}

export function createIncidentRecord(input: Omit<IncidentRecord, 'id' | 'createdAt' | 'resolvedAt' | 'status'> & { status?: IncidentStatus }, now = new Date()): IncidentRecord {
  return {
    ...input,
    id: createId('incident', now),
    title: input.title.trim() || 'Наблюдение без названия',
    description: input.description?.trim() || undefined,
    occurredOn: input.occurredOn || toLocalDateKey(now),
    status: input.status ?? 'open',
    createdAt: now.toISOString(),
  };
}

export function setIncidentStatus(incident: IncidentRecord, status: IncidentStatus, now = new Date()): IncidentRecord {
  return { ...incident, status, resolvedAt: status === 'resolved' ? now.toISOString() : undefined };
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

export function getManualFlightMinutes(flights: ManualFlightEntry[], droneId?: string) {
  return flights.filter((flight) => !droneId || flight.droneId === droneId).reduce((total, flight) => total + flight.durationMin, 0);
}

export function getDocumentExpiryStatus(document: DocumentRecord, now = new Date()): DocumentExpiryStatus {
  if (!document.expiresOn) return 'no_expiry';
  const today = toLocalDateKey(now);
  const inThirtyDays = toLocalDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30));
  if (document.expiresOn < today) return 'expired';
  if (document.expiresOn <= inThirtyDays) return 'expires_soon';
  return 'current';
}

function isDueOnOrBefore(date: string | undefined, today: string) {
  return Boolean(date && date <= today);
}

export function getFleetReadiness(state: FleetState, now = new Date()): FleetReadiness {
  const today = toLocalDateKey(now);
  const overdueTasks = state.maintenanceTasks.filter((task) => task.status !== 'completed' && task.status !== 'cancelled' && isDueOnOrBefore(task.dueDate, today));
  const criticalIncidents = state.incidents.filter((item) => item.status === 'open' && item.severity === 'critical');
  const expiredDocuments = state.documents.filter((item) => getDocumentExpiryStatus(item, now) === 'expired');
  const expiringDocuments = state.documents.filter((item) => getDocumentExpiryStatus(item, now) === 'expires_soon');
  const facts = [
    overdueTasks.length ? `Открытых задач со сроком: ${overdueTasks.length}` : '',
    criticalIncidents.length ? `Незакрытых критичных событий: ${criticalIncidents.length}` : '',
    expiredDocuments.length ? `Просроченных документов: ${expiredDocuments.length}` : '',
    expiringDocuments.length ? `Документов истекают в ближайшие 30 дней: ${expiringDocuments.length}` : '',
  ].filter(Boolean);

  if (criticalIncidents.length || expiredDocuments.length) return { status: 'blocked', label: 'Требует решения', facts };
  if (overdueTasks.length || expiringDocuments.length) return { status: 'attention', label: 'Нужно внимание', facts };
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
