import { useEffect, useState, type FormEvent } from 'react';
import type { Priority, Project, Task, TaskDraft } from '../types';
import { Icon } from './Icons';

interface TaskModalProps {
  task: Task | null;
  projects: Project[];
  defaultProjectId: string | null;
  defaultDue: string;
  onClose: () => void;
  onSave: (draft: TaskDraft, id: string | null) => void;
  onDelete: (task: Task) => void;
}

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export default function TaskModal({
  task,
  projects,
  defaultProjectId,
  defaultDue,
  onClose,
  onSave,
  onDelete,
}: TaskModalProps) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [projectId, setProjectId] = useState(task?.projectId ?? defaultProjectId ?? '');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium');
  const [due, setDue] = useState(task?.due ?? defaultDue);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSave(
      {
        title: trimmed,
        notes: notes.trim(),
        projectId: projectId || null,
        priority,
        due: due || null,
      },
      task?.id ?? null,
    );
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
        <div className="modal-head">
          <div>
            <h2 id="task-modal-title">{task ? 'Edit task' : 'New task'}</h2>
            <p>{task ? 'Update the details and keep moving.' : 'Small steps, big momentum.'}</p>
          </div>
          <button type="button" className="icon-btn small" onClick={onClose} aria-label="Close dialog">
            <Icon name="close" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="task-title">
              Task name <span className="required">*</span>
            </label>
            <input
              id="task-title"
              className="text-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Draft the launch checklist"
              maxLength={120}
              autoFocus
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label htmlFor="task-notes">
              Notes <span className="optional">optional</span>
            </label>
            <textarea
              id="task-notes"
              className="text-input"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add context, links, or a small checklist…"
              maxLength={500}
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="task-project">Project</label>
              <select
                id="task-project"
                className="text-input"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
              >
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          <div className="field">
            <label htmlFor="task-due">
              Due date <span className="optional">optional</span>
            </label>
            <input
              id="task-due"
              className="text-input"
              type="date"
              value={due}
              onChange={(event) => setDue(event.target.value)}
            />
          </div>
          </div>

          <div className="field">
            <span className="field-label">Priority</span>
            <div className="priority-group" role="group" aria-label="Priority">
              {PRIORITIES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`priority-option p-${option.value} ${
                    priority === option.value ? 'active' : ''
                  }`}
                  onClick={() => setPriority(option.value)}
                  aria-pressed={priority === option.value}
                >
                  <span className="priority-dot" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            {task && (
              <button
                type="button"
                className="btn btn-ghost btn-delete"
                onClick={() => onDelete(task)}
              >
                <Icon name="trash" size={15} />
                Delete
              </button>
            )}
            <div className="spacer" />
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
              {task ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
