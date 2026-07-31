import { AlertTriangle, Bell, CheckCircle2, CircleHelp, CloudUpload, FileDown, FileUp, Settings, ShieldCheck } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';
import { demoLogs } from '../analytics/demoLogs';
import type { FlightAnalysis } from '../analytics/telemetry';
import { downloadSample, sampleCsv, sampleKml, sourceTemplate } from '../appData';
import type { ModalState, UserProfile } from '../appTypes';
import type { FileOriginNote, FleetState } from '../domain/fleet';

export type ModalProps = {
  modal: Exclude<ModalState, null>;
  setModal: (modal: ModalState) => void;
  fileInput: RefObject<HTMLInputElement | null>;
  backupInput: RefObject<HTMLInputElement | null>;
  chooseFile: (file?: File) => void;
  uploadedName: string | null;
  uploadError: string | null;
  primaryAlert: FlightAnalysis['alerts'][number] | undefined;
  loadDemo: (key: keyof typeof demoLogs) => void;
  loginDemo: (profile?: UserProfile) => void;
  user: UserProfile;
  setUser: (user: UserProfile) => void;
  fleetState: FleetState;
  selectAssets: (droneId: string, batteryId: string) => void;
  fileOriginNote: FileOriginNote;
  setFileOriginNote: (note: FileOriginNote) => void;
  backupMessage: string | null;
  onDownloadBackup: () => void;
  onRestoreBackup: (file?: File) => void;
};

export function Modal({ modal, setModal, fileInput, backupInput, chooseFile, uploadedName, uploadError, primaryAlert, loadDemo, loginDemo, user, setUser, fleetState, selectAssets, fileOriginNote, setFileOriginNote, backupMessage, onDownloadBackup, onRestoreBackup }: ModalProps) {
  return (
    <div className="modal-backdrop" data-testid="modal-backdrop" onMouseDown={() => setModal(null)}>
      <section className="upload-modal" data-testid={`modal-${modal}`} onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-button" onClick={() => setModal(null)} aria-label="Закрыть">×</button>
        {modal === 'upload' && <UploadModal fileInput={fileInput} chooseFile={chooseFile} uploadedName={uploadedName} uploadError={uploadError} loadDemo={loadDemo} fleetState={fleetState} selectAssets={selectAssets} fileOriginNote={fileOriginNote} setFileOriginNote={setFileOriginNote} />}
        {modal === 'auth' && <AuthModal user={user} setUser={setUser} loginDemo={loginDemo} />}
        {modal === 'lead' && <IconTitle icon={<Bell />} title="Заявка принята в демо-режиме" eyebrow="Пилот" text="В рабочей версии здесь будет форма заявки и уведомление ответственному специалисту." />}
        {modal === 'recommendation' && <IconTitle icon={<AlertTriangle />} title={primaryAlert?.title ?? 'Отклонений нет'} eyebrow="Рекомендация" text={primaryAlert?.recommendation ?? 'Продолжайте копить историю полётов и батарей.'} />}
        {modal === 'notifications' && <IconTitle icon={<Bell />} title="Уведомления" eyebrow="Пульс БВС" text="Здесь появятся письма и другие уведомления для ответственных людей по важным событиям." />}
        {modal === 'settings' && <SettingsModal backupInput={backupInput} backupMessage={backupMessage} onDownloadBackup={onDownloadBackup} onRestoreBackup={onRestoreBackup} />}
        {modal === 'help' && <HelpModal />}
      </section>
    </div>
  );
}

function HelpModal() {
  const steps = [
    { title: '1. Сохраните исходный файл у себя', text: 'Не меняйте оригинал журнала и храните его в отдельной закрытой папке вместе с заметкой, откуда он взят.' },
    { title: '2. Подготовьте копию для загрузки', text: 'Если в файле есть лишние чувствительные данные, загрузите рабочую копию без них. Имя файла, тип файла и способ получения запишите в карточке лога.' },
    { title: '3. Выберите дрон и батарею', text: 'Даже если батарея неизвестна, дайте ей понятное временное название: так потом будет ясно, к чему относится файл.' },
    { title: '4. Загрузите файл и проверьте результат', text: 'CSV/TXT/KML дают ограниченную проверку. Для DAT/ZIP/JSON демо создаёт только запись очереди с метаданными и пока не даёт выводов.' },
  ];
  const fileTypes = [
    { label: 'CSV/TXT', text: 'таблица с данными полёта, если в ней есть понятные поля' },
    { label: 'KML', text: 'маршрут и координаты, но не здоровье батареи' },
    { label: 'DAT/ZIP/JSON', text: 'только запись очереди с метаданными для отдельной проверки' },
  ];

  return (
    <>
      <IconTitle icon={<CircleHelp />} title="Как подготовить первый реальный файл" eyebrow="Помощь" text="Эта памятка помогает безопасно загрузить файл, записать, откуда он взят, и не получить неподтверждённые выводы." />
      <div className="help-steps">
        {steps.map((step) => (
          <article key={step.title}>
            <strong>{step.title}</strong>
            <p>{step.text}</p>
          </article>
        ))}
      </div>
      <div className="help-file-types">
        <strong>Что произойдёт с файлом</strong>
        {fileTypes.map((item) => <span key={item.label}><b>{item.label}</b>{item.text}</span>)}
      </div>
      <div className="help-warning">
        <AlertTriangle size={16} />
        <span>Новые правила чтения и оценки добавляются только после изучения реального файла без лишних чувствительных данных и с заполненной карточкой лога.</span>
      </div>
    </>
  );
}

