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
  createSavedImport,
  loadFleetState,
  saveFleetState,
  upsertImport,
  type BatteryAsset,
  type DroneAsset,
  type FleetState,
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
  { id: 'FL-2048', drone: 'Agras T40 №01', date: 'Сегодня 09:18', duration: '6 мин', result: 'warning', text: 'Аномальная просадка батареи' },
  { id: 'FL-2047', drone: 'Agras T40 №02', date: 'Вчера 17:40', duration: '11 мин', result: 'ok', text: 'Полёт штатный' },
  { id: 'FL-2046', drone: 'Mini 4 Pro', date: 'Вчера 12:05', duration: '18 мин', result: 'ok', text: 'Тестовый источник для парсера' },
];

const maintenance = [
  { target: 'Agras T40 №03', type: 'Плановое ТО', due: 'Сейчас', status: 'Открыто', tone: 'critical' },
  { target: 'BT-021', type: 'Диагностика батареи', due: 'До следующего вылета', status: 'Критично', tone: 'critical' },
  { target: 'Agras T40 №02', type: 'Проверка двигателя M3', due: 'Через 2 дня', status: 'Назначено', tone: 'warning' },
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
          <p className="eyebrow">Предиктивная аналитика БВС</p>
          <h1>Контроль батарей, полётов и ТО до того, как отказ станет аварией</h1>
          <p>Пульс БВС помогает агроподрядчикам и fleet-менеджерам видеть риск деградации батарей, качество логов, состояние флота и задачи обслуживания в одном российском интерфейсе.</p>
          <div className="hero-actions">
            <button className="landing-primary" onClick={() => setModal('auth')}>Получить пилотный доступ</button>
            <button onClick={() => loadDemo('critical')}>Посмотреть критический алерт</button>
          </div>
        </div>
        <aside className="hero-card">
          <span className="status-pill status-pill--warning">Предиктивный алерт</span>
          <h2>BT-014: просадка выше нормы</h2>
          <p>Разбаланс ячеек и ускоренный разряд требуют ограничения эксплуатации до диагностики.</p>
          <div className="quality-scale"><i style={{ width: '74%' }} /></div>
          <small>Индекс батареи: 74/100</small>
        </aside>
      </section>

      <section className="landing-grid">
        <LandingCard title="Боль рынка" items={['Батареи оцениваются на глаз', 'Логи разбираются уже после аварии', 'Нет общей картины по флоту и ТО']} />
        <LandingCard title="Что даём" items={['Battery Health Score и Data Quality Score', 'Предиктивные алерты с объяснением', 'Журнал полётов, батарей и обслуживания']} />
        <LandingCard title="Почему Russia-ready" items={['Email/web загрузка без Telegram', 'Подготовка к on-premise', 'Модель под B2B и коммерческую тайну']} />
      </section>

      <section className="pricing-section">
        <p className="eyebrow">Монетизация</p>
        <h2>Платить нужно за флот под контролем, а не за каждую кнопку</h2>
        <p>Основной тариф — по количеству активов: дроны и батареи. Лимит анализов нужен как честный технический ограничитель нагрузки.</p>
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

function LandingCard({ title, items }: { title: string; items: string[] }) {
  return <article className="panel landing-card"><h2>{title}</h2>{items.map((item) => <p key={item}><CheckCircle2 size={16} />{item}</p>)}</article>;
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
          <h2>Проверить аналитику без T40</h2>
          <div className="demo-actions">
            <button onClick={() => loadDemo('normal')}>Норма</button>
            <button onClick={() => loadDemo('degraded')}>Деградация</button>
            <button onClick={() => loadDemo('critical')}>Критика</button>
          </div>
          <p>Кнопки меняют реальные входные данные, пересчитывают алерты и сохраняют поддерживаемый импорт в историю.</p>
        </article>
      </section>
    </>
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

function FlightsView({ analysis, imports, drones, batteries, onOpenImport }: { analysis: FlightAnalysis; imports: SavedTelemetryImport[]; drones: DroneAsset[]; batteries: BatteryAsset[]; onOpenImport: (item: SavedTelemetryImport) => void }) {
  return (
    <>
      <section className="analysis-grid"><QualityPanel analysis={analysis} /><ImportProfile analysis={analysis} /></section>
      <RecognizedData analysis={analysis} />
      <ImportHistory imports={imports} drones={drones} batteries={batteries} onOpenImport={onOpenImport} />
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
      <p>{analysis.importProfile.capability === 'route_only' ? 'Этот файл пригоден для маршрута, но по нему нельзя честно оценить батарею T40: нет заряда, напряжения, температуры или ячеек.' : 'Чем больше батарейных полей есть в журнале, тем выше надёжность первичного triage и меньше ручных допущений.'}</p>
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
        {modal === 'help' && <IconTitle icon={<CircleHelp />} title="Помощь" eyebrow="Пульс БВС" text="Сейчас можно перейти с главной в кабинет, выбрать активы, загружать CSV/TXT/KML и открывать историю импортов." />}
      </section>
    </div>
  );
}

function UploadModal({ fileInput, chooseFile, uploadedName, loadDemo, fleetState, selectAssets }: Pick<ModalProps, 'fileInput' | 'chooseFile' | 'uploadedName' | 'loadDemo' | 'fleetState' | 'selectAssets'>) {
  return (
    <>
      <IconTitle icon={<CloudUpload />} title="Загрузите журнал полёта" eyebrow="Импорт телеметрии" text="Выбор актива только связывает файл с реестром: модельная диагностика ещё не подключена. CSV/TXT/KML сохраняются в историю. DAT/ZIP принимаются, но до подключения декодера не анализируются и не становятся полноценной записью." />
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
      <input ref={fileInput} className="hidden-input" type="file" onChange={(event) => chooseFile(event.target.files?.[0])} accept=".csv,.txt,.dat,.kml,.zip" />
      <button className="drop-zone" onClick={() => fileInput.current?.click()}><CloudUpload size={23} /><strong>Выбрать файл</strong><span>CSV, TXT, DAT, KML, ZIP</span></button>
      {uploadedName && <div className="upload-result"><ShieldCheck size={18} />Активный источник: «{uploadedName}».</div>}
      <div className="sample-actions">
        <button onClick={() => downloadSample('puls-bvs-sample.csv', sampleCsv, 'text/csv;charset=utf-8')}>Скачать пример CSV</button>
        <button onClick={() => downloadSample('puls-bvs-route.kml', sampleKml, 'application/vnd.google-earth.kml+xml;charset=utf-8')}>Скачать пример KML</button>
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
