import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BatteryCharging,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  CloudUpload,
  Gauge,
  LayoutDashboard,
  Menu,
  Plane,
  Settings,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { demoLogs } from './analytics/demoLogs';
import { analyzeTelemetry, parseTelemetryCsv, parseTelemetryFile, type FlightAnalysis } from './analytics/telemetry';
import {
  createBatteryAsset,
  createDroneAsset,
  createPendingImport,
  createSavedImport,
  loadFleetState,
  saveFleetState,
  upsertImport,
  upsertPendingImport,
  type BatteryAsset,
  type DroneAsset,
  type FleetState,
  type PendingTelemetryImport,
  type SavedTelemetryImport,
} from './domain/fleet';

type Section = 'overview' | 'fleet' | 'batteries' | 'flights' | 'maintenance';
type ModalState = 'upload' | 'recommendation' | 'notifications' | 'settings' | 'help' | 'auth' | 'lead' | null;
type UserProfile = { name: string; company: string; email: string; plan: string };
type View = 'landing' | 'dashboard';

type NavItem = { id: Section; label: string; icon: LucideIcon };
type ListRow = { icon: ReactNode; tone: string; title: string; text: string; meta: string };

const defaultUser: UserProfile = {
  name: 'Иван Петров',
  company: 'АгроСфера',
  email: 'demo@pulsbvs.ru',
  plan: 'Флот',
};

const navItems: NavItem[] = [
  { id: 'overview', label: 'Обзор', icon: LayoutDashboard },
  { id: 'fleet', label: 'Флот', icon: Plane },
  { id: 'batteries', label: 'Батареи', icon: BatteryCharging },
  { id: 'flights', label: 'Полёты', icon: Activity },
  { id: 'maintenance', label: 'Техническое обслуживание', icon: Wrench },
];

const flights = [
  { id: 'FL-2048', drone: 'DJI Avata 2', date: 'Сегодня 09:18', duration: '6 мин', result: 'warning', text: 'Демо-лог с базовой телеметрией' },
  { id: 'FL-2047', drone: 'DJI Avata 360', date: 'Вчера 17:40', duration: '11 мин', result: 'ok', text: 'Маршрутный источник без батарейных выводов' },
  { id: 'FL-2046', drone: 'DJI Mini 4 Pro', date: 'Вчера 12:05', duration: '18 мин', result: 'ok', text: 'Тестовый источник для парсера' },
];

const maintenance = [
  { target: 'DJI Mini 4 Pro', type: 'Проверить source.txt для первого лога', due: 'Перед импортом', status: 'Открыто', tone: 'warning' },
  { target: 'Батарея без серийного номера', type: 'Заполнить псевдоним и происхождение', due: 'До анализа', status: 'Ожидает', tone: 'warning' },
  { target: 'DJI Avata 2', type: 'Подготовить рабочую копию лога', due: 'После получения файла', status: 'Назначено', tone: 'ok' },
];

const pricing = [
  { name: 'Старт', price: '4 900 ₽', assets: 'до 3 дронов', logs: '60 анализов/мес', note: 'для пилотов и малых подрядчиков' },
  { name: 'Флот', price: '14 900 ₽', assets: 'до 15 дронов', logs: '400 анализов/мес', note: 'для агроподрядчиков' },
  { name: 'Enterprise', price: 'по договору', assets: '50+ дронов', logs: 'лимиты по SLA', note: 'on-premise, API, роли, SLA' },
];

const severityText = { info: 'Информация', warning: 'Внимание', critical: 'Критично' } as const;
const capabilityText = {
  route_only: 'Только маршрут',
  battery_basic: 'Базовая батарея',
  battery_extended: 'Расширенная батарея',
} as const;

const sampleCsv = 'timestamp,latitude,longitude,battery_percent,pack_voltage,battery_temperature,cell1,cell2,cell3,cell4,warning\n2026-07-30T09:00:00Z,55.7512,37.6184,94,51.2,32,4.18,4.17,4.18,4.17,\n2026-07-30T09:03:00Z,55.7520,37.6201,86,49.8,36,4.08,4.06,4.08,4.07,voltage sag';
const sampleKml = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>Пример маршрута</name><LineString><coordinates>37.6184,55.7512,180 37.6201,55.7520,182 37.6215,55.7531,181</coordinates></LineString></Placemark></Document></kml>';
const sourceTemplate = `Карточка происхождения лога для Пульс БВС

1. Аппарат
Модель дрона:
Бортовой номер / псевдоним без серийного номера:
Модель пульта:
Модель очков, если были:

2. Источник файла
Откуда выгружено: DJI Fly / телефон / пульт / DJI Assistant 2 / SmartFarm-KML / другое
Точный путь или меню выгрузки:
Исходное имя файла:
Расширение файла:
Дата и время копирования:

3. Полёт
Дата полёта:
Примерная длительность:
Сценарий: штатный / предупреждение / ошибка / тест
Краткое описание события:

4. Батарея
ID батареи или псевдоним:
Уровень заряда до полёта, если известен:
Уровень заряда после полёта, если известен:
Были ли предупреждения по батарее:

5. Приватность
Что обезличено:
Есть ли чувствительные координаты: да / нет
Можно ли использовать файл для разработки адаптера: да / нет / уточнить

Важно: реальные оригиналы хранить вне Git. В сервис загружать рабочую копию.`;

