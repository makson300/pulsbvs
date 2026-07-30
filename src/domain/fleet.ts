import type { FlightAnalysis } from '../analytics/telemetry';

export type AssetTone = 'good' | 'warning' | 'critical';

export interface DroneAsset {
  id: string;
  name: string;
  model: string;
  status: string;
  health: number | null;
  flightHours: string | null;
  assignedBatteryId?: string;
  tone: AssetTone;
}

export interface BatteryAsset {
  id: string;
  label: string;
  health: number | null;
  cycles: number | null;
  status: string;
  issue: string;
  tone: AssetTone;
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
}

export interface FleetState {
  drones: DroneAsset[];
  batteries: BatteryAsset[];
  imports: SavedTelemetryImport[];
  pendingImports: PendingTelemetryImport[];
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
    selectedDroneId: defaultDrones[0].id,
    selectedBatteryId: defaultBatteries[0].id,
  };
}

export function loadFleetState(storage: Pick<Storage, 'getItem'> = localStorage): FleetState {
  const fallback = createDefaultFleetState();
  try {
    const raw = storage.getItem(FLEET_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<FleetState>;
    const drones = Array.isArray(parsed.drones) && parsed.drones.length ? parsed.drones : fallback.drones;
    const batteries = Array.isArray(parsed.batteries) && parsed.batteries.length ? parsed.batteries : fallback.batteries;
    return {
      drones,
      batteries,
      imports: Array.isArray(parsed.imports) ? parsed.imports : [],
      pendingImports: Array.isArray(parsed.pendingImports) ? parsed.pendingImports : [],
      selectedDroneId: parsed.selectedDroneId && drones.some((drone) => drone.id === parsed.selectedDroneId) ? parsed.selectedDroneId : drones[0].id,
      selectedBatteryId: parsed.selectedBatteryId && batteries.some((battery) => battery.id === parsed.selectedBatteryId) ? parsed.selectedBatteryId : batteries[0].id,
    };
  } catch {
    return fallback;
  }
}

export function saveFleetState(state: FleetState, storage: Pick<Storage, 'setItem'> = localStorage) {
  storage.setItem(FLEET_STORAGE_KEY, JSON.stringify(state));
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

export function canPersistImport(analysis: FlightAnalysis) {
  return analysis.parsed.sourceKind !== 'unsupported';
}

export function createSavedImport(analysis: FlightAnalysis, droneId: string, batteryId: string, now = new Date()): SavedTelemetryImport | null {
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
    analysis,
  };
}

export function createPendingImport(analysis: FlightAnalysis, droneId: string, batteryId: string, now = new Date()): PendingTelemetryImport | null {
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
  };
}

export function upsertImport(state: FleetState, savedImport: SavedTelemetryImport): FleetState {
  return { ...state, imports: [savedImport, ...state.imports.filter((item) => item.id !== savedImport.id)].slice(0, 50) };
}

export function upsertPendingImport(state: FleetState, pendingImport: PendingTelemetryImport): FleetState {
  return { ...state, pendingImports: [pendingImport, ...state.pendingImports.filter((item) => item.id !== pendingImport.id)].slice(0, 50) };
}
