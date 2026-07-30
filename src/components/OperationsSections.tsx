import { useState, type ReactNode } from 'react';
import { AlertTriangle, BatteryCharging, CheckCircle2, FileText, Plane, Plus, Wrench } from 'lucide-react';
import { getDocumentExpiryStatus, getManualFlightMinutes, toLocalDateKey, type AssetKind, type AssetPassport, type BatteryAsset, type DocumentRecord, type DroneAsset, type FleetReadiness, type IncidentRecord, type MaintenanceTask, type ManualFlightEntry } from '../domain/fleet';

type AssetOption = { kind: AssetKind; id: string; label: string };

function AssetSelect({ assets, value, onChange }: { assets: AssetOption[]; value: string; onChange: (value: string) => void }) {
  return <select className="form-input" value={value} onChange={(event) => onChange(event.target.value)}><option value="">Без привязки</option>{assets.map((asset) => <option value={`${asset.kind}:${asset.id}`} key={`${asset.kind}:${asset.id}`}>{asset.label}</option>)}</select>;
}

function parseAsset(value: string): Pick<MaintenanceTask, 'assetKind' | 'assetId'> {
  const [assetKind, assetId] = value.split(':') as [AssetKind | undefined, string | undefined];
  return assetKind && assetId ? { assetKind, assetId } : {};
}

export function FleetView({ drones, flights, onAddDrone, onSavePassport }: { drones: DroneAsset[]; flights: ManualFlightEntry[]; onAddDrone: () => void; onSavePassport: (kind: AssetKind, id: string, passport: AssetPassport) => void }) {
  return <>
    <div className="section-actions"><button className="upload-button" onClick={onAddDrone}><Plane size={16} />Добавить дрон</button><span>Паспорт заполняется вручную и хранится только в этом браузере.</span></div>
    <section className="table-grid">{drones.map((drone) => { const manualMinutes = getManualFlightMinutes(flights, drone.id); return <AssetCard key={drone.id} icon={<Plane size={18} />} title={drone.name} subtitle={drone.model} facts={[["Ручной налёт", manualMinutes ? `${manualMinutes} мин` : 'Нет записей'], ['Серийный номер', drone.passport?.serialNumber ?? 'Не указан'], ['Владелец', drone.passport?.owner ?? 'Не указан']]} passport={drone.passport} onSave={(passport) => onSavePassport('drone', drone.id, passport)} />; })}</section>
  </>;
}

export function BatteriesView({ batteries, onAddBattery, onSavePassport }: { batteries: BatteryAsset[]; onAddBattery: () => void; onSavePassport: (kind: AssetKind, id: string, passport: AssetPassport) => void }) {
  return <>
    <div className="section-actions"><button className="upload-button" onClick={onAddBattery}><BatteryCharging size={16} />Добавить батарею</button><span>Паспорт батареи ведётся вручную; техническая оценка не подменяется записями.</span></div>
    <section className="table-grid">{batteries.map((battery) => <AssetCard key={battery.id} icon={<BatteryCharging size={18} />} title={battery.label} subtitle="Паспорт батареи" facts={[["Циклы", battery.cycles === null ? 'Не указаны' : String(battery.cycles)], ['Серийный номер', battery.passport?.serialNumber ?? 'Не указан'], ['Дата приобретения', battery.passport?.acquiredOn ?? 'Не указана']]} passport={battery.passport} onSave={(passport) => onSavePassport('battery', battery.id, passport)} />)}</section>
  </>;
}

