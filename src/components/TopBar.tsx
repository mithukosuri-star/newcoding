import { useRef } from 'react';
import { useNav } from '../nav/NavContext';
import { Icon } from './Icons';

interface TopBarProps {
  title: string;
  subtitle?: string;
  search: string;
  onSearch: (value: string) => void;
  onOpenMenu: () => void;
  onOpenQueue: () => void;
}

export default function TopBar({
  title,
  subtitle,
  search,
  onSearch,
  onOpenMenu,
  onOpenQueue,
}: TopBarProps) {
  const { view, navigate, back, canGoBack } = useNav();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="topbar">
      <button type="button" className="icon-btn menu-btn" onClick={onOpenMenu} aria-label="Open menu">
        <Icon name="menu" size={19} />
      </button>

      {canGoBack && (
        <button type="button" className="icon-btn back-btn" onClick={back} aria-label="Go back">
          <Icon name="chevronLeft" size={19} />
        </button>
      )}

      <div className="topbar-heading">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>

      <div className="topbar-right">
        <label className={`topbar-search ${view.kind === 'search' ? 'focus' : ''}`}>
          <Icon name="search" size={17} />
          <input
            ref={inputRef}
            value={search}
            onChange={(event) => {
              onSearch(event.target.value);
              if (view.kind !== 'search') navigate({ kind: 'search' });
            }}
            onFocus={() => {
              if (view.kind !== 'search') navigate({ kind: 'search' });
            }}
            placeholder="Search tracks, albums, artists"
            aria-label="Search"
          />
          {search ? (
            <button
              type="button"
              className="search-clear"
              onClick={() => {
                onSearch('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <Icon name="close" size={13} />
            </button>
          ) : (
            <kbd>/</kbd>
          )}
        </label>

        <button
          type="button"
          className="icon-btn queue-btn"
          onClick={onOpenQueue}
          aria-label="Open queue"
          title="Queue"
        >
          <Icon name="queue" size={19} />
        </button>

        <div className="avatar" aria-label="Your profile">
          <span>M</span>
        </div>
      </div>
    </header>
  );
}
