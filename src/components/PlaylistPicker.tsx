import { useEffect, useRef, useState } from 'react';
import { getTrack, tracksFromIds } from '../data/catalog';
import { usePlayer } from '../player/PlayerContext';
import Cover from './Cover';
import CoverMosaic from './CoverMosaic';
import { Icon } from './Icons';

export default function PlaylistPicker() {
  const {
    playlistPickerFor,
    closePlaylistPicker,
    playlists,
    addTrackToPlaylist,
    createPlaylist,
  } = usePlayer();
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!playlistPickerFor) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePlaylistPicker();
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [playlistPickerFor, closePlaylistPicker]);

  useEffect(() => {
    if (playlistPickerFor) {
      setName('');
      window.setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [playlistPickerFor]);

  if (!playlistPickerFor) return null;
  const track = getTrack(playlistPickerFor);
  if (!track) return null;

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closePlaylistPicker();
      }}
    >
      <div className="modal picker" role="dialog" aria-modal="true" aria-labelledby="picker-title">
        <header className="modal-head">
          <div>
            <h2 id="picker-title">Add to playlist</h2>
            <p>Choose where this track should live.</p>
          </div>
          <button
            type="button"
            className="icon-btn ghost"
            onClick={closePlaylistPicker}
            aria-label="Close"
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="picker-track">
          <Cover src={track.cover} alt="" accent={track.accent} rounded={10} />
          <div>
            <strong>{track.title}</strong>
            <span>
              {track.artist} · {track.album}
            </span>
          </div>
        </div>

        <div className="picker-list">
          {playlists.map((playlist) => {
            const has = playlist.trackIds.includes(track.id);
            return (
              <button
                key={playlist.id}
                type="button"
                className="picker-item"
                onClick={() => {
                  addTrackToPlaylist(playlist.id, track.id);
                  closePlaylistPicker();
                }}
              >
                <CoverMosaic tracks={tracksFromIds(playlist.trackIds)} className="picker-mosaic" />
                <span className="picker-item-text">
                  <span className="picker-item-name">{playlist.name}</span>
                  <span className="picker-item-sub">
                    {playlist.trackIds.length} track{playlist.trackIds.length === 1 ? '' : 's'}
                  </span>
                </span>
                <span className={`picker-check ${has ? 'has' : ''}`}>
                  <Icon name={has ? 'check' : 'plus'} size={15} />
                </span>
              </button>
            );
          })}
          {playlists.length === 0 && (
            <p className="picker-empty">No playlists yet — create your first one below.</p>
          )}
        </div>

        <form
          className="picker-new"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            createPlaylist(name, track.id);
            setName('');
            closePlaylistPicker();
          }}
        >
          <input
            ref={inputRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="New playlist name"
            maxLength={40}
            aria-label="New playlist name"
          />
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            Create
          </button>
        </form>
      </div>
    </div>
  );
}
