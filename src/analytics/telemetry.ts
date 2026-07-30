import { assessBattery, type BatteryAssessment, type BatterySnapshot, type RiskAlert } from './batteryRisk';

export interface TelemetryPoint {
  timestamp?: string;
  latitude?: number;
  longitude?: number;
  altitudeM?: number;
  speedMps?: number;
  batteryPercent?: number;
  packVoltage?: number;
  batteryCurrentA?: number;
  batteryTemperatureC?: number;
  cellVoltages?: number[];
  warning?: string;
}

export interface ParsedTelemetry {
  sourceName: string;
  sourceKind: 'csv' | 'kml' | 'unsupported' | 'unknown';
  rows: TelemetryPoint[];
  detectedColumns: string[];
  missingCoreFields: string[];
  notice?: string;
}

export interface DataQualityReport {
  score: number;
  level: 'низкое' | 'среднее' | 'высокое';
  available: string[];
  missing: string[];
  notes: string[];
}

export interface FlightAnalysis {
  parsed: ParsedTelemetry;
  quality: DataQualityReport;
  battery: BatteryAssessment;
  importProfile: {
    title: string;
    capability: 'route_only' | 'battery_basic' | 'battery_extended';
    verdict: string;
    nextBestFile: string;
  };
  summary: {
    points: number;
    durationMin: number | null;
    batteryStart: number | null;
    batteryEnd: number | null;
    minVoltage: number | null;
    maxBatteryTemp: number | null;
    maxCellDeviation: number | null;
  };
  alerts: RiskAlert[];
}

type FieldKey = keyof Omit<TelemetryPoint, 'cellVoltages'>;

const aliases: Record<FieldKey, string[]> = {
  timestamp: ['timestamp', 'time', 'datetime', 'date/time', 'created_at', 'osd.flytime', 'flight_time'],
  latitude: ['latitude', 'lat', 'gps.latitude', 'osd.latitude', 'position_lat'],
  longitude: ['longitude', 'lon', 'lng', 'gps.longitude', 'osd.longitude', 'position_lon'],
  altitudeM: ['altitude', 'height', 'altitude(m)', 'height(m)', 'osd.height', 'relative_altitude', 'altitudem'],
  speedMps: ['speed', 'speed(m/s)', 'horizontal_speed', 'osd.hspeed', 'velocity', 'speedmps'],
  batteryPercent: ['battery_percent', 'battery%', 'battery level', 'battery_level', 'battery.percent', 'battery.capacity_percent', 'batterypercent'],
  packVoltage: ['voltage', 'battery_voltage', 'pack_voltage', 'battery.voltage', 'battery.voltage [v]', 'voltage_v'],
  batteryCurrentA: ['current', 'battery_current', 'battery.current', 'battery.current [a]', 'current_a'],
  batteryTemperatureC: ['battery_temperature', 'battery_temp', 'temperature', 'battery.temperature', 'battery.temperature [c]', 'batterytempc'],
  warning: ['warning', 'warnings', 'message', 'event', 'error', 'error_code', 'warning_code'],
};

