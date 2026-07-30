import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, FileDown, Pencil, Plane, Plus, Trash2 } from 'lucide-react';
import { downloadSample } from '../appData';
import { getOperationalReportSummary, toLocalDateKey, type BatteryAsset, type ChecklistPhase, type ChecklistRun, type DocumentRecord, type DroneAsset, type FleetState, type IncidentRecord, type MaintenanceTask, type ManualFlightEntry, type OperationalReportFilters } from '../domain/fleet';

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

type FlightDraft = { flightDate: string; droneId: string; batteryId: string; pilot: string; purpose: string; durationMin: string; location: string; note: string };

function createFlightDraft(drones: DroneAsset[]): FlightDraft {
  return { flightDate: toLocalDateKey(), droneId: drones[0]?.id ?? '', batteryId: '', pilot: '', purpose: '', durationMin: '', location: '', note: '' };
}

export function JournalView({ drones, batteries, flights, checklistRuns, incidents, onAddFlight, onUpdateFlight, onRemoveFlight, onAddChecklist, onUpdateChecklist }: { drones: DroneAsset[]; batteries: BatteryAsset[]; flights: ManualFlightEntry[]; checklistRuns: ChecklistRun[]; incidents: IncidentRecord[]; onAddFlight: (input: Omit<ManualFlightEntry, 'id' | 'createdAt'>) => void; onUpdateFlight: (id: string, update: Partial<Omit<ManualFlightEntry, 'id' | 'createdAt'>>) => void; onRemoveFlight: (id: string) => void; onAddChecklist: (input: Omit<ChecklistRun, 'id' | 'completedAt'>) => void; onUpdateChecklist: (id: string, input: Omit<ChecklistRun, 'id' | 'completedAt'>) => void }) {
  const [form, setForm] = useState<FlightDraft>(() => createFlightDraft(drones));
  const [selectedFlightId, setSelectedFlightId] = useState('');
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null);
  const reversedFlights = useMemo(() => [...flights].sort((a, b) => b.flightDate.localeCompare(a.flightDate)), [flights]);
  const selectedFlight = flights.find((flight) => flight.id === selectedFlightId) ?? reversedFlights[0];
  const preflight = selectedFlight ? checklistRuns.find((item) => item.flightId === selectedFlight.id && item.phase === 'preflight') : undefined;
  const postflight = selectedFlight ? checklistRuns.find((item) => item.flightId === selectedFlight.id && item.phase === 'postflight') : undefined;
  const linkedIncidentCount = (flightId: string) => incidents.filter((incident) => incident.flightId === flightId).length;
  const saveFlight = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = { flightDate: form.flightDate, droneId: form.droneId, batteryId: form.batteryId || undefined, pilot: form.pilot, purpose: form.purpose, durationMin: Number(form.durationMin), location: form.location || undefined, note: form.note || undefined };
    if (editingFlightId) {
      onUpdateFlight(editingFlightId, input);
      setEditingFlightId(null);
    } else {
      onAddFlight(input);
    }
    setForm(createFlightDraft(drones));
  };
  const beginEdit = (flight: ManualFlightEntry) => {
    setEditingFlightId(flight.id);
    setForm({ flightDate: flight.flightDate, droneId: flight.droneId, batteryId: flight.batteryId ?? '', pilot: flight.pilot, purpose: flight.purpose, durationMin: String(flight.durationMin), location: flight.location ?? '', note: flight.note ?? '' });
  };
  return <>
    <section className="journal-intro panel"><div><p className="eyebrow">Отдельная услуга</p><h2>Цифровой журнал полётов</h2><p>Здесь пилот вручную фиксирует вылет и оба чек-листа. Запись не является техническим логом и не используется как анализ телеметрии.</p></div><ClipboardCheck size={42} /></section>
    <section className="operations-grid journal-grid">
      <article className="panel"><p className="eyebrow">{editingFlightId ? 'Редактирование' : 'Новая запись'}</p><h2>{editingFlightId ? 'Изменить вылет' : 'Внести полёт'}</h2><form className="compact-form" onSubmit={saveFlight}><label>Дата<input required className="form-input" type="date" value={form.flightDate} onChange={(event) => setForm({ ...form, flightDate: event.target.value })} /></label><label>Дрон<select required className="form-input" value={form.droneId} onChange={(event) => setForm({ ...form, droneId: event.target.value })}>{drones.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Батарея<select className="form-input" value={form.batteryId} onChange={(event) => setForm({ ...form, batteryId: event.target.value })}><option value="">Не указана</option>{batteries.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label><label>Пилот<input required className="form-input" value={form.pilot} onChange={(event) => setForm({ ...form, pilot: event.target.value })} /></label><label>Задача полёта<input required className="form-input" value={form.purpose} onChange={(event) => setForm({ ...form, purpose: event.target.value })} /></label><label>Длительность, мин<input required min="0" className="form-input" type="number" value={form.durationMin} onChange={(event) => setForm({ ...form, durationMin: event.target.value })} /></label><label>Место / проект<input className="form-input" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label><label>Замечания<textarea className="form-input" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label><div className="record-actions"><button className="upload-button"><Plus size={16} />{editingFlightId ? 'Сохранить изменения' : 'Сохранить запись'}</button>{editingFlightId && <button type="button" className="text-action" onClick={() => { setEditingFlightId(null); setForm(createFlightDraft(drones)); }}>Отменить</button>}</div></form></article>
      <ChecklistPanel flight={selectedFlight} phase="preflight" existing={preflight} onSave={onAddChecklist} onUpdate={onUpdateChecklist} />
      <ChecklistPanel flight={selectedFlight} phase="postflight" existing={postflight} onSave={onAddChecklist} onUpdate={onUpdateChecklist} />
    </section>
    <section className="panel operational-list"><div className="panel-heading"><div><p className="eyebrow">Внесено вручную</p><h2>Записи журнала</h2></div><span className="status-pill status-pill--good">{flights.length}</span></div>{reversedFlights.length ? reversedFlights.map((flight) => { const drone = drones.find((item) => item.id === flight.droneId); const battery = batteries.find((item) => item.id === flight.batteryId); const checks = checklistRuns.filter((item) => item.flightId === flight.id); const incidentCount = linkedIncidentCount(flight.id); return <article className={`history-row journal-row ${selectedFlight?.id === flight.id ? 'history-row--selected' : ''}`} key={flight.id}><button className="history-row__main" onClick={() => setSelectedFlightId(flight.id)}><span className="row-status row-status--good"><Plane size={17} /></span><div><strong>{flight.purpose}</strong><p>{drone?.name ?? 'Дрон не найден'} · {battery?.label ?? 'Батарея не указана'} · {flight.pilot}{flight.location ? ` · ${flight.location}` : ''}</p><small>{flight.note ?? 'Без замечаний'}{incidentCount ? ` · связанных событий: ${incidentCount}` : ''}</small></div><time>{flight.flightDate} · {flight.durationMin} мин<br />Чек-листы: {checks.length}/2</time></button><div className="record-actions"><button className="text-action" onClick={() => beginEdit(flight)}><Pencil size={15} />Изменить</button><button className="text-action text-action--danger" onClick={() => { if (window.confirm('Удалить ручную запись и её чек-листы? Связанные события останутся без ссылки на вылет.')) onRemoveFlight(flight.id); }}><Trash2 size={15} />Удалить</button></div></article>; }) : <p className="empty-state">Здесь появятся записи, которые пилот внёс вручную. Они остаются отдельными от файлов технического журнала.</p>}</section>
  </>;
}

function ChecklistPanel({ flight, phase, existing, onSave, onUpdate }: { flight?: ManualFlightEntry; phase: ChecklistPhase; existing?: ChecklistRun; onSave: (input: Omit<ChecklistRun, 'id' | 'completedAt'>) => void; onUpdate: (id: string, input: Omit<ChecklistRun, 'id' | 'completedAt'>) => void }) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const isPreflight = phase === 'preflight';
  useEffect(() => { setAnswers(existing?.answers ?? {}); setNote(existing?.note ?? ''); setEditing(false); }, [existing, flight?.id, phase]);
  if (!flight) return <article className="panel checklist-panel"><p className="eyebrow">{isPreflight ? 'Перед полётом' : 'После полёта'}</p><h2>Чек-лист</h2><p className="empty-state">Сначала добавьте запись о полёте, затем выберите её в списке.</p></article>;
  const save = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const input = { flightId: flight.id, phase, answers, note }; if (existing) { onUpdate(existing.id, input); setEditing(false); } else { onSave(input); setAnswers({}); setNote(''); } };
  return <article className="panel checklist-panel"><p className="eyebrow">{isPreflight ? 'Перед полётом' : 'После полёта'}</p><h2>{isPreflight ? 'Предполётный чек-лист' : 'Послеполётный чек-лист'}</h2><p className="checklist-flight">Запись: {flight.flightDate} · {flight.purpose}</p>{existing && !editing ? <><div className="checklist-done"><CheckCircle2 size={18} />Заполнен {new Date(existing.completedAt).toLocaleString('ru-RU')}</div><button className="text-action" onClick={() => setEditing(true)}><Pencil size={15} />Уточнить запись</button></> : <form className="compact-form" onSubmit={save}>{checklistItems[phase].map((item) => <label className="check-item" key={item.id}><input type="checkbox" checked={Boolean(answers[item.id])} onChange={(event) => setAnswers({ ...answers, [item.id]: event.target.checked })} />{item.label}</label>)}<label>Примечание<textarea className="form-input" value={note} onChange={(event) => setNote(event.target.value)} /></label><div className="record-actions"><button className="upload-button" disabled={checklistItems[phase].some((item) => !answers[item.id])}><CheckCircle2 size={16} />{existing ? 'Сохранить уточнение' : 'Подтвердить чек-лист'}</button>{existing && <button type="button" className="text-action" onClick={() => { setAnswers(existing.answers); setNote(existing.note ?? ''); setEditing(false); }}>Отменить</button>}</div></form>}</article>;
}