function loadUserProfile(): UserProfile {
  try {
    return { ...defaultUser, ...JSON.parse(localStorage.getItem('puls-bvs-user') || '{}') };
  } catch {
    return defaultUser;
  }
}

function downloadSample(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [view, setView] = useState<View>(() => (localStorage.getItem('puls-bvs-user') ? 'dashboard' : 'landing'));
  const [user, setUser] = useState<UserProfile>(() => loadUserProfile());
  const [section, setSection] = useState<Section>('overview');
  const [modal, setModal] = useState<ModalState>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [fleetState, setFleetState] = useState<FleetState>(() => loadFleetState());
  const [analysis, setAnalysis] = useState<FlightAnalysis>(() =>
    fleetState.imports[0]?.analysis ?? analyzeTelemetry(parseTelemetryCsv(demoLogs.degraded.label, demoLogs.degraded.content)),
  );
  const fileInput = useRef<HTMLInputElement>(null);

  const primaryAlert = analysis.battery.alerts[0];
  const barValues = useMemo(
    () => analysis.parsed.rows.slice(-7).map((row) => Math.max(18, Math.min(100, row.batteryPercent ?? 50))),
    [analysis],
  );

  useEffect(() => saveFleetState(fleetState), [fleetState]);

  const loginDemo = (profile = user) => {
    localStorage.setItem('puls-bvs-user', JSON.stringify(profile));
    setUser(profile);
    setView('dashboard');
    setModal(null);
  };

  function selectAssets(droneId: string, batteryId: string) {
    setFleetState((state) => ({ ...state, selectedDroneId: droneId, selectedBatteryId: batteryId }));
  }

  function persistAnalysis(nextAnalysis: FlightAnalysis, sourceName: string, targetSection: Section) {
    setUploadedName(sourceName);
    setAnalysis(nextAnalysis);
    setFleetState((state) => {
      const saved = createSavedImport(nextAnalysis, state.selectedDroneId, state.selectedBatteryId);
      const pending = createPendingImport(nextAnalysis, state.selectedDroneId, state.selectedBatteryId);
      if (pending) return upsertPendingImport(state, pending);
      return saved ? upsertImport(state, saved) : state;
    });
    setSection(targetSection);
    setView('dashboard');
    setModal(null);
  }

  async function chooseFile(file?: File) {
    if (!file) return;
    const content = await file.text();
    persistAnalysis(analyzeTelemetry(parseTelemetryFile(file.name, content)), file.name, 'flights');
  }

  function loadDemo(key: keyof typeof demoLogs) {
    const demo = demoLogs[key];
    persistAnalysis(analyzeTelemetry(parseTelemetryCsv(demo.label, demo.content)), demo.label, 'overview');
  }

  function openSavedImport(item: SavedTelemetryImport) {
    setUploadedName(item.sourceName);
    setAnalysis(item.analysis);
    setFleetState((state) => ({ ...state, selectedDroneId: item.droneId, selectedBatteryId: item.batteryId }));
    setSection('flights');
  }

  function addDrone() {
    const name = prompt('Название дрона', `Дрон ${fleetState.drones.length + 1}`);
    if (name === null) return;
    const model = prompt('Модель дрона', 'DJI Mini 4 Pro');
    if (model === null) return;
    const drone = createDroneAsset(name, model);
    setFleetState((state) => ({ ...state, drones: [...state.drones, drone], selectedDroneId: drone.id }));
  }

  function addBattery() {
    const label = prompt('ID батареи', `BT-${String(fleetState.batteries.length + 1).padStart(3, '0')}`);
    if (label === null) return;
    const battery = createBatteryAsset(label);
    setFleetState((state) => {
      const existing = state.batteries.find((item) => item.id === battery.id);
      if (existing) return { ...state, selectedBatteryId: existing.id };
      return { ...state, batteries: [...state.batteries, battery], selectedBatteryId: battery.id };
    });
  }

  const modalProps: ModalProps = {
    modal: modal as Exclude<ModalState, null>,
    setModal,
    fileInput,
    chooseFile,
    uploadedName,
    primaryAlert,
    loadDemo,
    loginDemo,
    user,
    setUser,
    fleetState,
    selectAssets,
  };

  if (view === 'landing') {
    return (
      <>
        <Landing setView={setView} setModal={setModal} loadDemo={loadDemo} />
        {modal && <Modal {...modalProps} />}
      </>
    );
  }

  const sectionTitle = navItems.find((item) => item.id === section)?.label ?? 'Обзор';

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        activeSection={section}
        menuOpen={menuOpen}
        onSectionChange={(nextSection) => {
          setSection(nextSection);
          setMenuOpen(false);
        }}
        onHome={() => {
          setView('landing');
          setMenuOpen(false);
        }}
        onSettings={() => setModal('settings')}
        onHelp={() => setModal('help')}
      />

      <main className="main-content">
        <Topbar
          user={user}
          sectionTitle={sectionTitle}
          onMenu={() => setMenuOpen(!menuOpen)}
          onNotifications={() => setModal('notifications')}
          onUpload={() => setModal('upload')}
        />

        <PageHeader sectionTitle={sectionTitle} sourceName={uploadedName ?? analysis.parsed.sourceName} qualityScore={analysis.quality.score} />

        {section === 'overview' && (
          <Overview
            analysis={analysis}
            barValues={barValues}
            primaryAlert={primaryAlert}
            openRecommendation={() => setModal('recommendation')}
            loadDemo={loadDemo}
            droneCount={fleetState.drones.length}
            importCount={fleetState.imports.length}
          />
        )}
        {section === 'fleet' && <FleetView drones={fleetState.drones} batteries={fleetState.batteries} onAddDrone={addDrone} />}
        {section === 'batteries' && <BatteriesView batteries={fleetState.batteries} onAddBattery={addBattery} />}
        {section === 'flights' && (
          <FlightsView
            analysis={analysis}
            imports={fleetState.imports}
            pendingImports={fleetState.pendingImports}
            drones={fleetState.drones}
            batteries={fleetState.batteries}
            onOpenImport={openSavedImport}
          />
        )}
        {section === 'maintenance' && <MaintenanceView />}
      </main>

      {modal && <Modal {...modalProps} />}
    </div>
  );
}

