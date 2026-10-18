import { Icon, type IconName } from './Icons';

interface StatsProps {
  dueToday: number;
  overdue: number;
  active: number;
  projectCount: number;
  completed: number;
  rate: number;
}

export default function Stats({
  dueToday,
  overdue,
  active,
  projectCount,
  completed,
  rate,
}: StatsProps) {
  const cards: {
    icon: IconName;
    tone: string;
    value: number;
    label: string;
    caption: string;
    warn?: boolean;
  }[] = [
    {
      icon: 'calendar',
      tone: 'indigo',
      value: dueToday,
      label: 'Due today',
      caption: overdue > 0 ? `${overdue} overdue` : 'Nothing overdue',
      warn: overdue > 0,
    },
    {
      icon: 'flag',
      tone: 'amber',
      value: active,
      label: 'In progress',
      caption: `${projectCount} project${projectCount === 1 ? '' : 's'}`,
    },
    {
      icon: 'completed',
      tone: 'green',
      value: completed,
      label: 'Completed',
      caption: `${rate}% completion rate`,
    },
  ];

  return (
    <section className="stats" aria-label="Overview">
      {cards.map((card) => (
        <article className="stat" key={card.label}>
          <div className={`stat-icon ${card.tone}`}>
            <Icon name={card.icon} size={19} />
          </div>
          <div className="stat-copy">
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
            <div className={`stat-caption ${card.warn ? 'warn' : ''}`}>{card.caption}</div>
          </div>
        </article>
      ))}
    </section>
  );
}
