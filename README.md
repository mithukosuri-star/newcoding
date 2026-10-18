# Taskflow

A calm, focused task manager. Plan your day, keep projects moving, and finish what matters.

![Taskflow](https://img.shields.io/badge/React-18-149eca) ![Vite](https://img.shields.io/badge/Vite-6-646cff) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)

## Features

- **Views** — All tasks, Today (including overdue), Upcoming, and Completed
- **Projects** — color-coded projects you can create on the fly
- **Task details** — notes, priority (low / medium / high), and due dates
- **Search & filters** — instant search across titles and notes, plus priority filters
- **Sorting** — smart, due date, priority, or newest
- **Completion flow** — tick tasks off, reopen them, and see today's progress
- **Undo deletes** — accidental deletions are recoverable from a toast
- **Light & dark mode** — follows your preference with a one-click toggle
- **Local-first** — everything is saved in `localStorage`; no account, no server

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `N` | New task |
| `/` or `Ctrl/Cmd + K` | Focus search |
| `Esc` | Close dialog or menu |

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Build

```bash
npm run build
npm run preview
```

## Stack

React 18 · TypeScript · Vite 6 · hand-written CSS (no UI framework)

## Project structure

```
src/
  App.tsx                 app shell, state, filtering, and sorting
  components/
    Sidebar.tsx           navigation, projects, overall progress
    TaskItem.tsx          a single task row
    TaskModal.tsx         create / edit dialog
    Stats.tsx             overview cards
    EmptyState.tsx        contextual empty states
    ProgressRing.tsx      SVG progress ring
    Icons.tsx             inline SVG icon set
  hooks/
    usePersistentState.ts localStorage-backed state
  lib/
    dates.ts              local-date helpers
  seed.ts                 starter tasks and projects
  types.ts                shared types
```
