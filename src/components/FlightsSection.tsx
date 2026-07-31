import { AlertTriangle, CheckCircle2, CircleHelp } from 'lucide-react';
import type { FlightAnalysis } from '../analytics/telemetry';
import { capabilityText } from '../appData';
import type { BatteryAsset, DroneAsset, FileOriginNote, PendingTelemetryImport, SavedTelemetryImport } from '../domain/fleet';
import { QualityPanel } from './CommonCards';

export function FlightsView({ analysis, analysisSource, imports, pendingImports, drones, batteries, onOpenImport }: { analysis: FlightAnalysis; analysisSource: 'demo' | 'file'; imports: SavedTelemetryImport[]; pendingImports: PendingTelemetryImport[]; drones: DroneAsset[]; batteries: BatteryAsset[]; onOpenImport: (item: SavedTelemetryImport) => void }) {
  return (
    <>
      {analysisSource === 'demo' && <DemoAnalysisNotice />}
      <section className="analysis-grid"><QualityPanel analysis={analysis} /><ImportProfile analysis={analysis} analysisSource={analysisSource} /></section>
      <RecognizedData analysis={analysis} />
      <ImportHistory imports={imports} drones={drones} batteries={batteries} onOpenImport={onOpenImport} />
      <PendingImportQueue pendingImports={pendingImports} drones={drones} batteries={batteries} />
    </>
  );
}

function PendingImportQueue({ pendingImports, drones, batteries }: { pendingImports: PendingTelemetryImport[]; drones: DroneAsset[]; batteries: BatteryAsset[] }) {
  return (
    <section className="panel list-panel pending-imports" data-testid="pending-imports">
      <div className="panel-heading">
        <div><p className="eyebrow">Очередь проверки форматов</p><h2>Записи о сложных файлах</h2></div>
        <span className="status-pill status-pill--warning">{pendingImports.length} записей</span>
      </div>
      <div className="pending-note">
        <AlertTriangle size={16} />
        <span>Это не ошибка. В браузере сохранена запись с метаданными файла, а не его оригинал; выводы появятся только после подтверждения, какие данные можно читать.</span>
      </div>
      {pendingImports.length === 0 ? (
        <p className="empty-state">После выбора DAT/ZIP/JSON и других сложных файлов здесь появится запись очереди с метаданными. Оригинал не сохраняется, а выводы не строятся до проверки чтения данных.</p>
      ) : pendingImports.map((item) => {
        const drone = drones.find((entry) => entry.id === item.droneId);
        const battery = batteries.find((entry) => entry.id === item.batteryId);
        return (
          <div className="history-row pending-row" key={item.id}>
            <span className="row-status row-status--warning"><CircleHelp size={17} /></span>
            <div>
              <strong>{item.sourceName}</strong>
              <p>{drone?.name ?? 'Дрон не найден'} · {battery?.label ?? 'Батарея не найдена'} · ждёт проверки чтения данных</p>
              <OriginNote note={item.originNote} />
              <small>{item.reason}</small>
              <small>{item.nextStep}</small>
            </div>
            <time>{new Date(item.importedAt).toLocaleString('ru-RU')}</time>
          </div>
        );
      })}
    </section>
  );
}