const normalize = (value: string) => value.trim().toLowerCase().replace(/[\s_\-()[\]]+/g, '');
const toNumber = (value: string | undefined) => {
  if (!value) return undefined;
  const numeric = value.replace(',', '.').replace(/[^\d.+-]/g, '');
  if (!numeric) return undefined;
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : undefined;
};

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let quoted = false;
  for (const char of line) {
    if (char === '"') quoted = !quoted;
    else if ((char === ',' || char === ';' || char === '\t') && !quoted) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else current += char;
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

function findColumn(headers: string[], options: string[]) {
  const normalizedHeaders = headers.map(normalize);
  return options.map(normalize).map((option) => normalizedHeaders.indexOf(option)).find((index) => index >= 0);
}

export function parseTelemetryCsv(sourceName: string, content: string): ParsedTelemetry {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return { sourceName, sourceKind: 'unknown', rows: [], detectedColumns: [], missingCoreFields: ['timestamp', 'batteryPercent', 'coordinates'] };
  const headers = splitCsvLine(lines[0]);
  const columnMap = Object.fromEntries(Object.entries(aliases).map(([key, values]) => [key, findColumn(headers, values)])) as Record<FieldKey, number | undefined>;
  const cellIndexes = headers.map((header, index) => ({ header: normalize(header), index }))
    .filter(({ header }) => /^cell(voltage)?\d+$/.test(header) || /^batterycell\d+/.test(header) || /^cell\d+voltage/.test(header))
    .map(({ index }) => index);
  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const point: TelemetryPoint = {};
    for (const key of Object.keys(columnMap) as FieldKey[]) {
      const index = columnMap[key];
      if (index === undefined) continue;
      if (key === 'timestamp' || key === 'warning') point[key] = cells[index];
      else point[key] = toNumber(cells[index]) as never;
    }
    const cellVoltages = cellIndexes.map((index) => toNumber(cells[index])).filter((value): value is number => value !== undefined);
    if (cellVoltages.length) point.cellVoltages = cellVoltages;
    return point;
  }).filter((point) => Object.values(point).some((value) => value !== undefined && value !== ''));
  const missingCoreFields = [columnMap.timestamp === undefined ? 'timestamp' : '', columnMap.batteryPercent === undefined ? 'batteryPercent' : '', columnMap.latitude === undefined || columnMap.longitude === undefined ? 'coordinates' : ''].filter(Boolean);
  return { sourceName, sourceKind: 'csv', rows, detectedColumns: headers, missingCoreFields };
}

export function parseTelemetryFile(sourceName: string, content: string): ParsedTelemetry {
  const lowerName = sourceName.toLowerCase();
  if (lowerName.endsWith('.dat') || lowerName.endsWith('.zip') || lowerName.endsWith('.json')) {
    return {
      sourceName,
      sourceKind: 'unsupported',
      rows: [],
      detectedColumns: [],
      missingCoreFields: ['timestamp', 'batteryPercent', 'coordinates'],
      notice: 'Файл принят, но автоматический разбор этого формата ещё не подключён. Аналитика по нему не выполняется, чтобы не показывать неподтверждённые выводы.',
    };
  }
  if (lowerName.endsWith('.kml') || content.trimStart().startsWith('<?xml') || content.includes('<kml')) {
    return parseKmlRoute(sourceName, content);
  }
  return parseTelemetryCsv(sourceName, content);
}

function parseKmlRoute(sourceName: string, content: string): ParsedTelemetry {
  const coordinateBlocks = [...content.matchAll(/<coordinates[^>]*>([\s\S]*?)<\/coordinates>/gi)].map((match) => match[1]);
  const rows: TelemetryPoint[] = coordinateBlocks.flatMap((block) => block.trim().split(/\s+/).map((chunk): TelemetryPoint | null => {
    const [lon, lat, alt] = chunk.split(',').map(toNumber);
    return lat !== undefined && lon !== undefined ? { latitude: lat, longitude: lon, altitudeM: alt } : null;
  }).filter((point): point is TelemetryPoint => point !== null));
  return {
    sourceName,
    sourceKind: 'kml',
    rows,
    detectedColumns: rows.length ? ['kml.coordinates'] : [],
    missingCoreFields: ['timestamp', 'batteryPercent'],
  };
}

export function evaluateDataQuality(parsed: ParsedTelemetry): DataQualityReport {
  const has = (predicate: (row: TelemetryPoint) => boolean) => parsed.rows.some(predicate);
  const checks = [
    ['Время', has((row) => Boolean(row.timestamp))],
    ['Координаты', has((row) => row.latitude !== undefined && row.longitude !== undefined)],
    ['Высота/скорость', has((row) => row.altitudeM !== undefined || row.speedMps !== undefined)],
    ['Заряд батареи', has((row) => row.batteryPercent !== undefined)],
    ['Напряжение пакета', has((row) => row.packVoltage !== undefined)],
    ['Температура батареи', has((row) => row.batteryTemperatureC !== undefined)],
    ['Напряжения ячеек', has((row) => Boolean(row.cellVoltages?.length))],
    ['События/ошибки', has((row) => Boolean(row.warning))],
  ] as const;
  const available = checks.filter(([, ok]) => ok).map(([label]) => label);
  const missing = checks.filter(([, ok]) => !ok).map(([label]) => label);
  const score = Math.round((available.length / checks.length) * 100);
  return { score, level: score >= 75 ? 'высокое' : score >= 45 ? 'среднее' : 'низкое', available, missing, notes: parsed.rows.length < 20 ? ['Мало точек телеметрии: выводы предварительные.'] : [] };
}

