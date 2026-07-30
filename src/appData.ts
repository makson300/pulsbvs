import { Activity, BatteryCharging, LayoutDashboard, Plane, Wrench, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Section } from './appTypes';

export type NavItem = { id: Section; label: string; icon: LucideIcon };
export type ListRow = { icon: ReactNode; tone: string; title: string; text: string; meta: string };

export const navItems: NavItem[] = [
  { id: 'overview', label: 'Обзор', icon: LayoutDashboard },
  { id: 'fleet', label: 'Флот', icon: Plane },
  { id: 'batteries', label: 'Батареи', icon: BatteryCharging },
  { id: 'flights', label: 'Полёты', icon: Activity },
  { id: 'maintenance', label: 'Обслуживание', icon: Wrench },
];

export const flights = [
  { id: 'FL-2048', drone: 'DJI Avata 2', date: 'Сегодня 09:18', duration: '6 мин', result: 'warning', text: 'Пример файла с данными по батарее' },
  { id: 'FL-2047', drone: 'DJI Avata 360', date: 'Вчера 17:40', duration: '11 мин', result: 'ok', text: 'Маршрут без данных по батарее' },
  { id: 'FL-2046', drone: 'DJI Mini 4 Pro', date: 'Вчера 12:05', duration: '18 мин', result: 'ok', text: 'Тестовый файл для проверки загрузки' },
];

export const maintenance = [
  { target: 'DJI Mini 4 Pro', type: 'Заполнить заметку о первом файле', due: 'Перед загрузкой', status: 'Открыто', tone: 'warning' },
  { target: 'Батарея без серийного номера', type: 'Дать понятное название и указать, откуда файл', due: 'До проверки', status: 'Ожидает', tone: 'warning' },
  { target: 'DJI Avata 2', type: 'Подготовить рабочую копию лога', due: 'После получения файла', status: 'Назначено', tone: 'ok' },
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