function SettingsModal({ backupInput, backupMessage, onDownloadBackup, onRestoreBackup }: Pick<ModalProps, 'backupInput' | 'backupMessage' | 'onDownloadBackup' | 'onRestoreBackup'>) {
  return (
    <>
      <IconTitle icon={<Settings />} title="Настройки демо" eyebrow="Пульс БВС" text="Данные этого прототипа живут только в браузере. Сделайте резервную копию перед очисткой браузера или сменой устройства." />
      <section className="backup-panel" data-testid="backup-panel">
        <strong>Резервная копия локальных записей</strong>
        <p>Экспорт включает парк, ручной журнал, задачи, события, документы, расписания и записи проверок. Оригиналы файлов журналов и аккаунт в него не входят.</p>
        <div className="backup-actions">
          <button className="upload-button" data-testid="download-backup" onClick={onDownloadBackup}><FileDown size={16} />Скачать копию</button>
          <button className="text-action" data-testid="choose-backup" onClick={() => backupInput.current?.click()}><FileUp size={16} />Восстановить копию</button>
        </div>
        <input ref={backupInput} className="hidden-input" data-testid="backup-input" type="file" accept="application/json,.json" onChange={(event) => onRestoreBackup(event.target.files?.[0])} />
        <small>Восстановление заменит текущие локальные записи этого демо в браузере. Файл должен быть выгружен из «Пульс БВС» той же версии.</small>
        {backupMessage && <p className="backup-message" role="status">{backupMessage}</p>}
      </section>
    </>
  );
}

