export type Priority = 'low' | 'medium' | 'high';
export type Theme = 'light' | 'dark';
export type ViewKey = 'all' | 'today' | 'upcoming' | 'completed';

export interface Project {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  projectId: string | null;
  priority: Priority;
  /** Local date in YYYY-MM-DD format, or null when the task has no due date. */
  due: string | null;
  done: boolean;
  createdAt: number;
  completedAt: number | null;
}

export type TaskDraft = Pick<Task, 'title' | 'notes' | 'projectId' | 'priority' | 'due'>;

export type Selection =
  | { kind: 'view'; key: ViewKey }
  | { kind: 'project'; id: string };
