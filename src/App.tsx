import { useEffect, useMemo, useRef, useState } from 'react';
import { demoLogs } from './analytics/demoLogs';
import { analyzeTelemetry, isUnsupportedTelemetryFile, parseTelemetryCsv, parseTelemetryFile, type FlightAnalysis } from './analytics/telemetry';
import { navItems } from './appData';
import type { ModalState, Section, UserProfile, View } from './appTypes';
import { BatteriesView, FleetView, MaintenanceView } from './components/OperationsSections';
import { FlightsView } from './components/FlightsSection';
import { JournalView, ReportsView } from './components/JournalSection';
import { Landing } from './components/Landing';
import { Modal, type ModalProps } from './components/Modals';
import { Overview } from './components/Overview';
import { PageHeader, Sidebar, Topbar } from './components/DashboardShell';
import {
  createBatteryAsset,
  createChecklistRun,
  createDocumentRecord,
  createDroneAsset,
  createIncidentRecord,
  createMaintenanceSchedule,
  createMaintenanceTask,
  createManualFlightEntry,
  createPendingImport,
  createSavedImport,
  getFleetReadiness,
  loadFleetState,
  removeDocumentRecord,
  removeIncidentRecord,
  removeMaintenanceTask,
  removeMaintenanceSchedule,
  removeManualFlightEntry,
  saveFleetState,
  updateDocumentRecord,
  updateChecklistRun,
  updateIncidentRecord,
  updateMaintenanceTask,
  updateMaintenanceSchedule,
  updateManualFlightEntry,
  updateAssetPassport,
  upsertImport,
  upsertPendingImport,
  type FleetState,
  type AssetKind,
  type AssetPassport,
  type ChecklistRun,
  type DocumentRecord,
  type FileOriginNote,
  type IncidentRecord,
  type MaintenanceTask,
  type MaintenanceSchedule,
  type ManualFlightEntry,
  type SavedTelemetryImport,
} from './domain/fleet';

const defaultUser: UserProfile = {
  name: 'Иван Петров',
  company: 'АгроСфера',
  email: 'demo@pulsbvs.ru',
  plan: 'Флот',
};

