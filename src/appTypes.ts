export type Section = 'overview' | 'fleet' | 'batteries' | 'flights' | 'maintenance' | 'journal' | 'reports';
export type ModalState = 'upload' | 'recommendation' | 'notifications' | 'settings' | 'help' | 'auth' | 'lead' | null;
export type UserProfile = { name: string; company: string; email: string; plan: string };
export type View = 'landing' | 'dashboard';
