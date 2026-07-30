import { Activity, CheckCircle2 } from 'lucide-react';
import { demoLogs } from '../analytics/demoLogs';

type LandingProps = {
  setView: (view: 'landing' | 'dashboard') => void;
  setModal: (modal: 'upload' | 'recommendation' | 'notifications' | 'settings' | 'help' | 'auth' | 'lead' | null) => void;
  loadDemo: (key: keyof typeof demoLogs) => void;
};

const pricing = [
  { name: 'Старт', price: '4 900 ₽', assets: 'до 3 дронов', logs: '60 анализов/мес', note: 'для пилотов и малых подрядчиков' },
  { name: 'Флот', price: '14 900 ₽', assets: 'до 15 дронов', logs: '400 анализов/мес', note: 'для агроподрядчиков' },
  { name: 'Команда', price: 'по договору', assets: '50+ дронов', logs: 'объём по договорённости', note: 'доступ для сотрудников, уведомления и хранение по правилам компании' },
];

export function Landing({ setView, setModal, loadDemo }: LandingProps) {
  const landingStats = [
    ['1 окно', 'дроны, батареи, файлы полётов и задачи'],
    ['до полёта', 'видны слабые места в данных и батарее'],
    ['для команд', 'доступ для сотрудников и защита рабочих данных'],
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
          <p className="eyebrow">Журнал для дронов и батарей</p>
          <h1>Дроны, батареи и файлы полётов — в одном понятном месте</h1>
          <p>Пульс БВС помогает операторам и агроподрядчикам навести порядок: связать файлы полётов с нужным дроном и батареей, увидеть, каких данных хватает, зафиксировать предупреждения и не потерять задачи обслуживания.</p>
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
            <span className="status-pill status-pill--warning">Пилотная версия</span>
            <small>пример интерфейса</small>
          </div>
          <h2>Перед вылетом видно, чему можно доверять</h2>
          <div className="signal-list">
            <span><b>Качество данных</b><em>CSV/KML читаются, DAT/ZIP пока только принимаются на проверку</em></span>
            <span><b>Батарея</b><em>сильная просадка и разница по ячейкам подсвечиваются как риск</em></span>
            <span><b>Обслуживание</b><em>задача не теряется после загрузки файла</em></span>
          </div>
          <div className="quality-scale"><i style={{ width: '74%' }} /></div>
          <small>Индекс примера: 74/100 — не замена проверке специалистом, а повод проверить батарею.</small>
        </aside>
      </section>

      <section className="landing-grid">
        <LandingCard kicker="01" title="Навести порядок" items={['Список дронов и батарей в одном месте', 'История загрузок связана с нужным дроном и батареей', 'Понятно, какой файл дал какие выводы']} />
        <LandingCard kicker="02" title="Снизить риск перед вылетом" items={['Подсказки по просадке, температуре и полноте данных', 'Объяснение риска простым языком', 'Обслуживание превращается в задачу, а не в заметку в чате']} />
        <LandingCard kicker="03" title="Готовить работу команды" items={['Уведомления для ответственных людей', 'Защита журналов и коммерческой информации', 'Готовность к разным правам доступа и правилам хранения']} />
      </section>

      <section className="workflow-section">
        <div>
          <p className="eyebrow">Логика работы</p>
          <h2>От файла полёта до понятного решения</h2>
        </div>
        <div className="workflow-grid">
          {['Загрузить файл полёта', 'Проверить, каких данных хватает', 'Связать с дроном и батареей', 'Получить риск и задачу обслуживания'].map((step, index) => (
            <article className="workflow-step" key={step}><span>{index + 1}</span><strong>{step}</strong></article>
          ))}
        </div>
      </section>

      <section className="pricing-section">
        <p className="eyebrow">Коммерческая модель</p>
        <h2>Тариф считается от размера парка, а не от сложности экрана</h2>
        <p>Для пилота честнее считать дроны, батареи и число загруженных файлов. Так владелец парка понимает стоимость контроля, а сервис не обещает выводы без реальных журналов.</p>
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
