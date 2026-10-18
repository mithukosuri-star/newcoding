import type { Project, Task } from './types';
import { addDaysISO, todayISO } from './lib/dates';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const now = Date.now();

export const seedProjects: Project[] = [
  { id: 'work', name: 'Work', color: '#6366f1' },
  { id: 'personal', name: 'Personal', color: '#ec4899' },
  { id: 'health', name: 'Health', color: '#10b981' },
];

export const seedTasks: Task[] = [
  {
    id: 'seed-1',
    title: 'Finalize project proposal',
    notes: 'Send the revised deck to the client before 5pm.',
    projectId: 'work',
    priority: 'high',
    due: todayISO(),
    done: false,
    createdAt: now - 3 * DAY,
    completedAt: null,
  },
  {
    id: 'seed-2',
    title: 'Review pull requests',
    notes: 'Two PRs are waiting on your feedback.',
    projectId: 'work',
    priority: 'medium',
    due: todayISO(),
    done: false,
    createdAt: now - 2 * DAY,
    completedAt: null,
  },
  {
    id: 'seed-3',
    title: 'Morning run — 5k',
    notes: '',
    projectId: 'health',
    priority: 'medium',
    due: todayISO(),
    done: true,
    createdAt: now - 5 * HOUR,
    completedAt: now - 2 * HOUR,
  },
  {
    id: 'seed-4',
    title: 'Buy groceries for the week',
    notes: 'Oats, berries, olive oil, coffee beans.',
    projectId: 'personal',
    priority: 'low',
    due: addDaysISO(1),
    done: false,
    createdAt: now - DAY,
    completedAt: null,
  },
  {
    id: 'seed-5',
    title: 'Reply to design feedback',
    notes: 'The team left notes on the new onboarding flow.',
    projectId: 'work',
    priority: 'high',
    due: addDaysISO(-1),
    done: false,
    createdAt: now - 2 * DAY,
    completedAt: null,
  },
  {
    id: 'seed-6',
    title: 'Book dentist appointment',
    notes: '',
    projectId: 'personal',
    priority: 'medium',
    due: addDaysISO(3),
    done: false,
    createdAt: now - 6 * HOUR,
    completedAt: null,
  },
  {
    id: 'seed-7',
    title: 'Water the plants',
    notes: '',
    projectId: 'personal',
    priority: 'low',
    due: todayISO(),
    done: true,
    createdAt: now - 7 * HOUR,
    completedAt: now - 4 * HOUR,
  },
  {
    id: 'seed-8',
    title: 'Explore ideas for the new portfolio',
    notes: 'Collect three references and sketch a rough layout.',
    projectId: 'personal',
    priority: 'low',
    due: null,
    done: false,
    createdAt: now - 30 * MINUTE,
    completedAt: null,
  },
];
