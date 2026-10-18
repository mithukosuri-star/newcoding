const pad = (value: number) => value.toString().padStart(2, '0');

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDaysISO(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function formatLongDate(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function formatDue(iso: string): string {
  const today = todayISO();
  if (iso === today) return 'Today';
  if (iso === addDaysISO(1)) return 'Tomorrow';
  if (iso === addDaysISO(-1)) return 'Yesterday';

  const date = new Date(`${iso}T00:00:00`);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export type DueTone = 'overdue' | 'today' | 'normal';

export function dueTone(iso: string, done: boolean): DueTone {
  if (done) return 'normal';
  const today = todayISO();
  if (iso < today) return 'overdue';
  if (iso === today) return 'today';
  return 'normal';
}