function AssetCard({ icon, title, subtitle, facts, passport, onSave }: { icon: ReactNode; title: string; subtitle: string; facts: string[][]; passport?: AssetPassport; onSave: (passport: AssetPassport) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AssetPassport>(passport ?? {});
  return <article className="panel entity-card operational-card">
    <div><p className="eyebrow">{subtitle}</p><h2>{title}</h2><span className="status-pill status-pill--warning">Данные введены вручную</span></div>
    <div className="entity-stats">{facts.map(([key, value]) => <span key={key}>{key}<b>{value}</b></span>)}</div>
    <button className="secondary-action" onClick={() => setOpen(!open)}>{icon} {open ? 'Скрыть паспорт' : 'Заполнить паспорт'}</button>
    {open && <form className="compact-form" onSubmit={(event) => { event.preventDefault(); onSave(form); setOpen(false); }}>
      <label>Серийный номер<input className="form-input" value={form.serialNumber ?? ''} onChange={(event) => setForm({ ...form, serialNumber: event.target.value })} /></label>
      <label>Учётный / регистрационный номер<input className="form-input" value={form.registrationNumber ?? ''} onChange={(event) => setForm({ ...form, registrationNumber: event.target.value })} /></label>
      <label>Владелец<input className="form-input" value={form.owner ?? ''} onChange={(event) => setForm({ ...form, owner: event.target.value })} /></label>
      <label>Дата приобретения<input className="form-input" type="date" value={form.acquiredOn ?? ''} onChange={(event) => setForm({ ...form, acquiredOn: event.target.value })} /></label>
      <label>Примечание<textarea className="form-input" value={form.note ?? ''} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
      <button className="upload-button" type="submit">Сохранить паспорт</button>
    </form>}
  </article>;
}

export function MaintenanceView({ drones, batteries, tasks, incidents, documents, readiness, onAddTask, onTaskStatus, onAddIncident, onIncidentStatus, onAddDocument }: { drones: DroneAsset[]; batteries: BatteryAsset[]; tasks: MaintenanceTask[]; incidents: IncidentRecord[]; documents: DocumentRecord[]; readiness: FleetReadiness; onAddTask: (input: Omit<MaintenanceTask, 'id' | 'createdAt' | 'completedAt' | 'status'>) => void; onTaskStatus: (id: string, status: MaintenanceTask['status']) => void; onAddIncident: (input: Omit<IncidentRecord, 'id' | 'createdAt' | 'resolvedAt' | 'status'>) => void; onIncidentStatus: (id: string, status: IncidentRecord['status']) => void; onAddDocument: (input: Omit<DocumentRecord, 'id' | 'createdAt'>) => void }) {
  const assets: AssetOption[] = [...drones.map((item) => ({ kind: 'drone' as const, id: item.id, label: `Дрон · ${item.name}` })), ...batteries.map((item) => ({ kind: 'battery' as const, id: item.id, label: `Батарея · ${item.label}` }))];
  const [task, setTask] = useState({ title: '', dueDate: '', asset: '', note: '' });
  const [incident, setIncident] = useState({ title: '', occurredOn: toLocalDateKey(), asset: '', severity: 'warning' as IncidentRecord['severity'], description: '' });
  const [document, setDocument] = useState({ title: '', documentType: 'Страховка', expiresOn: '', asset: '', reference: '' });
  const label = (kind?: AssetKind, id?: string) => assets.find((asset) => asset.kind === kind && asset.id === id)?.label ?? 'Без привязки';
  return <>
    <section className={`panel readiness-summary readiness-summary--${readiness.status}`}><div><p className="eyebrow">Готовность флота</p><h2>{readiness.label}</h2><p>Статус основан только на задачах, событиях и сроках документов.</p></div><ul>{readiness.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul></section>
    <section className="operations-grid">
      <article className="panel"><p className="eyebrow">Обслуживание</p><h2>Новая задача</h2><form className="compact-form" onSubmit={(event) => { event.preventDefault(); onAddTask({ ...parseAsset(task.asset), title: task.title, dueDate: task.dueDate || undefined, note: task.note || undefined }); setTask({ title: '', dueDate: '', asset: '', note: '' }); }}><label>Что сделать<input required className="form-input" value={task.title} onChange={(event) => setTask({ ...task, title: event.target.value })} /></label><label>Срок<input className="form-input" type="date" value={task.dueDate} onChange={(event) => setTask({ ...task, dueDate: event.target.value })} /></label><AssetSelect assets={assets} value={task.asset} onChange={(asset) => setTask({ ...task, asset })} /><label>Примечание<textarea className="form-input" value={task.note} onChange={(event) => setTask({ ...task, note: event.target.value })} /></label><button className="upload-button"><Plus size={16} />Добавить задачу</button></form></article>
      <article className="panel"><p className="eyebrow">События и наблюдения</p><h2>Зафиксировать событие</h2><form className="compact-form" onSubmit={(event) => { event.preventDefault(); onAddIncident({ ...parseAsset(incident.asset), title: incident.title, occurredOn: incident.occurredOn, severity: incident.severity, description: incident.description || undefined }); setIncident({ title: '', occurredOn: toLocalDateKey(), asset: '', severity: 'warning', description: '' }); }}><label>Кратко<input required className="form-input" value={incident.title} onChange={(event) => setIncident({ ...incident, title: event.target.value })} /></label><label>Дата<input className="form-input" type="date" value={incident.occurredOn} onChange={(event) => setIncident({ ...incident, occurredOn: event.target.value })} /></label><select className="form-input" value={incident.severity} onChange={(event) => setIncident({ ...incident, severity: event.target.value as IncidentRecord['severity'] })}><option value="info">Наблюдение</option><option value="warning">Требует внимания</option><option value="critical">Критично</option></select><AssetSelect assets={assets} value={incident.asset} onChange={(asset) => setIncident({ ...incident, asset })} /><label>Описание<textarea className="form-input" value={incident.description} onChange={(event) => setIncident({ ...incident, description: event.target.value })} /></label><button className="upload-button"><AlertTriangle size={16} />Сохранить событие</button></form></article>
      <article className="panel"><p className="eyebrow">Документы</p><h2>Учёт срока</h2><form className="compact-form" onSubmit={(event) => { event.preventDefault(); onAddDocument({ ...parseAsset(document.asset), title: document.title, documentType: document.documentType, expiresOn: document.expiresOn || undefined, reference: document.reference || undefined }); setDocument({ title: '', documentType: 'Страховка', expiresOn: '', asset: '', reference: '' }); }}><label>Название<input required className="form-input" value={document.title} onChange={(event) => setDocument({ ...document, title: event.target.value })} /></label><label>Тип<input className="form-input" value={document.documentType} onChange={(event) => setDocument({ ...document, documentType: event.target.value })} /></label><label>Действует до<input className="form-input" type="date" value={document.expiresOn} onChange={(event) => setDocument({ ...document, expiresOn: event.target.value })} /></label><AssetSelect assets={assets} value={document.asset} onChange={(asset) => setDocument({ ...document, asset })} /><label>Где хранится / номер<textarea className="form-input" value={document.reference} onChange={(event) => setDocument({ ...document, reference: event.target.value })} /></label><button className="upload-button"><FileText size={16} />Добавить документ</button></form></article>
    </section>
    <section className="operations-list-grid">
      <RecordList title="Задачи обслуживания" empty="Задач пока нет." items={tasks} icon={<Wrench size={17} />} render={(item) => <><strong>{item.title}</strong><p>{label(item.assetKind, item.assetId)} · {item.dueDate ? `срок ${item.dueDate}` : 'без срока'}{item.note ? ` · ${item.note}` : ''}</p><small>{item.status === 'completed' ? 'Выполнено' : item.status === 'in_progress' ? 'В работе' : 'Открыто'}</small>{item.status === 'open' && <button className="text-action" onClick={() => onTaskStatus(item.id, 'in_progress')}><Wrench size={15} />В работу</button>}{item.status !== 'completed' && item.status !== 'cancelled' && <button className="text-action" onClick={() => onTaskStatus(item.id, 'completed')}><CheckCircle2 size={15} />Выполнить</button>}</>} />
      <RecordList title="События и наблюдения" empty="Событий пока нет." items={incidents} icon={<AlertTriangle size={17} />} render={(item) => <><strong>{item.title}</strong><p>{label(item.assetKind, item.assetId)} · {item.occurredOn} · {item.description ?? 'без описания'}</p><small>{item.status === 'resolved' ? 'Закрыто' : item.severity === 'critical' ? 'Критичное событие' : 'Открыто'}</small>{item.status === 'open' && <button className="text-action" onClick={() => onIncidentStatus(item.id, 'resolved')}><CheckCircle2 size={15} />Закрыть</button>}</>} />
      <RecordList title="Документы и сроки" empty="Документы пока не добавлены." items={documents} icon={<FileText size={17} />} render={(item) => <><strong>{item.title}</strong><p>{item.documentType} · {label(item.assetKind, item.assetId)}{item.reference ? ` · ${item.reference}` : ''}</p><small>{documentExpiryLabel(item)}</small></>} />
    </section>
  </>;
}

function RecordList<T extends { id: string }>({ title, empty, items, icon, render }: { title: string; empty: string; items: T[]; icon: ReactNode; render: (item: T) => ReactNode }) {
  return <section className="panel operational-list"><div className="panel-heading"><div><p className="eyebrow">Учёт</p><h2>{title}</h2></div><span className="status-pill status-pill--warning">{items.length}</span></div>{items.length ? items.map((item) => <div className="list-row" key={item.id}><span className="row-status row-status--warning">{icon}</span><div>{render(item)}</div></div>) : <p className="empty-state">{empty}</p>}</section>;
}

function documentExpiryLabel(document: DocumentRecord) {
  if (!document.expiresOn) return 'Срок не указан';
  const status = getDocumentExpiryStatus(document);
  if (status === 'expired') return `Просрочен с ${document.expiresOn}`;
  if (status === 'expires_soon') return `Истекает ${document.expiresOn}`;
  return `Действует до ${document.expiresOn}`;
}