const MAX_CLIENT_FILE_SIZE_BYTES = 10 * 1024 * 1024;
type AnalysisSource = 'demo' | 'file';

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
  const [analysisSource, setAnalysisSource] = useState<AnalysisSource>(() => fleetState.imports[0] ? 'file' : 'demo');
  const fileInput = useRef<HTMLInputElement>(null);

  const primaryAlert = analysis.battery.alerts[0];
  const barValues = useMemo(
    () => analysis.parsed.rows.slice(-7).map((row) => Math.max(18, Math.min(100, row.batteryPercent ?? 50))),
    [analysis],
  );
  const readiness = useMemo(() => getFleetReadiness(fleetState), [fleetState]);

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

  function showAnalysis(nextAnalysis: FlightAnalysis, sourceName: string, targetSection: Section, source: AnalysisSource, originNote?: FileOriginNote) {
    setUploadedName(sourceName);
    setAnalysis(nextAnalysis);
    setAnalysisSource(source);
    if (source === 'file') {
      setFleetState((state) => {
        const saved = createSavedImport(nextAnalysis, state.selectedDroneId, state.selectedBatteryId, new Date(), originNote);
        const pending = createPendingImport(nextAnalysis, state.selectedDroneId, state.selectedBatteryId, new Date(), originNote);
        if (pending) return upsertPendingImport(state, pending);
        return saved ? upsertImport(state, saved) : state;
      });
    }
    setSection(targetSection);
    setView('dashboard');
    setModal(null);
    if (source === 'file' && originNote) setFileOriginNote({});
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
      showAnalysis(analyzeTelemetry(parseTelemetryFile(file.name, content)), file.name, 'flights', 'file', fileOriginNote);
    } catch {
      setUploadError('Не удалось прочитать файл в браузере. Проверьте, что файл доступен, и попробуйте загрузить его снова.');
    }
  }

  function loadDemo(key: keyof typeof demoLogs) {
    const demo = demoLogs[key];
    showAnalysis(analyzeTelemetry(parseTelemetryCsv(demo.label, demo.content)), demo.label, 'overview', 'demo');
  }

  function openSavedImport(item: SavedTelemetryImport) {
    setUploadedName(item.sourceName);
    setAnalysis(item.analysis);
    setAnalysisSource('file');
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

  function savePassport(kind: AssetKind, id: string, passport: AssetPassport) {
    setFleetState((state) => kind === 'drone'
      ? { ...state, drones: state.drones.map((item) => item.id === id ? updateAssetPassport(item, passport) : item) }
      : { ...state, batteries: state.batteries.map((item) => item.id === id ? updateAssetPassport(item, passport) : item) });
  }

  function addMaintenanceTask(input: Omit<MaintenanceTask, 'id' | 'createdAt' | 'completedAt' | 'status'>) {
    setFleetState((state) => ({ ...state, maintenanceTasks: [createMaintenanceTask(input), ...state.maintenanceTasks] }));
  }

  function updateMaintenance(id: string, update: Partial<Omit<MaintenanceTask, 'id' | 'createdAt' | 'completedAt'>>) {
    setFleetState((state) => ({ ...state, maintenanceTasks: state.maintenanceTasks.map((item) => item.id === id ? updateMaintenanceTask(item, update) : item) }));
  }

  function addMaintenanceSchedule(input: Omit<MaintenanceSchedule, 'id' | 'createdAt' | 'updatedAt'>) {
    setFleetState((state) => ({ ...state, maintenanceSchedules: [createMaintenanceSchedule(input), ...state.maintenanceSchedules] }));
  }

  function updateSchedule(id: string, update: Partial<Omit<MaintenanceSchedule, 'id' | 'createdAt' | 'updatedAt'>>) {
    setFleetState((state) => ({ ...state, maintenanceSchedules: state.maintenanceSchedules.map((item) => item.id === id ? updateMaintenanceSchedule(item, update) : item) }));
  }

  function addIncident(input: Omit<IncidentRecord, 'id' | 'createdAt' | 'resolvedAt' | 'status'>) {
    setFleetState((state) => ({ ...state, incidents: [createIncidentRecord(input), ...state.incidents] }));
  }

  function updateIncident(id: string, update: Partial<Omit<IncidentRecord, 'id' | 'createdAt' | 'resolvedAt'>>) {
    setFleetState((state) => ({ ...state, incidents: state.incidents.map((item) => item.id === id ? updateIncidentRecord(item, update) : item) }));
  }

  function addDocument(input: Omit<DocumentRecord, 'id' | 'createdAt'>) {
    setFleetState((state) => ({ ...state, documents: [createDocumentRecord(input), ...state.documents] }));
  }

  function updateDocument(id: string, update: Partial<Omit<DocumentRecord, 'id' | 'createdAt'>>) {
    setFleetState((state) => ({ ...state, documents: state.documents.map((item) => item.id === id ? updateDocumentRecord(item, update) : item) }));
  }

  function addManualFlight(input: Omit<ManualFlightEntry, 'id' | 'createdAt'>) {
    setFleetState((state) => ({ ...state, manualFlights: [createManualFlightEntry(input), ...state.manualFlights] }));
  }

  function updateManualFlight(id: string, update: Partial<Omit<ManualFlightEntry, 'id' | 'createdAt'>>) {
    setFleetState((state) => ({ ...state, manualFlights: state.manualFlights.map((item) => item.id === id ? updateManualFlightEntry(item, update) : item) }));
  }

  function addChecklist(input: Omit<ChecklistRun, 'id' | 'completedAt'>) {
    const checklist = createChecklistRun(input);
    if (!checklist) return;
    setFleetState((state) => ({ ...state, checklistRuns: [checklist, ...state.checklistRuns.filter((item) => !(item.flightId === input.flightId && item.phase === input.phase))] }));
  }

  function updateChecklist(id: string, input: Omit<ChecklistRun, 'id' | 'completedAt'>) {
    setFleetState((state) => ({
      ...state,
      checklistRuns: state.checklistRuns.map((item) => item.id === id ? updateChecklistRun(item, input) ?? item : item),
    }));
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

        <PageHeader sectionTitle={sectionTitle} sourceName={uploadedName ?? analysis.parsed.sourceName} qualityScore={analysis.quality.score} analysisSource={analysisSource} operational={section === 'fleet' || section === 'batteries' || section === 'maintenance' || section === 'journal' || section === 'reports'} />

        {section === 'overview' && (
          <Overview
            analysis={analysis}
            analysisSource={analysisSource}
            barValues={barValues}
            primaryAlert={primaryAlert}
            openRecommendation={() => setModal('recommendation')}
            openUpload={() => setModal('upload')}
            loadDemo={loadDemo}
            droneCount={fleetState.drones.length}
            importCount={fleetState.imports.length}
            pendingCount={fleetState.pendingImports.length}
            manualFlightCount={fleetState.manualFlights.length}
            readiness={readiness}
          />
        )}
        {section === 'fleet' && <FleetView drones={fleetState.drones} flights={fleetState.manualFlights} onAddDrone={addDrone} onSavePassport={savePassport} />}
        {section === 'batteries' && <BatteriesView batteries={fleetState.batteries} onAddBattery={addBattery} onSavePassport={savePassport} />}
        {section === 'flights' && (
          <FlightsView
            analysis={analysis}
            analysisSource={analysisSource}
            imports={fleetState.imports}
            pendingImports={fleetState.pendingImports}
            drones={fleetState.drones}
            batteries={fleetState.batteries}
            onOpenImport={openSavedImport}
          />
        )}
        {section === 'journal' && <JournalView drones={fleetState.drones} batteries={fleetState.batteries} flights={fleetState.manualFlights} checklistRuns={fleetState.checklistRuns} incidents={fleetState.incidents} onAddFlight={addManualFlight} onUpdateFlight={updateManualFlight} onRemoveFlight={(id) => setFleetState((state) => removeManualFlightEntry(state, id))} onAddChecklist={addChecklist} onUpdateChecklist={updateChecklist} />}
        {section === 'maintenance' && <MaintenanceView drones={fleetState.drones} batteries={fleetState.batteries} flights={fleetState.manualFlights} tasks={fleetState.maintenanceTasks} schedules={fleetState.maintenanceSchedules} incidents={fleetState.incidents} documents={fleetState.documents} readiness={readiness} onAddTask={addMaintenanceTask} onUpdateTask={updateMaintenance} onRemoveTask={(id) => setFleetState((state) => removeMaintenanceTask(state, id))} onAddSchedule={addMaintenanceSchedule} onUpdateSchedule={updateSchedule} onRemoveSchedule={(id) => setFleetState((state) => removeMaintenanceSchedule(state, id))} onAddIncident={addIncident} onUpdateIncident={updateIncident} onRemoveIncident={(id) => setFleetState((state) => removeIncidentRecord(state, id))} onAddDocument={addDocument} onUpdateDocument={updateDocument} onRemoveDocument={(id) => setFleetState((state) => removeDocumentRecord(state, id))} />}
        {section === 'reports' && <ReportsView drones={fleetState.drones} batteries={fleetState.batteries} fleetState={fleetState} />}
      </main>

      {modal && <Modal {...modalProps} />}
    </div>
  );
}

export default App;
