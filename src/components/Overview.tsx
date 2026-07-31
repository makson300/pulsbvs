import { AlertTriangle, ArrowUpRight, BatteryCharging, CloudUpload, Gauge, Plane, ShieldCheck } from 'lucide-react';
import { demoLogs } from '../analytics/demoLogs';
import type { FlightAnalysis } from '../analytics/telemetry';
import { downloadSample, severityText, sourceTemplate } from '../appData';
import { Metric, QualityPanel } from './CommonCards';
import type { FleetReadiness } from '../domain/fleet';

export function Overview({
  analysis,
  analysisSource,
  barValues,
  primaryAlert,
  openRecommendation,
  openUpload,
  loadDemo,
  droneCount,
  importCount,
  pendingCount,
  manualFlightCount,
  readiness,
}: {
  analysis: FlightAnalysis;
  analysisSource: 'demo' | 'file';
  barValues: number[];
  primaryAlert: FlightAnalysis['alerts'][number] | undefined;
  openRecommendation: () => void;
  openUpload: () => void;
  loadDemo: (key: keyof typeof demoLogs) => void;
  droneCount: number;
  importCount: number;
  pendingCount: number;
  manualFlightCount: number;
  readiness: FleetReadiness;
}) {
  return (
    <>
      <section className="metric-grid">
        <Metric icon={<Plane />} value={String(droneCount)} label="Дронов в парке" hint={`${importCount} загрузок в истории`} tone="blue" />
        <Metric icon={<BatteryCharging />} value={analysis.summary.batteryEnd !== null ? `${analysis.summary.batteryEnd}%` : '—'} label="Остаток батареи" hint={analysisSource === 'demo' ? 'по синтетическому примеру' : 'по последнему загруженному логу'} tone="violet" />
        <Metric icon={<AlertTriangle />} value={String(analysis.alerts.length)} label="Предупреждений в файле" hint={`полнота данных: ${analysis.quality.score}%`} tone="amber" />
        <Metric icon={<Gauge />} value={String(manualFlightCount)} label="Записей в журнале" hint="введены вручную" tone="cyan" />
      </section>

      <section className="dashboard-grid">
        <FleetHealthCard droneCount={droneCount} importCount={importCount} readiness={readiness} />
        <RiskCard primaryAlert={primaryAlert} openRecommendation={openRecommendation} analysisSource={analysisSource} />
        <FlightChart analysis={analysis} barValues={barValues} analysisSource={analysisSource} />
      </section>

      <section className="analysis-grid">
        <QualityPanel analysis={analysis} />
        <article className="panel demo-panel">
          <p className="eyebrow">Примеры для проверки</p>
          <h2>Посмотреть работу сервиса без реальных файлов DJI</h2>
          <div className="demo-actions">
            <button onClick={() => loadDemo('normal')}>Норма</button>
            <button onClick={() => loadDemo('degraded')}>Есть ухудшение</button>
            <button onClick={() => loadDemo('critical')}>Высокий риск</button>
          </div>
          <p>Кнопки показывают синтетические примеры, не связанные с вашим парком. Они не сохраняются в историю, не создают задач и не являются техническим выводом о дроне или батарее.</p>
        </article>
      </section>
      <PilotReadiness />
      <FirstRealFileGuide openUpload={openUpload} pendingCount={pendingCount} />
    </>
  );
}

