import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, FileDown, Plane, Plus } from 'lucide-react';
import { downloadSample } from '../appData';
import type { BatteryAsset, ChecklistPhase, ChecklistRun, DroneAsset, ManualFlightEntry } from '../domain/fleet';

const checklistItems: Record<ChecklistPhase, { id: string; label: string }[]> = {
  preflight: [
    { id: 'airframe', label: 'Корпус и винты осмотрены' },
    { id: 'battery', label: 'Батарея установлена и проверена' },
    { id: 'airspace', label: 'Условия и место полёта оценены' },
    { id: 'mission', label: 'Задача и маршрут понятны пилоту' },
  ],
  postflight: [
    { id: 'inspection', label: 'Техника осмотрена после полёта' },
    { id: 'batteryRemoved', label: 'Батарея снята и отмечена' },
    { id: 'notes', label: 'Замечания внесены в журнал' },
    { id: 'storage', label: 'Техника подготовлена к хранению' },
  ],
};

export function JournalView({ drones, batteries, flights, checklistRuns, onAddFlight, onAddChecklist }: { drones: DroneAsset[]; batteries: BatteryAsset[]; flights: ManualFlightEntry[]; checklistRuns: ChecklistRun[]; onAddFlight: (input: Omit<ManualFlightEntry, 'id' | 'createdAt'>) => void; onAddChecklist: (input: Omit<ChecklistRun, 'id' | 'completedAt'>) => void }) {
  const [form, setForm] = useState({ flightDate: new Date().toISOString().slice(0, 10), droneId: drones[0]?.id ?? '', batteryId: '', pilot: '', purpose: '', durationMin: '', location: '', note: '' });
  const [selectedFlightId, setSelectedFlightId] = useState('');
  const reversedFlights = useMemo(() => [...flights].sort((a, b) => b.flightDate.localeCompare(a.flightDate)), [flights]);
  const selectedFlight = flights.find((flight) => flight.id === selectedFlightId) ?? reversedFlights[0];
  const preflight = selectedFlight ? checklistRuns.find((item) => item.flightId === selectedFlight.id && item.phase === 'preflight') : undefined;
  const postflight = selectedFlight ? checklistRuns.find((item) => item.flightId === selectedFlight.id && item.phase === 'postflight') : undefined;

  return <>
    <section className="journal-intro panel"><div><p className="eyebrow">Отдельная услуга</p><h2>Цифровой журнал полётов</h2><p>Здесь пилот вручную фиксирует вылет и оба чек-листа. Эта запись не является техническим логом и не используется как анализ телеметрии.</p></div><ClipboardCheck size={42} /></section>
    <section className="operations-grid journal-grid">
      <article className="panel"><p className="eyebrow">Новая запись</p><h2>Внести полёт</h2><form className="compact-form" onSubmit={(event) => { event.preventDefault(); onAddFlight({ flightDate: form.flightDate, droneId: form.droneId, batteryId: form.batteryId || undefined, pilot: form.pilot, purpose: form.purpose, durationMin: Number(form.durationMin), location: form.location || undefined, note: form.note || undefined }); setForm({ ...form, purpose: '', durationMin: '', location: '', note: '' }); }}><label>Дата<input required className="form-input" type="date" value={form.flightDate} onChange={(event) => setForm({ ...form, flightDate: event.target.value })} /></label><label>Дрон<select required className="form-input" value={form.droneId} onChange={(event) => setForm({ ...form, droneId: event.target.value })}>{drones.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Батарея<select className="form-input" value={form.batteryId} onChange={(event) => setForm({ ...form, batteryId: event.target.value })}><option value="">Не указана</option>{batteries.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label><label>Пилот<input required className="form-input" value={form.pilot} onChange={(event) => setForm({ ...form, pilot: event.target.value })} /></label><label>Задача полёта<input required className="form-input" value={form.purpose} onChange={(event) => setForm({ ...form, purpose: event.target.value })} /></label><label>Длительность, мин<input required min="0" className="form-input" type="number" value={form.durationMin} onChange={(event) => setForm({ ...form, durationMin: event.target.value })} /></label><label>Место / проект<input className="form-input" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label><label>Замечания<textarea className="form-input" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label><button className="upload-button"><Plus size={16} />Сохранить запись</button></form></article>
      <ChecklistPanel flight={selectedFlight} phase="preflight" existing={preflight} onSave={onAddChecklist} />
      <ChecklistPanel flight={selectedFlight} phase="postflight" existing={postflight} onSave={onAddChecklist} />
    </section>
    <section className="panel operational-list"><div className="panel-heading"><div><p className="eyebrow">Внесено вручную</p><h2>Записи журнала</h2></div><span className="status-pill status-pill--good">{flights.length}</span></div>{reversedFlights.length ? reversedFlights.map((flight) => { const drone = drones.find((item) => item.id === flight.droneId); const battery = batteries.find((item) => item.id === flight.batteryId); const checks = checklistRuns.filter((item) => item.flightId === flight.id); return <button className={`history-row ${selectedFlight?.id === flight.id ? 'history-row--selected' : ''}`} key={flight.id} onClick={() => setSelectedFlightId(flight.id)}><span className="row-status row-status--good"><Plane size={17} /></span><div><strong>{flight.purpose}</strong><p>{drone?.name ?? 'Дрон не найден'} · {battery?.label ?? 'Батарея не указана'} · {flight.pilot}{flight.location ? ` · ${flight.location}` : ''}</p><small>{flight.note ?? 'Без замечаний'}</small></div><time>{flight.flightDate} · {flight.durationMin} мин<br />Чек-листы: {checks.length}/2</time></button>; }) : <p className="empty-state">Здесь появятся записи, которые пилот внёс вручную. Они остаются отдельными от файлов технического журнала.</p>}</section>
  </>;
}

function ChecklistPanel({ flight, phase, existing, onSave }: { flight?: ManualFlightEntry; phase: ChecklistPhase; existing?: ChecklistRun; onSave: (input: Omit<ChecklistRun, 'id' | 'completedAt'>) => void }) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');
  const isPreflight = phase === 'preflight';
  if (!flight) return <article className="panel checklist-panel"><p className="eyebrow">{isPreflight ? 'Перед полётом' : 'После полёта'}</p><h2>Чек-лист</h2><p className="empty-state">Сначала добавьте запись о полёте, затем выберите её в списке.</p></article>;
  const savedAnswers = existing?.answers ?? answers;
  return <article className="panel checklist-panel"><p className="eyebrow">{isPreflight ? 'Перед полётом' : 'После полёта'}</p><h2>{isPreflight ? 'Предполётный чек-лист' : 'Послеполётный чек-лист'}</h2><p className="checklist-flight">Запись: {flight.flightDate} · {flight.purpose}</p>{existing ? <div className="checklist-done"><CheckCircle2 size={18} />Заполнен {new Date(existing.completedAt).toLocaleString('ru-RU')}</div> : <form className="compact-form" onSubmit={(event) => { event.preventDefault(); onSave({ flightId: flight.id, phase, answers, note }); setAnswers({}); setNote(''); }}>{checklistItems[phase].map((item) => <label className="check-item" key={item.id}><input type="checkbox" checked={Boolean(savedAnswers[item.id])} onChange={(event) => setAnswers({ ...answers, [item.id]: event.target.checked })} />{item.label}</label>)}<label>Примечание<textarea className="form-input" value={note} onChange={(event) => setNote(event.target.value)} /></label><button className="upload-button" disabled={checklistItems[phase].some((item) => !answers[item.id])}><CheckCircle2 size={16} />Подтвердить чек-лист</button></form>}</article>;
}

export function ReportsView({ drones, batteries, flights, tasks, incidents, documents, checklistRuns }: { drones: DroneAsset[]; batteries: BatteryAsset[]; flights: ManualFlightEntry[]; tasks: { status: string }[]; incidents: { status: string; severity: string }[]; documents: { expiresOn?: string }[]; checklistRuns: ChecklistRun[] }) {
  const flightMinutes = flights.reduce((sum, item) => sum + item.durationMin, 0);
  const report = `Операционная сводка Пульс БВС\n\nВнесено вручную:\nПолётов: ${flights.length}\nНалёт: ${flightMinutes} мин\nЧек-листов: ${checklistRuns.length}\n\nКонтроль:\nОткрытых задач: ${tasks.filter((item) => item.status !== 'completed' && item.status !== 'cancelled').length}\nОткрытых критичных событий: ${incidents.filter((item) => item.status === 'open' && item.severity === 'critical').length}\nДокументов на учёте: ${documents.length}\n\nВажно: сведения о полётах введены вручную; они не заменяют технические журналы.`;
  return <>
    <section className="journal-intro panel"><div><p className="eyebrow">Операционная сводка</p><h2>Отчёты</h2><p>Сводка собрана из ручных записей, задач, событий и сроков документов. Файлы технических журналов в неё не подменяются.</p></div><button className="upload-button" onClick={() => downloadSample('puls-bvs-operational-report.txt', report, 'text/plain;charset=utf-8')}><FileDown size={16} />Скачать сводку</button></section>
    <section className="metric-grid"><ReportMetric value={String(drones.length)} label="Дронов в учёте" /><ReportMetric value={`${flightMinutes} мин`} label="Ручной налёт" /><ReportMetric value={String(tasks.filter((item) => item.status !== 'completed' && item.status !== 'cancelled').length)} label="Открытых задач" /><ReportMetric value={String(documents.length)} label="Документов на учёте" /></section>
    <section className="panel report-note"><p>{report}</p></section>
  </>;
}

function ReportMetric({ value, label }: { value: string; label: string }) { return <article className="metric-card metric-card--blue"><div className="metric-icon"><ClipboardCheck /></div><div><strong>{value}</strong><p>{label}</p><small>по внесённым записям</small></div></article>; }