function UploadModal({ fileInput, chooseFile, uploadedName, uploadError, loadDemo, fleetState, selectAssets, fileOriginNote, setFileOriginNote }: Pick<ModalProps, 'fileInput' | 'chooseFile' | 'uploadedName' | 'uploadError' | 'loadDemo' | 'fleetState' | 'selectAssets' | 'fileOriginNote' | 'setFileOriginNote'>) {
  const intakeChecklist = [
    'Сначала выберите дрон и батарею, даже если батарея пока неизвестна.',
    'Файл из телефона или пульта полезен для маршрута, времени и части предупреждений.',
    'Для DAT/ZIP/JSON в демо сохраняется только запись очереди с метаданными; выводы не появляются, пока не подтверждено чтение данных.',
    'Исходный файл храните у себя; сюда загружайте рабочую копию без лишних чувствительных данных.',
  ];
  const sourceGuide = [
    { source: 'DJI Fly / телефон / пульт', gives: 'маршрут, время, высоту, скорость и часть предупреждений, если они есть в файле', limit: 'обычно не хватает подробных данных по батарее, ячейкам и обслуживанию' },
    { source: 'DJI Assistant 2', gives: 'более подробный файл о состоянии устройства', limit: 'его нужно проверить на реальном образце; DAT/ZIP/JSON не читаются наугад' },
    { source: 'KML из карты или сервиса планирования', gives: 'маршрут и координаты облёта', limit: 'не показывает состояние батареи, ошибки дрона и обслуживание' },
  ];

  return (
    <>
      <IconTitle icon={<CloudUpload />} title="Загрузите файл полёта" eyebrow="Загрузка данных" text="Выбор дрона и батареи только связывает файл с нужной записью. CSV/TXT/KML создают запись результата проверки. Для DAT/ZIP/JSON демо создаёт только запись очереди с метаданными: оригинал не хранится, а анализ не запускается до подтверждения чтения данных." />
      <div className="source-guide">
        <strong>Откуда брать файлы и что они дают</strong>
        {sourceGuide.map((item) => (
          <article key={item.source}>
            <b>{item.source}</b>
            <span>Даёт: {item.gives}.</span>
            <em>Ограничение: {item.limit}.</em>
          </article>
        ))}
      </div>
      <div className="intake-checklist">
        <strong>Готовность к реальным файлам</strong>
        {intakeChecklist.map((item) => <span key={item}><CheckCircle2 size={14} />{item}</span>)}
      </div>
      <div className="asset-picker">
        <label>Дрон
          <select data-testid="select-drone" value={fleetState.selectedDroneId} onChange={(event) => selectAssets(event.target.value, fleetState.selectedBatteryId)}>
            {fleetState.drones.map((drone) => <option value={drone.id} key={drone.id}>{drone.name}</option>)}
          </select>
        </label>
        <label>Батарея
          <select data-testid="select-battery" value={fleetState.selectedBatteryId} onChange={(event) => selectAssets(fleetState.selectedDroneId, event.target.value)}>
            {fleetState.batteries.map((battery) => <option value={battery.id} key={battery.id}>{battery.label}</option>)}
          </select>
        </label>
      </div>
      <div className="origin-note-form">
        <strong>Карточка файла</strong>
        <p>Короткая заметка сохранится вместе с записью о файле и поможет позже проверить его происхождение.</p>
        <label>Откуда получен файл
          <input className="form-input" data-testid="origin-source" value={fileOriginNote.source ?? ''} onChange={(event) => setFileOriginNote({ ...fileOriginNote, source: event.target.value })} placeholder="Например: телефон пилота, пульт, карта KML" />
        </label>
        <label>Дата или период полёта
          <input className="form-input" data-testid="origin-flight-date" value={fileOriginNote.flightDate ?? ''} onChange={(event) => setFileOriginNote({ ...fileOriginNote, flightDate: event.target.value })} placeholder="Например: 30.07, утро" />
        </label>
        <label>Сценарий полёта
          <input className="form-input" data-testid="origin-scenario" value={fileOriginNote.scenario ?? ''} onChange={(event) => setFileOriginNote({ ...fileOriginNote, scenario: event.target.value })} placeholder="Например: проверочный полёт без груза" />
        </label>
        <label>Что было скрыто из чувствительных данных
          <textarea className="form-input" data-testid="origin-hidden-data" value={fileOriginNote.hiddenData ?? ''} onChange={(event) => setFileOriginNote({ ...fileOriginNote, hiddenData: event.target.value })} placeholder="Например: точные координаты, имя пилота" />
        </label>
      </div>
      <p className="origin-note-local">Карточка файла в демо сохраняется только в этом браузере. Оригинал и важные заметки храните у себя в закрытой папке.</p>
      <input ref={fileInput} className="hidden-input" data-testid="file-input" type="file" onChange={(event) => chooseFile(event.target.files?.[0])} accept=".csv,.txt,.dat,.kml,.zip,.json" />
      <button className="drop-zone" data-testid="choose-file" onClick={() => fileInput.current?.click()}><CloudUpload size={23} /><strong>Выбрать файл</strong><span>CSV, TXT, DAT, KML, ZIP, JSON</span></button>
      {uploadedName && <div className="upload-result"><ShieldCheck size={18} />Загружен файл: «{uploadedName}».</div>}
      {uploadError && <div className="upload-error" role="alert">{uploadError}</div>}
      <div className="sample-actions">
        <button onClick={() => downloadSample('puls-bvs-sample.csv', sampleCsv, 'text/csv;charset=utf-8')}>Скачать пример CSV</button>
        <button onClick={() => downloadSample('puls-bvs-route.kml', sampleKml, 'application/vnd.google-earth.kml+xml;charset=utf-8')}>Скачать пример KML</button>
        <button onClick={() => downloadSample('puls-bvs-source-template.txt', sourceTemplate, 'text/plain;charset=utf-8')}>Шаблон карточки лога</button>
      </div>
      <div className="demo-actions">
        <button onClick={() => loadDemo('normal')}>Демо норма</button>
        <button onClick={() => loadDemo('degraded')}>Демо ухудшение</button>
        <button onClick={() => loadDemo('critical')}>Демо высокий риск</button>
      </div>
    </>
  );
}

function AuthModal({ user, setUser, loginDemo }: Pick<ModalProps, 'user' | 'setUser' | 'loginDemo'>) {
  return (
    <>
      <IconTitle icon={<ShieldCheck />} title="Демо-регистрация" eyebrow="Аккаунт" text="В демо данные аккаунта сохраняются только в этом браузере. Этого достаточно, чтобы проверить кабинет и загрузку файлов." />
      <input className="form-input" value={user.name} onChange={(event) => setUser({ ...user, name: event.target.value })} placeholder="Имя" />
      <input className="form-input" value={user.company} onChange={(event) => setUser({ ...user, company: event.target.value })} placeholder="Компания" />
      <input className="form-input" value={user.email} onChange={(event) => setUser({ ...user, email: event.target.value })} placeholder="Email" />
      <button className="upload-button modal-main-action" onClick={() => loginDemo(user)}>Создать демо-аккаунт</button>
    </>
  );
}

function IconTitle({ icon, title, eyebrow, text }: { icon: ReactNode; title: string; eyebrow: string; text: string }) {
  return <><div className="upload-symbol">{icon}</div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{text}</p></>;
}