function FirstRealFileGuide({ openUpload, pendingCount }: { openUpload: () => void; pendingCount: number }) {
  const steps = [
    ['1', 'Сохраните оригинал у себя', 'Не меняйте исходный файл. Держите его в закрытой папке на случай повторной проверки.'],
    ['2', 'Заполните карточку файла', 'Укажите модель дрона, откуда взят файл, дату полёта и что скрыто из чувствительных данных.'],
    ['3', 'Загрузите рабочую копию', 'CSV/TXT/KML дадут ограниченную проверку. DAT/ZIP/JSON будут сохранены отдельно до проверки чтения данных.'],
  ];

  return (
    <section className="panel first-file-card">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Первый реальный файл</p>
          <h2>Безопасная приёмка файла от пилота</h2>
        </div>
        <span className="status-pill status-pill--warning">{pendingCount ? `${pendingCount} ждёт проверки` : 'готово к загрузке'}</span>
      </div>
      <p>Этот сценарий нужен, чтобы не потерять происхождение файла и не показать выводы там, где данных пока недостаточно.</p>
      <div className="first-file-steps">
        {steps.map(([number, title, text]) => (
          <article key={title}>
            <span>{number}</span>
            <strong>{title}</strong>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <div className="first-file-actions">
        <button className="upload-button" data-testid="open-first-file-upload" onClick={openUpload}><CloudUpload size={16} />Загрузить первый файл</button>
        <button onClick={() => downloadSample('puls-bvs-source-template.txt', sourceTemplate, 'text/plain;charset=utf-8')}>Скачать карточку файла</button>
      </div>
    </section>
  );
}

function PilotReadiness() {
  const readinessItems = [
    { status: 'done', title: 'Загрузка базовых файлов готова', text: 'CSV/TXT/KML проверяются на полноту данных, сохраняются в историю и связываются с дроном и батареей.' },
    { status: 'done', title: 'Сложные файлы принимаются на проверку', text: 'DAT/ZIP/JSON сохраняются отдельно: по ним пока не строятся выводы и история полёта.' },
    { status: 'next', title: 'Нужен первый реальный файл', text: 'Оригинал остаётся у владельца, а рабочая копия загружается вместе с заметкой о происхождении файла.' },
    { status: 'blocked', title: 'Чтение файла ждёт проверки', text: 'Правила оценки добавляются только после изучения реального файла без лишних чувствительных данных.' },
  ];

  return (
    <section className="panel pilot-readiness">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Готовность к пилоту</p>
          <h2>Что осталось до полноценной работы</h2>
        </div>
        <span className="status-pill status-pill--warning">Ждём реальные файлы</span>
      </div>
      <div className="readiness-steps">
        {readinessItems.map((item) => (
          <article className={`readiness-step readiness-step--${item.status}`} key={item.title}>
            <strong>{item.title}</strong>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FleetHealthCard({ droneCount, importCount, readiness }: { droneCount: number; importCount: number; readiness: FleetReadiness }) {
  return (
    <article className="panel fleet-health">
      <div className="panel-heading"><div><p className="eyebrow">Техническое состояние</p><h2>Готовность флота</h2></div></div>
      <div className="readiness">
        <div className="gauge">
          <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="48" /><circle className="gauge-value" cx="60" cy="60" r="48" /></svg>
          <div><strong>{readiness.status === 'ready' ? 'OK' : '!'}</strong><small>{readiness.label}</small></div>
        </div>
        <div className="readiness-list">
          <div><span className="status-dot status-dot--good" />В списке <b>{droneCount}</b></div>
          <div><span className="status-dot status-dot--attention" />Сохранённых файлов <b>{importCount}</b></div>
          <div><span className={`status-dot status-dot--${readiness.status === 'blocked' ? 'critical' : readiness.status === 'attention' ? 'attention' : 'good'}`} />Операционный статус <b>{readiness.label}</b></div>
        </div>
      </div>
      <div className="health-footer"><ShieldCheck size={18} /><span>{readiness.facts[0]}</span></div>
    </article>
  );
}

function RiskCard({ primaryAlert, openRecommendation, analysisSource }: { primaryAlert: FlightAnalysis['alerts'][number] | undefined; openRecommendation: () => void; analysisSource: 'demo' | 'file' }) {
  return (
    <article className="panel risk-card">
      <div className="risk-top">
        <div className="risk-icon"><AlertTriangle size={22} /></div>
        <span className={`severity severity--${primaryAlert?.severity ?? 'info'}`}>{severityText[primaryAlert?.severity ?? 'info']}</span>
      </div>
      <p className="eyebrow">{analysisSource === 'demo' ? 'Синтетический пример предупреждения' : 'Предупреждение'}</p>
      <h2>{primaryAlert?.title ?? 'Отклонений не обнаружено'}</h2>
      <p>{primaryAlert?.detail ?? 'Данные полёта находятся в обычных пределах.'}</p>
      <button className="risk-action" onClick={openRecommendation}>Открыть рекомендации <ArrowUpRight size={16} /></button>
    </article>
  );
}

function FlightChart({ analysis, barValues, analysisSource }: { analysis: FlightAnalysis; barValues: number[]; analysisSource: 'demo' | 'file' }) {
  return (
    <article className="panel flight-panel">
      <div className="panel-heading"><div><p className="eyebrow">{analysisSource === 'demo' ? 'Синтетический пример' : 'Анализ файла'}</p><h2>Разряд батареи</h2></div><span className="period-button">{analysis.summary.points} точек</span></div>
      <div className="chart-summary">
        <div><strong>{analysis.summary.durationMin?.toFixed(1) ?? '—'} мин</strong><span>длительность</span></div>
        <div><strong>{analysis.summary.maxCellDeviation?.toFixed(3) ?? '—'} В</strong><span>макс. разбаланс</span></div>
      </div>
      <div className="bar-chart">
        {barValues.map((height, index) => <div className="bar-column" key={index}><i style={{ height: `${height}%` }} /><span>{index + 1}</span></div>)}
      </div>
    </article>
  );
}
