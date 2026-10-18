import { useEffect, useRef, useState } from 'react';
import type { Project, Selection, Task, ViewKey } from '../types';
import { todayISO } from '../lib/dates';
import { Icon, type IconName } from './Icons';
import ProgressRing from './ProgressRing';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  projects: Project[];
  selection: Selection;
  onSelect: (selection: Selection) => void;
  onAddProject: (name: string) => void;
}

const NAV: { key: ViewKey; label: string; icon: IconName }[] = [
  { key: 'all', label: 'All tasks', icon: 'inbox' },
  { key: 'today', label: 'Today', icon: 'today' },
  { key: 'upcoming', label: 'Upcoming', icon: 'upcoming' },
  { key: 'completed', label: 'Completed', icon: 'completed' },
];

export default function Sidebar({
  open,
  onClose,
  tasks,
  projects,
  selection,
  onSelect,
  onAddProject,
}: SidebarProps) {
  const today = todayISO();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const active = tasks.filter((task) => !task.done);
  const done = tasks.filter((task) => task.done);
  const counts: Record<ViewKey, number> = {
    all: active.length,
    today: active.filter((task) => task.due !== null && task.due <= today).length,
    upcoming: active.filter((task) => task.due !== null && task.due > today).length,
    completed: done.length,
  };
  const percent = tasks.length === 0 ? 0 : Math.round((done.length / tasks.length) * 100);

  const commitProject = () => {
    const trimmed = name.trim();
    if (trimmed) onAddProject(trimmed);
    setName('');
    setAdding(false);
  };

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Navigation">
      <div className="brand">
        <div className="brand-mark">
          <Icon name="check" size={20} strokeWidth={2.6} />
        </div>
        <div className="brand-copy">
          <div className="brand-name">Taskflow</div>
          <div className="brand-tag">Plan · Focus · Finish</div>
        </div>
        <button
          type="button"
          className="icon-btn sidebar-close"
          onClick={onClose}
          aria-label="Close menu"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <nav className="sidebar-section" aria-label="Views">
        <div className="nav-label">Menu</div>
        <div className="nav">
          {NAV.map((item) => {
            const isActive = selection.kind === 'view' && selection.key === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelect({ kind: 'view', key: item.key })}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nav-icon">
                  <Icon name={item.icon} size={18} />
                </span>
                <span>{item.label}</span>
                <span className="nav-count">{counts[item.key]}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="sidebar-section">
        <div className="nav-label">
          <span>Projects</span>
          <button
            type="button"
            className="mini-btn"
            onClick={() => setAdding((value) => !value)}
            aria-label={adding ? 'Cancel new project' : 'Add project'}
            aria-expanded={adding}
          >
            <Icon name={adding ? 'close' : 'plus'} size={14} />
          </button>
        </div>
        <div className="nav">
          {projects.map((project) => {
            const isActive = selection.kind === 'project' && selection.id === project.id;
            const projectActive = active.filter((task) => task.projectId === project.id).length;
            return (
              <button
                key={project.id}
                type="button"
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelect({ kind: 'project', id: project.id })}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="project-dot" style={{ background: project.color }} />
                <span className="project-name">{project.name}</span>
                <span className="nav-count">{projectActive}</span>
              </button>
            );
          })}

          {adding && (
            <form
              className="project-add"
              onSubmit={(event) => {
                event.preventDefault();
                commitProject();
              }}
            >
              <input
                ref={inputRef}
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setName('');
                    setAdding(false);
                  }
                }}
                placeholder="Project name"
                maxLength={30}
                aria-label="New project name"
              />
              <button type="submit" aria-label="Create project">
                <Icon name="check" size={14} />
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="sidebar-foot">
        <div className="progress-card">
          <ProgressRing value={percent} />
          <div>
            <div className="progress-title">Overall progress</div>
            <div className="progress-sub">
              {done.length} of {tasks.length} tasks done
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
