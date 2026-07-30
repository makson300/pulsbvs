import type { FlightAnalysis } from '../analytics/telemetry';

export type AssetTone = 'good' | 'warning' | 'critical';

export interface DroneAsset {
  id: string;
  name: string;
  model: string;
  status: string;
  health: number;
  flightHours: string;
  assignedBatteryId?: string;
  tone: AssetTone;
}

export interface BatteryAsset {
  id: string;
  label: string;
  health: number;
  cycles: number;
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

export interface FleetState {
  drones: DroneAsset[];
  batteries: BatteryAsset[];
  imports: SavedTelemetryImport[];
  selectedDroneId: string;
  selectedBatteryId: string;
}

export const FLEET_STORAGE_KEY = 'puls-bvs-fleet-state';

export const defaultDrones: DroneAsset[] = [
  { id: 'drone-t40-01', name: 'Agras T40 №01', model: 'DJI Agras T40', status: 'Готов', health: 96, flightHours: '42,1 ч', assignedBatteryId: 'BT-014', tone: 'good' },
  { id: 'drone-t40-02', name: 'Agras T40 №02', model: 'DJI Agras T40', status: 'Ограничить', health: 78, flightHours: '38,4 ч', assignedBatteryId: 'BT-009', tone: 'warning' },
  { id: 'drone-t40-03', name: 'Agras T40 №03', model: 'DJI Agras T40', status: 'На ТО', health: 61, flightHours: '51,8 ч', tone: 'critical' },
  { id: 'drone-mini-01', name: 'Mini 4 Pro', model: 'DJI Mini 4 Pro', status: 'Тест логов', health: 93, flightHours: '6,2 ч', assignedBatteryId: 'INT-01', tone: 'good' },
];

export const defaultBatteries: BatteryAsset[] = [
  { id: 'BT-014', label: 'BT-014', health: 74, cycles: 86, status: 'Проверить', issue: 'Просадка напряжения выше нормы', tone: 'warning' },
  { id: 'BT-009', label: 'BT-009', health: 88, cycles: 64, status: 'Готова', issue: 'Отклонений нет', tone: 'good' },
  { id: 'BT-021', label: 'BT-021', health: 52, cycles: 112, status: 'Не использовать', issue: 'Разбаланс ячеек 0.11 В', tone: 'critical' },
  { id: 'INT-01', label: 'INT-01', health: 93, cycles: 19, status: 'Тест', issue: 'Mini 4 Pro для проверки импорта', tone: 'good' },
];

export function createDefaultFleetState(): FleetState {
  return {
    drones: defaultDrones,
    batteries: defaultBatteries,
    imports: [],
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

export function createDroneAsset(name: string, model = 'DJI Agras T40'): DroneAsset {
  const safeName = name.trim() || `Дрон ${new Date().toLocaleTimeString('ru-RU')}`;
  return {
    id: `drone-${Date.now()}`,
    name: safeName,
    model: model.trim() || 'DJI Agras T40',
    status: 'Новый',
    health: 100,
    flightHours: '0 ч',
    tone: 'good',
  };
}

export function createBatteryAsset(label: string): BatteryAsset {
  const safeLabel = label.trim() || `BT-${Math.floor(Date.now() % 1000).toString().padStart(3, '0')}`;
  return {
    id: safeLabel,
    label: safeLabel,
    health: 100,
    cycles: 0,
    status: 'Новая',
    issue: 'История ещё не накоплена',
    tone: 'good',
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

export function upsertImport(state: FleetState, savedImport: SavedTelemetryImport): FleetState {
  return { ...state, imports: [savedImport, ...state.imports.filter((item) => item.id !== savedImport.id)].slice(0, 50) };
}