export function analyzeTelemetry(parsed: ParsedTelemetry): FlightAnalysis {
  const quality = evaluateDataQuality(parsed);
  const rows = parsed.rows;
  const first = rows[0];
  const last = rows.at(-1);
  const numbers = (key: keyof TelemetryPoint) => rows.map((row) => row[key]).filter((value): value is number => typeof value === 'number');
  const batteryValues = numbers('batteryPercent');
  const voltageValues = numbers('packVoltage');
  const tempValues = numbers('batteryTemperatureC');
  const cellDeviations = rows.map((row) => row.cellVoltages?.length ? Math.max(...row.cellVoltages) - Math.min(...row.cellVoltages) : undefined).filter((value): value is number => value !== undefined);
  const durationMin = first?.timestamp && last?.timestamp ? (Date.parse(last.timestamp) - Date.parse(first.timestamp)) / 60000 : null;
  const dischargeRate = durationMin && durationMin > 0 && batteryValues.length ? (batteryValues[0] - batteryValues.at(-1)!) / durationMin : undefined;
  const snapshot: BatterySnapshot = {
    capability: quality.available.includes('Напряжения ячеек') || quality.available.includes('Температура батареи') ? 'extended' : 'route_only',
    batteryPercent: batteryValues.at(-1) ?? 0,
    packVoltage: voltageValues.length ? Math.min(...voltageValues) : undefined,
    batteryTemperatureC: tempValues.length ? Math.max(...tempValues) : undefined,
    cellVoltages: rows.find((row) => row.cellVoltages?.length)?.cellVoltages,
    dischargeRatePercentPerMinute: dischargeRate,
  };
  const battery = assessBattery(snapshot);
  const importProfile = buildImportProfile(parsed, quality);
  return {
    parsed,
    quality,
    battery,
    importProfile,
    summary: {
      points: rows.length,
      durationMin: durationMin && Number.isFinite(durationMin) ? Math.max(0, durationMin) : null,
      batteryStart: batteryValues[0] ?? null,
      batteryEnd: batteryValues.at(-1) ?? null,
      minVoltage: voltageValues.length ? Math.min(...voltageValues) : null,
      maxBatteryTemp: tempValues.length ? Math.max(...tempValues) : null,
      maxCellDeviation: cellDeviations.length ? Math.max(...cellDeviations) : null,
    },
    alerts: battery.alerts,
  };
}

function buildImportProfile(parsed: ParsedTelemetry, quality: DataQualityReport): FlightAnalysis['importProfile'] {
  const hasCells = quality.available.includes('Напряжения ячеек');
  const hasBattery = quality.available.includes('Заряд батареи') || quality.available.includes('Напряжение пакета') || quality.available.includes('Температура батареи');
  if (hasCells) return {
    title: 'Расширенная батарейная телеметрия',
    capability: 'battery_extended',
    verdict: 'Можно оценивать разбаланс ячеек, перегрев, просадку напряжения и ускоренный разряд.',
    nextBestFile: 'Продолжайте копить историю по этой батарее: несколько полётов под похожей нагрузкой дадут персональную норму просадки.',
  };
  if (hasBattery) return {
    title: 'Базовая батарейная телеметрия',
    capability: 'battery_basic',
    verdict: 'Можно делать первичный скрининг батареи, но без ячеек точность ниже.',
    nextBestFile: 'Для серьёзной диагностики нужен подтверждённый экспорт с напряжениями ячеек, температурой, ошибками батареи и нагрузкой.',
  };
  return {
    title: parsed.sourceKind === 'kml' ? 'Маршрут KML / SmartFarm' : parsed.sourceKind === 'unsupported' ? 'Формат ждёт проверки' : 'Ограниченный источник',
    capability: 'route_only',
    verdict: parsed.notice ?? 'Можно проверить маршрут и наличие координат, но нельзя честно оценить состояние батареи.',
    nextBestFile: 'Загрузите CSV/TXT с батарейными полями или расширенный лог с пульта/обслуживания: voltage, battery_percent, temperature, cell1...cellN, warnings.',
  };
}
