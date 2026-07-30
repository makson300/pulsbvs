import { AlertTriangle, Bell, CheckCircle2, CircleHelp, CloudUpload, Settings, ShieldCheck } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';
import { demoLogs } from '../analytics/demoLogs';
import type { FlightAnalysis } from '../analytics/telemetry';
import { downloadSample, sampleCsv, sampleKml, sourceTemplate } from '../appData';
import type { ModalState, UserProfile } from '../appTypes';
import type { FleetState } from '../domain/fleet';

export type ModalProps = {
  modal: Exclude<ModalState, null>;
  setModal: (modal: ModalState) => void;
  fileInput: RefObject<HTMLInputElement | null>;
  chooseFile: (file?: File) => void;
  uploadedName: string | null;
  primaryAlert: FlightAnalysis['alerts'][number] | undefined;
  loadDemo: (key: keyof typeof demoLogs) => void;
  loginDemo: (profile?: UserProfile) => void;
  user: UserProfile;
  setUser: (user: UserProfile) => void;
  fleetState: FleetState;
  selectAssets: (droneId: string, batteryId: string) => void;
};

export function Modal({ modal, setModal, fileInput, chooseFile, uploadedName, primaryAlert, loadDemo, loginDemo, user, setUser, fleetState, selectAssets }: ModalProps) {
  return (
    <div className="modal-backdrop" onMouseDown={() => setModal(null)}>
      <section className="upload-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-button" onClick={() => setModal(null)} aria-label="Закрыть">×</button>
        {modal === 'upload' && <UploadModal fileInput={fileInput} chooseFile={chooseFile} uploadedName={uploadedName} loadDemo={loadDemo} fleetState={fleetState} selectAssets={selectAssets} />}
        {modal === 'auth' && <AuthModal user={user} setUser={setUser} loginDemo={loginDemo} />}
        {modal === 'lead' && <IconTitle icon={<Bell />} title="Заявка принята в демо-режиме" eyebrow="Пилот" text="В рабочей версии здесь будет форма заявки и уведомление ответственному специалисту." />}
        {modal === 'recommendation' && <IconTitle icon={<AlertTriangle />} title={primaryAlert?.title ?? 'Отклонений нет'} eyebrow="Рекомендация" text={primaryAlert?.recommendation ?? 'Продолжайте копить историю полётов и батарей.'} />}
        {modal === 'notifications' && <IconTitle icon={<Bell />} title="Уведомления" eyebrow="Пульс БВС" text="Здесь появятся письма и другие уведомления для ответственных людей по важным событиям." />}
        {modal === 'settings' && <IconTitle icon={<Settings />} title="Настройки" eyebrow="Пульс БВС" text="Следующий этап: права доступа, правила предупреждений, данные организации и объём проверок по тарифу." />}
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
    { title: '4. Загрузите файл и проверьте результат', text: 'CSV/TXT/KML дают ограниченную проверку. DAT/ZIP/JSON только сохраняются на разбор и пока не дают выводов.' },
  ];
  const fileTypes = [
    { label: 'CSV/TXT', text: 'таблица с данными полёта, если в ней есть понятные поля' },
    { label: 'KML', text: 'маршрут и координаты, но не здоровье батареи' },
    { label: 'DAT/ZIP/JSON', text: 'только сохранение на отдельную проверку' },
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

function UploadModal({ fileInput, chooseFile, uploadedName, loadDemo, fleetState, selectAssets }: Pick<ModalProps, 'fileInput' | 'chooseFile' | 'uploadedName' | 'loadDemo' | 'fleetState' | 'selectAssets'>) {
  const intakeChecklist = [
    'Сначала выберите дрон и батарею, даже если батарея пока неизвестна.',
    'Файл из телефона или пульта полезен для маршрута, времени и части предупреждений.',
    'DAT/ZIP/JSON сохраняются на отдельную проверку и не дают выводов, пока не подтверждено чтение данных.',
    'Исходный файл храните у себя; сюда загружайте рабочую копию без лишних чувствительных данных.',
  ];
  const sourceGuide = [
    { source: 'DJI Fly / телефон / пульт', gives: 'маршрут, время, высоту, скорость и часть предупреждений, если они есть в файле', limit: 'обычно не хватает подробных данных по батарее, ячейкам и обслуживанию' },
    { source: 'DJI Assistant 2', gives: 'более подробный файл о состоянии устройства', limit: 'его нужно проверить на реальном образце; DAT/ZIP/JSON не читаются наугад' },
    { source: 'KML из карты или сервиса планирования', gives: 'маршрут и координаты облёта', limit: 'не показывает состояние батареи, ошибки дрона и обслуживание' },
  ];

  return (
    <>
      <IconTitle icon={<CloudUpload />} title="Загрузите файл полёта" eyebrow="Загрузка данных" text="Выбор дрона и батареи только связывает файл с нужной записью. CSV/TXT/KML сохраняются в историю. DAT/ZIP/JSON принимаются, но до проверки чтения данных не анализируются и не становятся записью полёта." />
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
          <select value={fleetState.selectedDroneId} onChange={(event) => selectAssets(event.target.value, fleetState.selectedBatteryId)}>
            {fleetState.drones.map((drone) => <option value={drone.id} key={drone.id}>{drone.name}</option>)}
          </select>
        </label>
        <label>Батарея
          <select value={fleetState.selectedBatteryId} onChange={(event) => selectAssets(fleetState.selectedDroneId, event.target.value)}>
            {fleetState.batteries.map((battery) => <option value={battery.id} key={battery.id}>{battery.label}</option>)}
          </select>
        </label>
      </div>
      <input ref={fileInput} className="hidden-input" type="file" onChange={(event) => chooseFile(event.target.files?.[0])} accept=".csv,.txt,.dat,.kml,.zip,.json" />
      <button className="drop-zone" onClick={() => fileInput.current?.click()}><CloudUpload size={23} /><strong>Выбрать файл</strong><span>CSV, TXT, DAT, KML, ZIP, JSON</span></button>
      {uploadedName && <div className="upload-result"><ShieldCheck size={18} />Загружен файл: «{uploadedName}».</div>}
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