function ImportHistory({ imports, drones, batteries, onOpenImport }: { imports: SavedTelemetryImport[]; drones: DroneAsset[]; batteries: BatteryAsset[]; onOpenImport: (item: SavedTelemetryImport) => void }) {
  return (
    <section className="panel list-panel" data-testid="import-history">
      <div className="panel-heading">
        <div><p className="eyebrow">История загрузок</p><h2>Сохранённые проверки по дронам и батареям</h2></div>
        <span className="status-pill status-pill--good">{imports.length} записей</span>
      </div>
      {imports.length === 0 ? (
        <p className="empty-state">Загрузите CSV/TXT/KML: поддержанная проверка сохранится здесь с выбранным дроном и батареей. Демо-примеры в историю не попадают.</p>
      ) : imports.map((item) => {
        const drone = drones.find((entry) => entry.id === item.droneId);
        const battery = batteries.find((entry) => entry.id === item.batteryId);
        return (
          <button className="history-row" key={item.id} onClick={() => onOpenImport(item)}>
            <span className={`row-status row-status--${item.criticalAlertCount ? 'critical' : item.alertCount ? 'warning' : 'good'}`}>
              {item.criticalAlertCount ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
            </span>
            <div><strong>{item.sourceName}</strong><p>{drone?.name ?? 'Дрон не найден'} · {battery?.label ?? 'Батарея не найдена'} · {capabilityText[item.capability]}</p><OriginNote note={item.originNote} /></div>
            <time>{new Date(item.importedAt).toLocaleString('ru-RU')} · качество {item.qualityScore}%</time>
          </button>
        );
      })}
    </section>
  );
}

function OriginNote({ note }: { note?: FileOriginNote }) {
  if (!note) return null;
  const parts = [note.source && `Источник: ${note.source}`, note.flightDate && `Полёт: ${note.flightDate}`, note.scenario && `Сценарий: ${note.scenario}`, note.hiddenData && `Скрыто: ${note.hiddenData}`].filter(Boolean);
  return parts.length ? <small className="origin-note">{parts.join(' · ')}</small> : null;
}

function DemoAnalysisNotice() {
  return <section className="demo-analysis-notice" role="status" data-testid="demo-analysis-notice"><CircleHelp size={18} /><div><strong>Открыт синтетический пример</strong><span>Он не связан с парком, не сохранён в истории и не является техническим выводом, задачей обслуживания или результатом проверки реального журнала.</span></div></section>;
}

function ImportProfile({ analysis, analysisSource }: { analysis: FlightAnalysis; analysisSource: 'demo' | 'file' }) {
  const profile = analysis.importProfile;
  const sourceLabel = analysis.parsed.sourceKind === 'unsupported' ? 'Формат на проверке' : analysis.parsed.sourceKind.toUpperCase();
  const tone = profile.capability === 'battery_extended' ? 'good' : profile.capability === 'battery_basic' ? 'warning' : 'critical';

  return (
    <article className={`panel import-card import-card--${profile.capability}`}>
      <div className="panel-heading"><div><p className="eyebrow">{analysisSource === 'demo' ? 'Карточка синтетического примера' : 'Карточка загрузки'}</p><h2>{profile.title}</h2></div><span className={`status-pill status-pill--${tone}`}>{analysisSource === 'demo' ? 'ДЕМО' : sourceLabel}</span></div>
      <p>{profile.verdict}</p>
      <div className="entity-stats">
        <span>Файл <b>{analysis.parsed.sourceName}</b></span>
        <span>Точки <b>{analysis.summary.points}</b></span>
        <span>Мин. напряжение <b>{analysis.summary.minVoltage?.toFixed(1) ?? '—'} В</b></span>
        <span>Макс. температура <b>{analysis.summary.maxBatteryTemp ?? '—'} °C</b></span>
      </div>
      <div className="next-file"><strong>Какой файл лучше загрузить дальше</strong><span>{profile.nextBestFile}</span></div>
    </article>
  );
}

function RecognizedData({ analysis }: { analysis: FlightAnalysis }) {
  const criticalHints = ['timestamp', 'latitude', 'longitude', 'battery_percent', 'pack_voltage', 'battery_temperature', 'cell1...cellN', 'warning'];
  const missingLabels: Record<string, string> = { timestamp: 'Время полёта', batteryPercent: 'Заряд батареи', coordinates: 'Координаты' };
  const missing = analysis.parsed.missingCoreFields.length
    ? analysis.parsed.missingCoreFields.map((field) => missingLabels[field] ?? field)
    : ['Критичные базовые поля найдены'];

  return (
    <article className="panel recognized-data">
      <div className="panel-heading">
        <div><p className="eyebrow">Найденные данные</p><h2>Что найдено в журнале</h2></div>
        <span className={`status-pill status-pill--${analysis.importProfile.capability === 'route_only' ? 'critical' : 'good'}`}>{analysis.importProfile.capability === 'route_only' ? 'Батарея недоступна' : 'Можно анализировать'}</span>
      </div>
      <div className="recognized-grid">
        <div><strong>Найденные поля</strong><div className="tag-cloud">{analysis.parsed.detectedColumns.length ? analysis.parsed.detectedColumns.map((column) => <span key={column}>{column}</span>) : <span>Поля не распознаны</span>}</div></div>
        <div><strong>Не хватает для оценки батареи</strong><div className="tag-cloud tag-cloud--missing">{missing.map((field) => <span key={field}>{field}</span>)}</div></div>
        <div><strong>Рекомендуемые CSV-поля</strong><div className="tag-cloud tag-cloud--hint">{criticalHints.map((field) => <span key={field}>{field}</span>)}</div></div>
      </div>
      <p>{analysis.importProfile.capability === 'route_only' ? 'Этот файл пригоден для маршрута, но по нему нельзя честно оценить батарею: нет заряда, напряжения, температуры или ячеек.' : 'Чем больше данных по батарее есть в журнале, тем надёжнее первичная проверка и тем меньше догадок.'}</p>
    </article>
  );
}
