import { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import TaskItem from './components/TaskItem';
import TaskModal from './components/TaskModal';
import Stats from './components/Stats';
import EmptyState from './components/EmptyState';
import { Icon } from './components/Icons';
import { usePersistentState } from './hooks/usePersistentState';
import { seedProjects, seedTasks } from './seed';
import { addDaysISO, formatLongDate, greeting, todayISO } from './lib/dates';
import type {
  Priority,
  Project,
  Selection,
  Task,
  TaskDraft,
  Theme,
  ViewKey,
} from './types';

type SortKey = 'smart' | 'due' | 'priority' | 'created';

const VIEW_TITLES: Record<ViewKey, string> = {
  all: 'All tasks',
  today: 'Today',
  upcoming: 'Upcoming',
  completed: 'Completed',
};

const HERO_TITLES: Record<ViewKey, string> = {
  all: "Let's make today count.",
  today: 'Focus on what matters.',
  upcoming: 'A little ahead of the game.',
  completed: 'Look how far you have come.',
};

const PRIORITY_WEIGHT: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_FILTERS: { value: 'all' | Priority; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'smart', label: 'Smart' },
  { value: 'due', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'created', label: 'Newest' },
];
const PROJECT_COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6'];

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function sortActive(tasks: Task[], sort: SortKey): Task[] {
  const copy = [...tasks];
  switch (sort) {
    case 'due':
      return copy.sort((a, b) => (a.due ?? '9999-12-31').localeCompare(b.due ?? '9999-12-31'));
    case 'priority':
      return copy.sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]);
    case 'created':
      return copy.sort((a, b) => b.createdAt - a.createdAt);
    default:
      return copy.sort((a, b) => {
        if (a.due !== b.due) {
          if (!a.due) return 1;
          if (!b.due) return -1;
          return a.due.localeCompare(b.due);
        }
        return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      });
  }
}

function sortDone(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
}

