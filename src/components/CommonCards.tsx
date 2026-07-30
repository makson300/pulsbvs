import type { ReactNode } from 'react';
import type { FlightAnalysis } from '../analytics/telemetry';
import type { ListRow } from '../appData';
import { ArrowUpRight } from 'lucide-react';

export function List({ title, rows, action }: { title: string; rows: ListRow[]; action?: ReactNode }) {
  return (
    <section className="panel list-panel">
      <div className="panel-heading"><div><p className="eyebrow">Список</p><h2>{title}</h2></div>{action}</div>
      {rows.map((row) => (
        <div className="list-row" key={row.title}>
          <span className={`row-status row-status--${row.tone}`}>{row.icon}</span>
          <div><strong>{row.title}</strong><p>{row.text}</p></div>
          <time>{row.meta}</time>
        </div>
      ))}
    </section>
  );
}

export function Entity({ title, subtitle, tone, status, rows }: { title: string; subtitle: string; tone: string; status: string; rows: string[][] }) {
  return (
    <article className="panel entity-card">
      <div><p className="eyebrow">{subtitle}</p><h2>{title}</h2><span className={`status-pill status-pill--${tone}`}>{status}</span></div>
      <div className="entity-stats">{rows.map(([key, value]) => <span key={key}>{key}<b>{value}</b></span>)}</div>
      <button className="entity-action">Открыть карточку <ArrowUpRight size={15} /></button>
    </article>
  );
}

export function QualityPanel({ analysis }: { analysis: FlightAnalysis }) {
  return (
    <article className="panel quality-panel">
      <div className="panel-heading"><div><p className="eyebrow">Полнота данных</p><h2>Каких данных хватает</h2></div><strong className="quality-score">{analysis.quality.score}%</strong></div>
      <div className="quality-scale"><i style={{ width: `${analysis.quality.score}%` }} /></div>
      <div className="quality-columns">
        <div><b>Есть</b>{analysis.quality.available.map((item) => <span key={item}>{item}</span>)}</div>
        <div><b>Нет</b>{analysis.quality.missing.map((item) => <span key={item}>{item}</span>)}</div>
      </div>
    </article>
  );
}

export function Metric({ icon, value, label, hint, tone }: { icon: ReactNode; value: string; label: string; hint: string; tone: string }) {
  return <article className={`metric-card metric-card--${tone}`}><div className="metric-icon">{icon}</div><div><strong>{value}</strong><p>{label}</p><small>{hint}</small></div></article>;
}
