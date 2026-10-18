import { useEffect, useRef, useState } from 'react';
import { albums, tracks, totalDuration } from '../data/catalog';
import { formatTotal } from '../lib/format';
import { useNav } from '../nav/NavContext';
import { usePlayer } from '../player/PlayerContext';
import type { View } from '../types';
import CoverMosaic from './CoverMosaic';
import { Icon, type IconName } from './Icons';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const NAV: { label: string; view: View; icon: IconName; match: string }[] = [
  { label: 'Home', view: { kind: 'home' }, icon: 'home', match: 'home' },
  { label: 'Search', view: { kind: 'search' }, icon: 'search', match: 'search' },
  { label: 'Your library', view: { kind: 'library' }, icon: 'library', match: 'library' },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { view, navigate } = useNav();
  const { playlists, favorites, createPlaylist } = usePlayer();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const go = (next: View) => {
    navigate(next);
    onClose();
  };

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed) createPlaylist(trimmed);
    setName('');
    setCreating(false);
  };

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="brand-text">
          <span className="brand-name">sonora</span>
          <span className="brand-tag">original catalog</span>
        </div>
        <button type="button" className="icon-btn sidebar-close" onClick={onClose} aria-label="Close menu">
          <Icon name="close" size={18} />
        </button>
      </div>

      <nav className="side-nav" aria-label="Browse">
        {NAV.map((item) => {
          const active = view.kind === item.match;
          return (
            <button
              key={item.label}
              type="button"
              className={`side-item ${active ? 'active' : ''}`}
              onClick={() => go(item.view)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="side-section">
        <span className="side-label">Collection</span>
        <button
          type="button"
          className={`side-item ${view.kind === 'favorites' ? 'active' : ''}`}
          onClick={() => go({ kind: 'favorites' })}
        >
          <Icon name="heart" size={18} />
          <span>Favorites</span>
          <span className="side-count">{favorites.length}</span>
        </button>
        <button
          type="button"
          className="side-item"
          onClick={() => go({ kind: 'library' })}
        >
          <Icon name="disc" size={18} />
          <span>Albums</span>
          <span className="side-count">{albums.length}</span>
        </button>
      </div>

      <div className="side-section playlists">
        <div className="side-label-row">
          <span className="side-label">Playlists</span>
          <button
            type="button"
            className="mini-btn"
            onClick={() => setCreating((value) => !value)}
            aria-label={creating ? 'Cancel new playlist' : 'Create playlist'}
            aria-expanded={creating}
          >
            <Icon name={creating ? 'close' : 'plus'} size={14} />
          </button>
        </div>

        {creating && (
          <form
            className="new-playlist"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <input
              ref={inputRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setCreating(false);
                  setName('');
                }
              }}
              placeholder="Playlist name"
              maxLength={40}
              aria-label="New playlist name"
            />
            <button type="submit" aria-label="Create playlist">
              <Icon name="check" size={14} />
            </button>
          </form>
        )}

        <div className="side-playlists">
          {playlists.map((playlist) => {
            const list = playlist.trackIds
              .map((id) => tracks.find((track) => track.id === id))
              .filter(Boolean) as typeof tracks;
            const active = view.kind === 'playlist' && view.id === playlist.id;
            return (
              <button
                key={playlist.id}
                type="button"
                className={`side-playlist ${active ? 'active' : ''}`}
                onClick={() => go({ kind: 'playlist', id: playlist.id })}
              >
                <CoverMosaic tracks={list} className="side-mosaic" />
                <span className="side-playlist-text">
                  <span className="side-playlist-name">{playlist.name}</span>
                  <span className="side-playlist-sub">
                    {playlist.trackIds.length === 0
                      ? 'Empty playlist'
                      : `${playlist.trackIds.length} track${playlist.trackIds.length === 1 ? '' : 's'}`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="side-foot">
        <div className="side-stat">
          <Icon name="sparkle" size={16} />
          <div>
            <strong>{tracks.length} original tracks</strong>
            <span>{formatTotal(totalDuration(tracks))} of music, all synthesized in-house.</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