export default function App() {
  const [tasks, setTasks] = usePersistentState<Task[]>('taskflow.tasks.v1', seedTasks);
  const [projects, setProjects] = usePersistentState<Project[]>('taskflow.projects.v1', seedProjects);
  const [theme, setTheme] = usePersistentState<Theme>('taskflow.theme.v1', () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  );

  const [selection, setSelection] = useState<Selection>({ kind: 'view', key: 'all' });
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<'all' | Priority>('all');
  const [sort, setSort] = useState<SortKey>('smart');
  const [showCompleted, setShowCompleted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [toast, setToast] = useState<Task | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  const today = todayISO();
  const project = selection.kind === 'project' ? projects.find((p) => p.id === selection.id) : undefined;
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const isCompletedView = selection.kind === 'view' && selection.key === 'completed';

  const heading = selection.kind === 'project' ? (project?.name ?? 'Project') : VIEW_TITLES[selection.key];
  const heroTitle =
    selection.kind === 'project' ? `Keep ${project?.name ?? 'it'} moving.` : HERO_TITLES[selection.key];

  const todayTasks = tasks.filter((task) => task.due === today);
  const todayDone = todayTasks.filter((task) => task.done).length;
  const todayPercent = todayTasks.length === 0 ? 0 : Math.round((todayDone / todayTasks.length) * 100);

  const overdueCount = tasks.filter((task) => !task.done && task.due !== null && task.due < today).length;
  const activeCount = tasks.filter((task) => !task.done).length;
  const completedCount = tasks.length - activeCount;
  const completionRate = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  const scoped = useMemo(() => {
    if (selection.kind === 'project') return tasks.filter((task) => task.projectId === selection.id);
    switch (selection.key) {
      case 'today':
        return tasks.filter((task) => task.due !== null && task.due <= today);
      case 'upcoming':
        return tasks.filter((task) => task.due !== null && task.due > today);
      case 'completed':
        return tasks.filter((task) => task.done);
      default:
        return tasks;
    }
  }, [tasks, selection, today]);

  const query = search.trim().toLowerCase();
  const visible = scoped.filter((task) => {
    if (priority !== 'all' && task.priority !== priority) return false;
    if (!query) return true;
    return (
      task.title.toLowerCase().includes(query) || task.notes.toLowerCase().includes(query)
    );
  });

  const activeTasks = sortActive(visible.filter((task) => !task.done), sort);
  const doneTasks = sortDone(visible.filter((task) => task.done));
  const hasFilters = query.length > 0 || priority !== 'all';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', theme === 'dark' ? '#0b0d16' : '#f5f6fb');
  }, [theme]);

  useEffect(() => {
    document.title = `${heading} · Taskflow`;
  }, [heading]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (task: Task) => {
    setEditing(task);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable);

      if (event.key === 'Escape') {
        setSidebarOpen(false);
        return;
      }
      if (typing || modalOpen) return;

      if (event.key === 'n' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        openNew();
      }
      if (event.key === '/') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalOpen]);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, done: !task.done, completedAt: task.done ? null : Date.now() }
          : task,
      ),
    );
  };

  const saveTask = (draft: TaskDraft, id: string | null) => {
    if (id) {
      setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...draft } : task)));
    } else {
      setTasks((prev) => [
        { id: makeId(), ...draft, done: false, createdAt: Date.now(), completedAt: null },
        ...prev,
      ]);
    }
    closeModal();
  };

  const deleteTask = (task: Task) => {
    setTasks((prev) => prev.filter((item) => item.id !== task.id));
    setToast(task);
    closeModal();
  };

  const undoDelete = () => {
    if (!toast) return;
    const restored = toast;
    setTasks((prev) => (prev.some((task) => task.id === restored.id) ? prev : [...prev, restored]));
    setToast(null);
  };

  const addProject = (name: string) => {
    const newProject: Project = {
      id: makeId(),
      name,
      color: PROJECT_COLORS[projects.length % PROJECT_COLORS.length],
    };
    setProjects((prev) => [...prev, newProject]);
    setSelection({ kind: 'project', id: newProject.id });
    setSidebarOpen(false);
  };

  const select = (next: Selection) => {
    setSelection(next);
    setSidebarOpen(false);
  };

  const clearFilters = () => {
    setSearch('');
    setPriority('all');
  };

  const defaultProjectId = selection.kind === 'project' ? selection.id : null;
  const defaultDue =
    selection.kind === 'view'
      ? selection.key === 'today'
        ? today
        : selection.key === 'upcoming'
          ? addDaysISO(1)
          : ''
      : '';

  const listCount = isCompletedView ? doneTasks.length : activeTasks.length;

  const renderEmpty = () => {
    if (hasFilters) {
      return (
        <EmptyState
          icon="search"
          title="No matching tasks"
          description="Nothing lines up with this search or filter. Try a different keyword or clear them."
          actionLabel="Clear filters"
          onAction={clearFilters}
        />
      );
    }
    if (isCompletedView) {
      return (
        <EmptyState
          icon="completed"
          title="Nothing completed yet"
          description="Check off a task and it will land here. Every small win counts."
          actionLabel="Go to today's tasks"
          onAction={() => setSelection({ kind: 'view', key: 'today' })}
        />
      );
    }
    if (selection.kind === 'view' && selection.key === 'today') {
      return (
        <EmptyState
          icon="sun"
          title="You're all clear"
          description="No tasks are due today. Enjoy the breathing room, or plan something new."
          actionLabel="Add a task"
          onAction={openNew}
        />
      );
    }
    if (selection.kind === 'view' && selection.key === 'upcoming') {
      return (
        <EmptyState
          icon="upcoming"
          title="Nothing on the horizon"
          description="Tasks with future due dates will show up here so you can plan ahead."
          actionLabel="Add a task"
          onAction={openNew}
        />
      );
    }
    if (selection.kind === 'project') {
      return (
        <EmptyState
          icon="inbox"
          title={`${heading} is empty`}
          description="A fresh start. Add the first task for this project and build momentum."
          actionLabel="Add a task"
          onAction={openNew}
        />
      );
    }
    return (
      <EmptyState
        icon="inbox"
        title="Your list is empty"
        description="Add your first task and Taskflow will help you keep it moving."
        actionLabel="Add a task"
        onAction={openNew}
      />
    );
  };

  const isDoneOpen = isCompletedView || showCompleted;
  const showEmpty = activeTasks.length === 0 && doneTasks.length === 0;

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        tasks={tasks}
        projects={projects}
        selection={selection}
        onSelect={select}
        onAddProject={addProject}
      />

      {sidebarOpen && (
        <button
          type="button"
          className="backdrop"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="main">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Icon name="menu" size={19} />
          </button>

          <div className="topbar-title">
            <div className="eyebrow">{formatLongDate()}</div>
            <h1>{heading}</h1>
          </div>

          <div className="topbar-actions">
            <div className="search">
              <Icon name="search" size={16} />
              <input
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tasks…"
                aria-label="Search tasks"
              />
              {search ? (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  <Icon name="close" size={13} />
                </button>
              ) : (
                <kbd>/</kbd>
              )}
            </div>
            <button
              type="button"
              className="icon-btn theme-btn"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={openNew}
              aria-label="New task"
              title="New task (N)"
            >
              <Icon name="plus" size={16} strokeWidth={2.4} />
              <span className="btn-label">New task</span>
            </button>
          </div>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <div className="hero-greeting">
              <span className="hero-spark" />
              {greeting()}
            </div>
            <h2>{heroTitle}</h2>
            <p>
              {todayTasks.length} due today · {overdueCount} overdue · {activeCount} active in total
            </p>
          </div>
          <div className="hero-progress">
            <div className="hero-progress-head">
              <span>Today&apos;s progress</span>
              <strong>
                {todayDone}/{todayTasks.length}
              </strong>
            </div>
            <div className="bar">
              <div className="fill" style={{ width: `${todayPercent}%` }} />
            </div>
            <div className="hero-progress-foot">
              {todayTasks.length === 0
                ? 'Nothing scheduled — a clean slate.'
                : todayPercent === 100
                  ? 'All done. Enjoy your day.'
                  : `${todayTasks.length - todayDone} task${
                      todayTasks.length - todayDone === 1 ? '' : 's'
                    } left to go`}
            </div>
          </div>
        </section>

        <Stats
          dueToday={todayTasks.filter((task) => !task.done).length}
          overdue={overdueCount}
          active={activeCount}
          projectCount={projects.length}
          completed={completedCount}
          rate={completionRate}
        />

        <section className="panel" aria-label="Task list">
          <div className="toolbar">
            <div className="filters" role="group" aria-label="Filter by priority">
              {PRIORITY_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={`filter ${priority === filter.value ? 'active' : ''}`}
                  onClick={() => setPriority(filter.value)}
                  aria-pressed={priority === filter.value}
                >
                  {filter.value !== 'all' && <span className={`filter-dot ${filter.value}`} />}
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="toolbar-right">
              <span className="task-total">
                {listCount} {listCount === 1 ? 'task' : 'tasks'}
              </span>
              <label className="sort">
                <span>Sort</span>
                <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {showEmpty ? (
            renderEmpty()
          ) : (
            <ul className="task-list">
              {activeTasks.map((task, index) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  project={task.projectId ? projectMap.get(task.projectId) : undefined}
                  index={index}
                  onToggle={toggleTask}
                  onEdit={openEdit}
                  onDelete={deleteTask}
                />
              ))}

              {!isCompletedView && activeTasks.length === 0 && doneTasks.length > 0 && (
                <li className="all-clear">
                  <span className="all-clear-icon">
                    <Icon name="check" size={14} strokeWidth={2.6} />
                  </span>
                  You&apos;re all caught up. Nice work!
                </li>
              )}

              {!isCompletedView && doneTasks.length > 0 && (
                <li className="completed-head">
                  <button
                    type="button"
                    className={`completed-toggle ${showCompleted ? 'open' : ''}`}
                    onClick={() => setShowCompleted((value) => !value)}
                    aria-expanded={showCompleted}
                  >
                    <span className="chev" />
                    Completed
                    <span className="completed-count">{doneTasks.length}</span>
                  </button>
                </li>
              )}

              {isDoneOpen &&
                doneTasks.map((task, index) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    project={task.projectId ? projectMap.get(task.projectId) : undefined}
                    index={index}
                    onToggle={toggleTask}
                    onEdit={openEdit}
                    onDelete={deleteTask}
                  />
                ))}
            </ul>
          )}
        </section>

        <footer className="foot">
          <span>Taskflow</span> · Your tasks stay private on this device · Press <kbd>N</kbd> for a new
          task
        </footer>
      </main>

      {modalOpen && (
        <TaskModal
          key={editing?.id ?? 'new-task'}
          task={editing}
          projects={projects}
          defaultProjectId={defaultProjectId}
          defaultDue={defaultDue}
          onClose={closeModal}
          onSave={saveTask}
          onDelete={deleteTask}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <span className="toast-check">
            <Icon name="trash" size={14} />
          </span>
          <span>
            Task deleted <strong>“{toast.title}”</strong>
          </span>
          <button type="button" onClick={undoDelete}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
