import type { Project, Task } from '../types';
import { dueTone, formatDue } from '../lib/dates';
import { Icon } from './Icons';

interface TaskItemProps {
  task: Task;
  project?: Project;
  index: number;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const PRIORITY_LABEL = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
} as const;

export default function TaskItem({
  task,
  project,
  index,
  onToggle,
  onEdit,
  onDelete,
}: TaskItemProps) {
  const tone = task.due ? dueTone(task.due, task.done) : 'normal';

  return (
    <li
      className={`task ${task.done ? 'is-done' : ''}`}
      style={{ animationDelay: `${Math.min(index * 30, 240)}ms` }}
    >
      <button
        type="button"
        className="check"
        aria-pressed={task.done}
        aria-label={task.done ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`}
        onClick={() => onToggle(task.id)}
      >
        <Icon name="check" size={13} strokeWidth={3} />
      </button>

      <div
        className="task-body"
        role="button"
        tabIndex={0}
        onClick={() => onEdit(task)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onEdit(task);
          }
        }}
        aria-label={`Edit task: ${task.title}`}
      >
        <div className="task-title">{task.title}</div>
        {task.notes && <p className="task-notes">{task.notes}</p>}
        <div className="task-meta">
          {project && (
            <span className="chip project-chip">
              <span className="dot" style={{ background: project.color }} />
              {project.name}
            </span>
          )}
          <span className={`chip priority-${task.priority}`}>
            <Icon name="flag" size={12} />
            {PRIORITY_LABEL[task.priority]}
          </span>
          {task.due && (
            <span className={`chip due ${tone}`}>
              <Icon name="calendar" size={12} />
              {formatDue(task.due)}
            </span>
          )}
        </div>
      </div>

      <div className="task-actions">
        <button
          type="button"
          className="task-action"
          onClick={() => onEdit(task)}
          aria-label={`Edit “${task.title}”`}
        >
          <Icon name="pencil" size={16} />
        </button>
        <button
          type="button"
          className="task-action danger"
          onClick={() => onDelete(task)}
          aria-label={`Delete “${task.title}”`}
        >
          <Icon name="trash" size={16} />
        </button>
      </div>
    </li>
  );
}
