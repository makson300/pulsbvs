import { useEffect, useMemo, useRef, useState } from 'react';
import { demoLogs } from './analytics/demoLogs';
import { analyzeTelemetry, isUnsupportedTelemetryFile, parseTelemetryCsv, parseTelemetryFile, type FlightAnalysis } from './analytics/telemetry';
import { navItems } from './appData';
import type { ModalState, Section, UserProfile, View } from './appTypes';
import { BatteriesView, FleetView, MaintenanceView } from './components/FleetSections';
import { FlightsView } from './components/FlightsSection';
import { Landing } from './components/Landing';
import { Modal, type ModalProps } from './components/Modals';
import { Overview } from './components/Overview';
import { PageHeader, Sidebar, Topbar } from './components/DashboardShell';
import {
  createBatteryAsset,
  createDroneAsset,
  createPendingImport,
  createSavedImport,
  loadFleetState,
  saveFleetState,
  upsertImport,
  upsertPendingImport,
  type FleetState,
  type FileOriginNote,
  type SavedTelemetryImport,
} from './domain/fleet';

const defaultUser: UserProfile = {
  name: 'Иван Петров',
  company: 'АгроСфера',
  email: 'demo@pulsbvs.ru',
  plan: 'Флот',
};

const MAX_CLIENT_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function readLocalItem(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The demo remains usable when browser storage is unavailable.
  }
}

function loadUserProfile(): UserProfile {
  try {
    return { ...defaultUser, ...JSON.parse(readLocalItem('puls-bvs-user') || '{}') };
  } catch {
    return defaultUser;
  }
}

function App() {
  const [view, setView] = useState<View>(() => (readLocalItem('puls-bvs-user') ? 'dashboard' : 'landing'));
  const [user, setUser] = useState<UserProfile>(() => loadUserProfile());
  const [section, setSection] = useState<Section>('overview');
  const [modal, setModal] = useState<ModalState>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileOriginNote, setFileOriginNote] = useState<FileOriginNote>({});
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

  useEffect(() => {
    saveFleetState(fleetState);
  }, [fleetState]);

  const loginDemo = (profile = user) => {
    writeLocalItem('puls-bvs-user', JSON.stringify(profile));
    setUser(profile);
    setView('dashboard');
    setModal(null);
  };

  function selectAssets(droneId: string, batteryId: string) {
    setFleetState((state) => ({ ...state, selectedDroneId: droneId, selectedBatteryId: batteryId }));
  }

  function persistAnalysis(nextAnalysis: FlightAnalysis, sourceName: string, targetSection: Section, originNote?: FileOriginNote) {
    setUploadedName(sourceName);
    setAnalysis(nextAnalysis);
    setFleetState((state) => {
      const saved = createSavedImport(nextAnalysis, state.selectedDroneId, state.selectedBatteryId, new Date(), originNote);
      const pending = createPendingImport(nextAnalysis, state.selectedDroneId, state.selectedBatteryId, new Date(), originNote);
      if (pending) return upsertPendingImport(state, pending);
      return saved ? upsertImport(state, saved) : state;
    });
    setSection(targetSection);
    setView('dashboard');
    setModal(null);
    if (originNote) setFileOriginNote({});
  }

  async function chooseFile(file?: File) {
    if (!file) return;
    setUploadError(null);
    if (file.size > MAX_CLIENT_FILE_SIZE_BYTES) {
      setUploadError('Файл больше 10 МБ. Для этой демо-версии подготовьте уменьшенную рабочую копию без лишних данных.');
      return;
    }
    try {
      const content = isUnsupportedTelemetryFile(file.name) ? '' : await file.text();
      persistAnalysis(analyzeTelemetry(parseTelemetryFile(file.name, content)), file.name, 'flights', fileOriginNote);
    } catch {
      setUploadError('Не удалось прочитать файл в браузере. Проверьте, что файл доступен, и попробуйте загрузить его снова.');
    }
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
    uploadError,
    primaryAlert,
    loadDemo,
    loginDemo,
    user,
    setUser,
    fleetState,
    selectAssets,
    fileOriginNote,
    setFileOriginNote,
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
            openUpload={() => setModal('upload')}
            loadDemo={loadDemo}
            droneCount={fleetState.drones.length}
            importCount={fleetState.imports.length}
            pendingCount={fleetState.pendingImports.length}
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

export default App;
