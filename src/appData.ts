import { Activity, BatteryCharging, ClipboardCheck, FileBarChart, LayoutDashboard, Plane, Wrench, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Section } from './appTypes';

export type NavItem = { id: Section; label: string; icon: LucideIcon };
export type ListRow = { icon: ReactNode; tone: string; title: string; text: string; meta: string };

export const navItems: NavItem[] = [
  { id: 'overview', label: 'Обзор', icon: LayoutDashboard },
  { id: 'fleet', label: 'Флот', icon: Plane },
  { id: 'batteries', label: 'Батареи', icon: BatteryCharging },
  { id: 'flights', label: 'Полёты', icon: Activity },
  { id: 'journal', label: 'Журнал полётов', icon: ClipboardCheck },
  { id: 'maintenance', label: 'Обслуживание', icon: Wrench },
  { id: 'reports', label: 'Отчёты', icon: FileBarChart },
];

export const severityText = { info: 'Информация', warning: 'Внимание', critical: 'Критично' } as const;
export const capabilityText = {
  route_only: 'Только маршрут',
  battery_basic: 'Базовая батарея',
  battery_extended: 'Расширенная батарея',
} as const;

export const sampleCsv = 'timestamp,latitude,longitude,battery_percent,pack_voltage,battery_temperature,cell1,cell2,cell3,cell4,warning\n2026-07-30T09:00:00Z,55.7512,37.6184,94,51.2,32,4.18,4.17,4.18,4.17,\n2026-07-30T09:03:00Z,55.7520,37.6201,86,49.8,36,4.08,4.06,4.08,4.07,voltage sag';
export const sampleKml = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>Пример маршрута</name><LineString><coordinates>37.6184,55.7512,180 37.6201,55.7520,182 37.6215,55.7531,181</coordinates></LineString></Placemark></Document></kml>';
export const sourceTemplate = `Карточка происхождения лога для Пульс БВС

1. Дрон
Модель дрона:
Бортовой номер или понятное название без серийного номера:
Модель пульта:
Модель очков, если были:

2. Откуда взят файл
Откуда выгружено: DJI Fly / телефон / пульт / DJI Assistant 2 / карта KML / другое
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
ID батареи или понятное название:
Уровень заряда до полёта, если известен:
Уровень заряда после полёта, если известен:
Были ли предупреждения по батарее:

5. Личные и чувствительные данные
Что удалено или скрыто:
Есть ли чувствительные координаты: да / нет
Можно ли использовать файл для проверки чтения данных: да / нет / уточнить

Важно: исходный файл храните у себя в закрытой папке. В сервис загружайте рабочую копию без лишних чувствительных данных.`;

export function downloadSample(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
