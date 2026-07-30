import { BatteryCharging, Plane, Wrench } from 'lucide-react';
import { maintenance } from '../appData';
import type { BatteryAsset, DroneAsset } from '../domain/fleet';
import { Entity, List } from './CommonCards';

export function FleetView({ drones, batteries, onAddDrone }: { drones: DroneAsset[]; batteries: BatteryAsset[]; onAddDrone: () => void }) {
  return (
    <>
      <div className="section-actions"><button className="upload-button" onClick={onAddDrone}><Plane size={16} />Добавить дрон</button><span>В демо новые дроны сохраняются в этом браузере.</span></div>
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

export function BatteriesView({ batteries, onAddBattery }: { batteries: BatteryAsset[]; onAddBattery: () => void }) {
  return (
    <>
      <div className="section-actions"><button className="upload-button" onClick={onAddBattery}><BatteryCharging size={16} />Добавить батарею</button><span>Новые батареи можно выбрать при загрузке файла.</span></div>
      <section className="table-grid">
        {batteries.map((battery) => (
          <Entity
            key={battery.id}
            title={battery.label}
            subtitle="Батарея"
            tone={battery.tone}
            status={battery.status}
            rows={[
              ['Здоровье', battery.health === null ? 'Не оценено' : `${battery.health}/100`],
              ['Циклы', battery.cycles === null ? 'Нет данных' : String(battery.cycles)],
              ['Последний риск', battery.issue],
            ]}
          />
        ))}
      </section>
    </>
  );
}

export function MaintenanceView() {
  return (
    <List
      title="Задачи обслуживания"
      action={<span className="list-status">Задачи в демо</span>}
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