export function ReportsView({ drones, batteries, fleetState }: { drones: DroneAsset[]; batteries: BatteryAsset[]; fleetState: FleetState }) {
  const [filters, setFilters] = useState<OperationalReportFilters>({});
  const assetOptions = [...drones.map((drone) => ({ kind: 'drone' as const, id: drone.id, label: `Дрон · ${drone.name}` })), ...batteries.map((battery) => ({ kind: 'battery' as const, id: battery.id, label: `Батарея · ${battery.label}` }))];
  const summary = useMemo(() => getOperationalReportSummary(fleetState, filters), [fleetState, filters]);
  const selectedAsset = assetOptions.find((asset) => asset.kind === filters.assetKind && asset.id === filters.assetId)?.label ?? 'весь парк';
  const report = `Операционная сводка Пульс БВС\nПериод: ${filters.from || 'с начала учёта'} — ${filters.to || 'сегодня'}\nАктив: ${selectedAsset}\n\nВнесено вручную:\nПолётов: ${summary.flights.length}\nНалёт: ${summary.flightMinutes} мин\nЧек-листов: ${summary.checklistRuns.length}\nЗаписей с незавершёнными чек-листами: ${summary.incompleteChecklistFlightCount}\n\nКонтроль:\nОткрытых задач: ${summary.openTaskCount}\nОткрытых событий: ${summary.openIncidentCount}\nОткрытых критичных событий: ${summary.criticalOpenIncidentCount}\nДокументов на учёте: ${summary.documents.length}\n\nВажно: сведения о полётах введены вручную; они не заменяют технические журналы.`;
  const csv = ['Тип;Дата;Актив;Название;Статус;Примечание', ...summary.flights.map((flight) => `Ручной вылет;${flight.flightDate};${drones.find((drone) => drone.id === flight.droneId)?.name ?? flight.droneId};${flight.purpose};${flight.durationMin} мин;${flight.note ?? ''}`), ...summary.tasks.map((task: MaintenanceTask) => `Задача;${task.createdAt.slice(0, 10)};${task.assetId ?? ''};${task.title};${task.status};${task.note ?? ''}`), ...summary.incidents.map((incident: IncidentRecord) => `Событие;${incident.occurredOn};${incident.assetId ?? ''};${incident.title};${incident.status};${incident.description ?? ''}`), ...summary.documents.map((document: DocumentRecord) => `Документ;${document.createdAt.slice(0, 10)};${document.assetId ?? ''};${document.title};${document.expiresOn ?? 'без срока'};${document.reference ?? ''}`)].join('\n');
  return <>
    <section className="journal-intro panel"><div><p className="eyebrow">Операционная сводка</p><h2>Отчёты</h2><p>Сводка собрана из ручных записей, задач, событий и сроков документов. Файлы технических журналов в неё не подменяются.</p></div><div className="record-actions"><button className="upload-button" onClick={() => downloadSample('puls-bvs-operational-report.txt', report, 'text/plain;charset=utf-8')}><FileDown size={16} />Скачать сводку</button><button className="text-action" onClick={() => downloadSample('puls-bvs-operational-records.csv', `\uFEFF${csv}`, 'text/csv;charset=utf-8')}><FileDown size={16} />Скачать CSV</button></div></section>
    <section className="panel report-filters"><label>С даты<input className="form-input" type="date" value={filters.from ?? ''} onChange={(event) => setFilters({ ...filters, from: event.target.value || undefined })} /></label><label>По дату<input className="form-input" type="date" value={filters.to ?? ''} onChange={(event) => setFilters({ ...filters, to: event.target.value || undefined })} /></label><label>Актив<select className="form-input" value={filters.assetId ? `${filters.assetKind}:${filters.assetId}` : ''} onChange={(event) => { const [assetKind, assetId] = event.target.value.split(':'); setFilters({ ...filters, assetKind: assetId ? assetKind as 'drone' | 'battery' : undefined, assetId: assetId || undefined }); }}><option value="">Весь парк</option>{assetOptions.map((asset) => <option key={`${asset.kind}:${asset.id}`} value={`${asset.kind}:${asset.id}`}>{asset.label}</option>)}</select></label><button className="text-action" onClick={() => setFilters({})}>Сбросить</button></section>
    <section className="metric-grid"><ReportMetric value={String(summary.flights.length)} label="Ручных вылетов" /><ReportMetric value={`${summary.flightMinutes} мин`} label="Ручной налёт" /><ReportMetric value={String(summary.openTaskCount)} label="Открытых задач" /><ReportMetric value={String(summary.openIncidentCount)} label="Открытых событий" /></section>
    <section className="panel report-note"><p>{report}</p></section>
  </>;
}

function ReportMetric({ value, label }: { value: string; label: string }) { return <article className="metric-card metric-card--blue"><div className="metric-icon"><ClipboardCheck /></div><div><strong>{value}</strong><p>{label}</p><small>по внесённым записям</small></div></article>; }