function Sidebar({
  user,
  activeSection,
  menuOpen,
  onSectionChange,
  onHome,
  onSettings,
  onHelp,
}: {
  user: UserProfile;
  activeSection: Section;
  menuOpen: boolean;
  onSectionChange: (section: Section) => void;
  onHome: () => void;
  onSettings: () => void;
  onHelp: () => void;
}) {
  return (
    <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`} aria-label="Основная навигация">
      <button className="brand brand--button" onClick={onHome} aria-label="Перейти на главную">
        <span className="brand-mark"><Activity size={20} /></span>
        <span>ПУЛЬС <b>БВС</b></span>
      </button>

      <div className="workspace-switcher">
        <span className="avatar">{user.company.slice(0, 2).toUpperCase()}</span>
        <div>
          <strong>{user.company}</strong>
          <small>Тариф: {user.plan}</small>
        </div>
        <ChevronDown size={16} />
      </div>

      <nav aria-label="Разделы кабинета">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button className={`nav-item ${activeSection === id ? 'nav-item--active' : ''}`} key={id} onClick={() => onSectionChange(id)}>
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom" data-testid="sidebar-footer">
        <button className="nav-item" onClick={onHome}><ArrowUpRight size={19} /><span>Главная</span></button>
        <button className="nav-item" onClick={onSettings}><Settings size={19} /><span>Настройки</span></button>
        <button className="nav-item" onClick={onHelp}><CircleHelp size={19} /><span>Помощь</span></button>
        <div className="profile">
          <span className="avatar avatar--blue">{user.name.slice(0, 2).toUpperCase()}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({
  user,
  sectionTitle,
  onMenu,
  onNotifications,
  onUpload,
}: {
  user: UserProfile;
  sectionTitle: string;
  onMenu: () => void;
  onNotifications: () => void;
  onUpload: () => void;
}) {
  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={onMenu} aria-label="Открыть меню"><Menu /></button>
      <div className="breadcrumb"><span>{user.company}</span><span>/</span><b>{sectionTitle}</b></div>
      <div className="top-actions">
        <button className="icon-button" onClick={onNotifications} aria-label="Уведомления"><Bell size={19} /><i /></button>
        <button className="upload-button" onClick={onUpload}><CloudUpload size={18} />Загрузить лог</button>
      </div>
    </header>
  );
}

function PageHeader({ sectionTitle, sourceName, qualityScore }: { sectionTitle: string; sourceName: string; qualityScore: number }) {
  return (
    <section className="page-header">
      <div>
        <p className="eyebrow">Центр контроля флота</p>
        <h1>{sectionTitle}</h1>
        <p className="page-subtitle">Активный источник: {sourceName}</p>
      </div>
      <div className="system-status">
        <span />
        <div>
          <strong>Система работает штатно</strong>
          <small>Качество данных: {qualityScore}%</small>
        </div>
      </div>
    </section>
  );
}

function Landing({ setView, setModal, loadDemo }: { setView: (view: View) => void; setModal: (modal: ModalState) => void; loadDemo: (key: keyof typeof demoLogs) => void }) {
  const landingStats = [
    ['1 окно', 'флот, батареи, импорты и задачи ТО'],
    ['до полёта', 'видны слабые места в данных и батарее'],
    ['B2B', 'контроль доступа, приватность, on-prem контур'],
  ];

  return (
    <main className="landing">
      <nav className="landing-nav">
        <div className="brand"><span className="brand-mark"><Activity size={20} /></span><span>ПУЛЬС <b>БВС</b></span></div>
        <div>
          <button onClick={() => setView('dashboard')}>Демо-кабинет</button>
          <button className="landing-primary" onClick={() => setModal('auth')}>Создать аккаунт</button>
        </div>
      </nav>

      <section className="hero">
        <div>
          <p className="eyebrow">Цифровой журнал эксплуатации БВС</p>
          <h1>Флот, батареи и журналы полётов — в одном понятном контуре</h1>
          <p>Пульс БВС помогает операторам и агроподрядчикам навести порядок в данных: привязать журналы к дронам и батареям, увидеть качество импорта, зафиксировать предупреждения и не потерять задачи обслуживания.</p>
          <div className="hero-actions">
            <button className="landing-primary" onClick={() => setModal('auth')}>Обсудить пилот</button>
            <button onClick={() => setView('dashboard')}>Открыть демо-кабинет</button>
            <button onClick={() => loadDemo('critical')}>Показать пример риска</button>
          </div>
          <div className="hero-proof">
            {landingStats.map(([value, label]) => <span key={value}><b>{value}</b>{label}</span>)}
          </div>
        </div>
        <aside className="hero-card">
          <div className="hero-card-top">
            <span className="status-pill status-pill--warning">Пилотный контур</span>
            <small>пример интерфейса</small>
          </div>
          <h2>Перед вылетом видно, чему можно доверять</h2>
          <div className="signal-list">
            <span><b>Качество данных</b><em>CSV/KML читается, DAT/ZIP требуют исследования</em></span>
            <span><b>Батарея</b><em>просадка и разбаланс подсвечены как риск</em></span>
            <span><b>ТО</b><em>задача не теряется после импорта журнала</em></span>
          </div>
          <div className="quality-scale"><i style={{ width: '74%' }} /></div>
          <small>Индекс примера: 74/100 — не замена диагностике, а повод проверить батарею.</small>
        </aside>
      </section>

      <section className="landing-grid">
        <LandingCard kicker="01" title="Навести порядок" items={['Единый реестр дронов и батарей', 'История импортов привязана к активам', 'Понятно, какой файл дал какие выводы']} />
        <LandingCard kicker="02" title="Снизить операционный риск" items={['Подсветка просадки, температуры и качества данных', 'Объяснение риска простым языком', 'ТО превращается в задачу, а не в заметку в чате']} />
        <LandingCard kicker="03" title="Готовить B2B-контур" items={['Без Telegram как обязательного канала', 'Приватность журналов и коммерческой информации', 'Архитектура под backend, роли и on-prem']} />
      </section>

      <section className="workflow-section">
        <div>
          <p className="eyebrow">Логика работы</p>
          <h2>От файла журнала до решения по эксплуатации</h2>
        </div>
        <div className="workflow-grid">
          {['Загрузить журнал', 'Проверить качество данных', 'Связать с дроном и батареей', 'Получить риск и задачу ТО'].map((step, index) => (
            <article className="workflow-step" key={step}><span>{index + 1}</span><strong>{step}</strong></article>
          ))}
        </div>
      </section>

      <section className="pricing-section">
        <p className="eyebrow">Коммерческая модель</p>
        <h2>Тариф считается от масштаба флота, а не от сложности интерфейса</h2>
        <p>Для пилота честнее считать дроны, батареи и объём импортов. Так владелец флота понимает стоимость контроля, а команда продукта не обещает неподтверждённую аналитику без реальных журналов.</p>
        <div className="pricing-grid">
          {pricing.map((plan) => (
            <article className="panel price-card" key={plan.name}>
              <h3>{plan.name}</h3>
              <strong>{plan.price}</strong>
              <span>{plan.assets}</span>
              <span>{plan.logs}</span>
              <p>{plan.note}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function LandingCard({ kicker, title, items }: { kicker: string; title: string; items: string[] }) {
  return <article className="panel landing-card"><span>{kicker}</span><h2>{title}</h2>{items.map((item) => <p key={item}><CheckCircle2 size={16} />{item}</p>)}</article>;
}

function Overview({
  analysis,
  barValues,
  primaryAlert,
  openRecommendation,
  loadDemo,
  droneCount,
  importCount,
}: {
  analysis: FlightAnalysis;
  barValues: number[];
  primaryAlert: FlightAnalysis['alerts'][number] | undefined;
  openRecommendation: () => void;
  loadDemo: (key: keyof typeof demoLogs) => void;
  droneCount: number;
  importCount: number;
}) {
  return (
    <>
      <section className="metric-grid">
        <Metric icon={<Plane />} value={String(droneCount)} label="Дронов в парке" hint={`${importCount} импортов в истории`} tone="blue" />
        <Metric icon={<BatteryCharging />} value={analysis.summary.batteryEnd !== null ? `${analysis.summary.batteryEnd}%` : '—'} label="Остаток батареи" hint="по последнему загруженному логу" tone="violet" />
        <Metric icon={<AlertTriangle />} value={String(analysis.alerts.length)} label="Алертов в логе" hint={`качество данных: ${analysis.quality.score}%`} tone="amber" />
        <Metric icon={<Gauge />} value="147,6 ч" label="Налёт за сезон" hint="демо-значение" tone="cyan" />
      </section>

      <section className="dashboard-grid">
        <FleetHealthCard droneCount={droneCount} importCount={importCount} />
        <RiskCard primaryAlert={primaryAlert} openRecommendation={openRecommendation} />
        <FlightChart analysis={analysis} barValues={barValues} />
      </section>

      <section className="analysis-grid">
        <QualityPanel analysis={analysis} />
        <article className="panel demo-panel">
          <p className="eyebrow">Тестовые сценарии</p>
          <h2>Проверить аналитику без реальных DJI-логов</h2>
          <div className="demo-actions">
            <button onClick={() => loadDemo('normal')}>Норма</button>
            <button onClick={() => loadDemo('degraded')}>Деградация</button>
            <button onClick={() => loadDemo('critical')}>Критика</button>
          </div>
          <p>Кнопки меняют реальные входные данные, пересчитывают алерты и сохраняют поддерживаемый импорт в историю.</p>
        </article>
      </section>
      <PilotReadiness />
    </>
  );
}

function PilotReadiness() {
  const readinessItems = [
    { status: 'done', title: 'Контур импорта готов', text: 'CSV/TXT/KML проходят через качество данных, историю и привязку к активам.' },
    { status: 'done', title: 'Очередь исследования включена', text: 'DAT/ZIP/JSON принимаются без аналитики и не становятся полноценной историей.' },
    { status: 'next', title: 'Нужен первый реальный лог', text: 'Оригинал хранится вне Git, рабочая копия загружается вместе с source.txt.' },
    { status: 'blocked', title: 'Адаптер ждёт схему', text: 'Модельные правила и декодеры пишем только после изучения обезличенного файла.' },
  ];

  return (
    <section className="panel pilot-readiness">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Готовность к пилоту</p>
          <h2>Что осталось до полноценной работы</h2>
        </div>
        <span className="status-pill status-pill--warning">Ждём реальные логи</span>
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

function FleetHealthCard({ droneCount, importCount }: { droneCount: number; importCount: number }) {
  return (
    <article className="panel fleet-health">
      <div className="panel-heading"><div><p className="eyebrow">Техническое состояние</p><h2>Готовность флота</h2></div></div>
      <div className="readiness">
        <div className="gauge">
          <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="48" /><circle className="gauge-value" cx="60" cy="60" r="48" /></svg>
          <div><strong>—</strong><small>нет оценки</small></div>
        </div>
        <div className="readiness-list">
          <div><span className="status-dot status-dot--good" />В реестре <b>{droneCount}</b></div>
          <div><span className="status-dot status-dot--attention" />Сохранённых журналов <b>{importCount}</b></div>
          <div><span className="status-dot status-dot--critical" />Оценка состояния <b>нет данных</b></div>
        </div>
      </div>
      <div className="health-footer"><ShieldCheck size={18} /><span>Индекс здоровья появится только по подтверждённым данным</span></div>
    </article>
  );
}

function RiskCard({ primaryAlert, openRecommendation }: { primaryAlert: FlightAnalysis['alerts'][number] | undefined; openRecommendation: () => void }) {
  return (
    <article className="panel risk-card">
      <div className="risk-top">
        <div className="risk-icon"><AlertTriangle size={22} /></div>
        <span className={`severity severity--${primaryAlert?.severity ?? 'info'}`}>{severityText[primaryAlert?.severity ?? 'info']}</span>
      </div>
      <p className="eyebrow">Предиктивный алерт</p>
      <h2>{primaryAlert?.title ?? 'Отклонений не обнаружено'}</h2>
      <p>{primaryAlert?.detail ?? 'Телеметрия находится в штатных пределах.'}</p>
      <button className="risk-action" onClick={openRecommendation}>Открыть рекомендации <ArrowUpRight size={16} /></button>
    </article>
  );
}

function FlightChart({ analysis, barValues }: { analysis: FlightAnalysis; barValues: number[] }) {
  return (
    <article className="panel flight-panel">
      <div className="panel-heading"><div><p className="eyebrow">Анализ файла</p><h2>Разряд батареи</h2></div><button className="period-button">{analysis.summary.points} точек</button></div>
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

function FleetView({ drones, batteries, onAddDrone }: { drones: DroneAsset[]; batteries: BatteryAsset[]; onAddDrone: () => void }) {
  return (
    <>
      <div className="section-actions"><button className="upload-button" onClick={onAddDrone}><Plane size={16} />Добавить дрон</button><span>Демо-активы сохраняются в localStorage.</span></div>
      <section className="table-grid">
        {drones.map((drone) => (
          <Entity
            key={drone.id}
            title={drone.name}
            subtitle={drone.model}
            tone={drone.tone}
            status={drone.status}
            rows={[
              ['Здоровье', drone.health === null ? 'Не оценено' : `${drone.health}/100`],
              ['Налёт', drone.flightHours ?? 'Нет данных'],
              ['Батарея', batteries.find((battery) => battery.id === drone.assignedBatteryId)?.label ?? '—'],
            ]}
          />
        ))}
      </section>
    </>
  );
}

function BatteriesView({ batteries, onAddBattery }: { batteries: BatteryAsset[]; onAddBattery: () => void }) {
  return (
    <>
      <div className="section-actions"><button className="upload-button" onClick={onAddBattery}><BatteryCharging size={16} />Добавить батарею</button><span>Новые батареи доступны для привязки импорта.</span></div>
      <section className="table-grid">
        {batteries.map((battery) => (
          <Entity
            key={battery.id}
            title={battery.label}
            subtitle="Батарея"
            tone={battery.tone}
            status={battery.status}
            rows={[
              ['Индекс', battery.health === null ? 'Не оценён' : `${battery.health}/100`],
              ['Циклы', battery.cycles === null ? 'Нет данных' : String(battery.cycles)],
              ['Причина', battery.issue],
            ]}
          />
        ))}
      </section>
    </>
  );
}

function Entity({ title, subtitle, tone, status, rows }: { title: string; subtitle: string; tone: string; status: string; rows: string[][] }) {
  return (
    <article className="panel entity-card">
      <div><p className="eyebrow">{subtitle}</p><h2>{title}</h2><span className={`status-pill status-pill--${tone}`}>{status}</span></div>
      <div className="entity-stats">{rows.map(([key, value]) => <span key={key}>{key}<b>{value}</b></span>)}</div>
      <button className="entity-action">Открыть карточку <ArrowUpRight size={15} /></button>
    </article>
  );
}

function FlightsView({ analysis, imports, pendingImports, drones, batteries, onOpenImport }: { analysis: FlightAnalysis; imports: SavedTelemetryImport[]; pendingImports: PendingTelemetryImport[]; drones: DroneAsset[]; batteries: BatteryAsset[]; onOpenImport: (item: SavedTelemetryImport) => void }) {
  return (
    <>
      <section className="analysis-grid"><QualityPanel analysis={analysis} /><ImportProfile analysis={analysis} /></section>
      <RecognizedData analysis={analysis} />
      <ImportHistory imports={imports} drones={drones} batteries={batteries} onOpenImport={onOpenImport} />
      <PendingImportQueue pendingImports={pendingImports} drones={drones} batteries={batteries} />
      <List
        title="Последние демо-полёты"
        rows={flights.map((flight) => ({
          icon: flight.result === 'ok' ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />,
          tone: flight.result,
          title: `${flight.id} · ${flight.drone}`,
          text: flight.text,
          meta: `${flight.date} · ${flight.duration}`,
        }))}
      />
    </>
  );
}

function PendingImportQueue({ pendingImports, drones, batteries }: { pendingImports: PendingTelemetryImport[]; drones: DroneAsset[]; batteries: BatteryAsset[] }) {
  return (
    <section className="panel list-panel pending-imports" data-testid="pending-imports">
      <div className="panel-heading">
        <div><p className="eyebrow">Очередь исследования</p><h2>Принятые файлы без аналитики</h2></div>
        <span className="status-pill status-pill--warning">{pendingImports.length} файлов</span>
      </div>
      {pendingImports.length === 0 ? (
        <p className="empty-state">DAT/ZIP/JSON и другие неподдержанные источники будут фиксироваться здесь: файл принят, но выводы по нему не строятся до подтверждённого декодера.</p>
      ) : pendingImports.map((item) => {
        const drone = drones.find((entry) => entry.id === item.droneId);
        const battery = batteries.find((entry) => entry.id === item.batteryId);
        return (
          <div className="history-row pending-row" key={item.id}>
            <span className="row-status row-status--warning"><CircleHelp size={17} /></span>
            <div><strong>{item.sourceName}</strong><p>{drone?.name ?? 'Дрон не найден'} · {battery?.label ?? 'Батарея не найдена'} · {item.reason}</p><small>{item.nextStep}</small></div>
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
        <div><p className="eyebrow">История импортов</p><h2>Сохранённые анализы активов</h2></div>
        <span className="status-pill status-pill--good">{imports.length} записей</span>
      </div>
      {imports.length === 0 ? (
        <p className="empty-state">Загрузите CSV/TXT/KML или запустите демо-сценарий — поддерживаемый анализ сохранится здесь с выбранным дроном и батареей.</p>
      ) : imports.map((item) => {
        const drone = drones.find((entry) => entry.id === item.droneId);
        const battery = batteries.find((entry) => entry.id === item.batteryId);
        return (
          <button className="history-row" key={item.id} onClick={() => onOpenImport(item)}>
            <span className={`row-status row-status--${item.criticalAlertCount ? 'critical' : item.alertCount ? 'warning' : 'good'}`}>
              {item.criticalAlertCount ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
            </span>
            <div><strong>{item.sourceName}</strong><p>{drone?.name ?? 'Дрон не найден'} · {battery?.label ?? 'Батарея не найдена'} · {capabilityText[item.capability]}</p></div>
            <time>{new Date(item.importedAt).toLocaleString('ru-RU')} · качество {item.qualityScore}%</time>
          </button>
        );
      })}
    </section>
  );
}

function ImportProfile({ analysis }: { analysis: FlightAnalysis }) {
  const profile = analysis.importProfile;
  const sourceLabel = analysis.parsed.sourceKind === 'unsupported' ? 'DAT/ZIP' : analysis.parsed.sourceKind.toUpperCase();
  const tone = profile.capability === 'battery_extended' ? 'good' : profile.capability === 'battery_basic' ? 'warning' : 'critical';

  return (
    <article className={`panel import-card import-card--${profile.capability}`}>
      <div className="panel-heading"><div><p className="eyebrow">Паспорт импорта</p><h2>{profile.title}</h2></div><span className={`status-pill status-pill--${tone}`}>{sourceLabel}</span></div>
      <p>{profile.verdict}</p>
      <div className="entity-stats">
        <span>Файл <b>{analysis.parsed.sourceName}</b></span>
        <span>Точки <b>{analysis.summary.points}</b></span>
        <span>Мин. напряжение <b>{analysis.summary.minVoltage?.toFixed(1) ?? '—'} В</b></span>
        <span>Макс. температура <b>{analysis.summary.maxBatteryTemp ?? '—'} °C</b></span>
      </div>
      <div className="next-file"><strong>Следующий лучший файл</strong><span>{profile.nextBestFile}</span></div>
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
        <div><p className="eyebrow">Распознанные данные</p><h2>Что найдено в журнале</h2></div>
        <span className={`status-pill status-pill--${analysis.importProfile.capability === 'route_only' ? 'critical' : 'good'}`}>{analysis.importProfile.capability === 'route_only' ? 'Батарея недоступна' : 'Можно анализировать'}</span>
      </div>
      <div className="recognized-grid">
        <div><strong>Колонки источника</strong><div className="tag-cloud">{analysis.parsed.detectedColumns.length ? analysis.parsed.detectedColumns.map((column) => <span key={column}>{column}</span>) : <span>Колонки не распознаны</span>}</div></div>
        <div><strong>Не хватает для диагностики</strong><div className="tag-cloud tag-cloud--missing">{missing.map((field) => <span key={field}>{field}</span>)}</div></div>
        <div><strong>Рекомендуемые CSV-поля</strong><div className="tag-cloud tag-cloud--hint">{criticalHints.map((field) => <span key={field}>{field}</span>)}</div></div>
      </div>
      <p>{analysis.importProfile.capability === 'route_only' ? 'Этот файл пригоден для маршрута, но по нему нельзя честно оценить батарею: нет заряда, напряжения, температуры или ячеек.' : 'Чем больше батарейных полей есть в журнале, тем выше надёжность первичного triage и меньше ручных допущений.'}</p>
    </article>
  );
}

function MaintenanceView() {
  return (
    <List
      title="Задачи обслуживания"
      action={<button className="upload-button"><CalendarClock size={16} />Создать задачу</button>}
      rows={maintenance.map((item) => ({
        icon: <Wrench size={17} />,
        tone: item.tone,
        title: `${item.target} · ${item.type}`,
        text: `Срок: ${item.due}`,
        meta: item.status,
      }))}
    />
  );
}

function List({ title, rows, action }: { title: string; rows: ListRow[]; action?: ReactNode }) {
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

function QualityPanel({ analysis }: { analysis: FlightAnalysis }) {
  return (
    <article className="panel quality-panel">
      <div className="panel-heading"><div><p className="eyebrow">Data Quality Score</p><h2>Качество телеметрии</h2></div><strong className="quality-score">{analysis.quality.score}%</strong></div>
      <div className="quality-scale"><i style={{ width: `${analysis.quality.score}%` }} /></div>
      <div className="quality-columns">
        <div><b>Есть</b>{analysis.quality.available.map((item) => <span key={item}>{item}</span>)}</div>
        <div><b>Нет</b>{analysis.quality.missing.map((item) => <span key={item}>{item}</span>)}</div>
      </div>
    </article>
  );
}

function Metric({ icon, value, label, hint, tone }: { icon: ReactNode; value: string; label: string; hint: string; tone: string }) {
  return <article className={`metric-card metric-card--${tone}`}><div className="metric-icon">{icon}</div><div><strong>{value}</strong><p>{label}</p><small>{hint}</small></div></article>;
}

type ModalProps = {
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

function Modal({ modal, setModal, fileInput, chooseFile, uploadedName, primaryAlert, loadDemo, loginDemo, user, setUser, fleetState, selectAssets }: ModalProps) {
  return (
    <div className="modal-backdrop" onMouseDown={() => setModal(null)}>
      <section className="upload-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-button" onClick={() => setModal(null)} aria-label="Закрыть">×</button>
        {modal === 'upload' && <UploadModal fileInput={fileInput} chooseFile={chooseFile} uploadedName={uploadedName} loadDemo={loadDemo} fleetState={fleetState} selectAssets={selectAssets} />}
        {modal === 'auth' && <AuthModal user={user} setUser={setUser} loginDemo={loginDemo} />}
        {modal === 'lead' && <IconTitle icon={<Bell />} title="Заявка принята в демо-режиме" eyebrow="Пилот" text="В production здесь будет форма заявки и CRM/email-уведомление." />}
        {modal === 'recommendation' && <IconTitle icon={<AlertTriangle />} title={primaryAlert?.title ?? 'Отклонений нет'} eyebrow="Рекомендация" text={primaryAlert?.recommendation ?? 'Продолжайте копить историю полётов и батарей.'} />}
        {modal === 'notifications' && <IconTitle icon={<Bell />} title="Уведомления" eyebrow="Пульс БВС" text="Здесь появятся push/email-алерты. Telegram не используем." />}
        {modal === 'settings' && <IconTitle icon={<Settings />} title="Настройки" eyebrow="Пульс БВС" text="Следующий этап: роли, пороги алертов, организация и лимиты анализов по тарифу." />}
        {modal === 'help' && <HelpModal />}
      </section>
    </div>
  );
}

function HelpModal() {
  const steps = [
    { title: '1. Сохраните оригинал вне Git', text: 'Создайте приватную папку, не кладите реальные логи, координаты, серийные номера и аккаунты в репозиторий.' },
    { title: '2. Сделайте рабочую копию', text: 'Для загрузки используйте копию файла. Исходное имя, расширение и способ получения запишите в source.txt.' },
    { title: '3. Выберите дрон и батарею', text: 'Даже если батарея неизвестна, задайте псевдоним: так история импорта останется прослеживаемой.' },
    { title: '4. Загрузите файл и проверьте результат', text: 'CSV/TXT/KML дают ограниченный анализ, DAT/ZIP/JSON уходят в очередь исследования без диагностики.' },
  ];
  const fileTypes = [
    { label: 'CSV/TXT', text: 'табличная телеметрия, если есть распознаваемые поля' },
    { label: 'KML', text: 'маршрут и координаты, но не здоровье батареи' },
    { label: 'DAT/ZIP/JSON', text: 'только регистрация в очереди исследования' },
  ];

  return (
    <>
      <IconTitle icon={<CircleHelp />} title="Как подготовить первый реальный лог" eyebrow="Помощь" text="Эта памятка нужна до появления backend и модельных адаптеров: она помогает загрузить файл безопасно и не получить ложную диагностику." />
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
        <span>Адаптер, декодер и модельные пороги добавляются только после изучения реального обезличенного файла с заполненным source.txt.</span>
      </div>
    </>
  );
}

function UploadModal({ fileInput, chooseFile, uploadedName, loadDemo, fleetState, selectAssets }: Pick<ModalProps, 'fileInput' | 'chooseFile' | 'uploadedName' | 'loadDemo' | 'fleetState' | 'selectAssets'>) {
  const intakeChecklist = [
    'Сначала выберите дрон и батарею, даже если батарея пока неизвестна.',
    'FlightRecord с телефона/пульта полезен для маршрута, времени и первичных событий.',
    'DAT/ZIP/JSON фиксируются в очереди исследования и не превращаются в диагностику без декодера.',
    'Реальные оригиналы храните вне Git; сюда загружайте рабочую копию.',
  ];
  const sourceGuide = [
    { source: 'DJI Fly / телефон / пульт', gives: 'маршрут, время, высота/скорость и часть предупреждений, если они есть в FlightRecord', limit: 'обычно не хватает полной батарейной телеметрии, ячеек и сервисных событий' },
    { source: 'DJI Assistant 2', gives: 'технический экспорт Flight Controller Data и более полный контекст состояния устройства', limit: 'формат всё равно проверяем на реальном образце; DAT/ZIP/JSON не декодируем наугад' },
    { source: 'KML из SmartFarm/агроплатформы', gives: 'маршрут, геометрию задания и координаты облёта', limit: 'не показывает состояние батареи, ошибки аппарата и обслуживание' },
  ];

  return (
    <>
      <IconTitle icon={<CloudUpload />} title="Загрузите журнал полёта" eyebrow="Импорт телеметрии" text="Выбор актива только связывает файл с реестром: модельная диагностика ещё не подключена. CSV/TXT/KML сохраняются в историю. DAT/ZIP/JSON принимаются, но до подключения декодера не анализируются и не становятся полноценной записью." />
      <div className="source-guide">
        <strong>Откуда брать логи и что они дают</strong>
        {sourceGuide.map((item) => (
          <article key={item.source}>
            <b>{item.source}</b>
            <span>Даёт: {item.gives}.</span>
            <em>Ограничение: {item.limit}.</em>
          </article>
        ))}
      </div>
      <div className="intake-checklist">
        <strong>Готовность к реальным логам</strong>
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
      {uploadedName && <div className="upload-result"><ShieldCheck size={18} />Активный источник: «{uploadedName}».</div>}
      <div className="sample-actions">
        <button onClick={() => downloadSample('puls-bvs-sample.csv', sampleCsv, 'text/csv;charset=utf-8')}>Скачать пример CSV</button>
        <button onClick={() => downloadSample('puls-bvs-route.kml', sampleKml, 'application/vnd.google-earth.kml+xml;charset=utf-8')}>Скачать пример KML</button>
        <button onClick={() => downloadSample('puls-bvs-source-template.txt', sourceTemplate, 'text/plain;charset=utf-8')}>Шаблон карточки лога</button>
      </div>
      <div className="demo-actions">
        <button onClick={() => loadDemo('normal')}>Демо норма</button>
        <button onClick={() => loadDemo('degraded')}>Демо деградация</button>
        <button onClick={() => loadDemo('critical')}>Демо критика</button>
      </div>
    </>
  );
}

function AuthModal({ user, setUser, loginDemo }: Pick<ModalProps, 'user' | 'setUser' | 'loginDemo'>) {
  return (
    <>
      <IconTitle icon={<ShieldCheck />} title="Демо-регистрация" eyebrow="Аккаунт" text="Пока это локальная сессия в браузере. Структура уже соответствует будущей организации и тарифу." />
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

export default App;
