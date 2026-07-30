import { Activity, ArrowUpRight, Bell, ChevronDown, CircleHelp, CloudUpload, Menu, Settings } from 'lucide-react';
import { navItems } from '../appData';
import type { Section, UserProfile } from '../appTypes';

export function Sidebar({
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
          <button className={`nav-item ${activeSection === id ? 'nav-item--active' : ''}`} data-testid={`nav-${id}`} key={id} onClick={() => onSectionChange(id)}>
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom" data-testid="sidebar-footer">
        <button className="nav-item" data-testid="nav-home" onClick={onHome}><ArrowUpRight size={19} /><span>Главная</span></button>
        <button className="nav-item" data-testid="open-settings" onClick={onSettings}><Settings size={19} /><span>Настройки</span></button>
        <button className="nav-item" data-testid="open-help" onClick={onHelp}><CircleHelp size={19} /><span>Помощь</span></button>
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

export function Topbar({
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
        <button className="icon-button" data-testid="open-notifications" onClick={onNotifications} aria-label="Уведомления"><Bell size={19} /><i /></button>
        <button className="upload-button" data-testid="open-upload" onClick={onUpload}><CloudUpload size={18} />Загрузить лог</button>
      </div>
    </header>
  );
}

export function PageHeader({ sectionTitle, sourceName, qualityScore, operational = false }: { sectionTitle: string; sourceName: string; qualityScore: number; operational?: boolean }) {
  return (
    <section className="page-header">
      <div>
        <p className="eyebrow">Центр контроля флота</p>
        <h1>{sectionTitle}</h1>
        <p className="page-subtitle">{operational ? 'Операционные записи хранятся локально в этом браузере.' : `Загруженный файл: ${sourceName}`}</p>
      </div>
      <div className="system-status">
        <span />
        <div>
          <strong>{operational ? 'Рабочий контур' : 'Система работает штатно'}</strong>
          <small>{operational ? 'Данные вводятся вручную' : `Качество данных: ${qualityScore}%`}</small>
        </div>
      </div>
    </section>
  );
}
