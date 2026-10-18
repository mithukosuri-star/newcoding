import { useEffect, useState } from 'react';
import { formatTotal, plural } from '../lib/format';
import { tracksFromIds } from '../data/catalog';
import { useCollection } from '../hooks/useCollection';
import { useNav } from '../nav/NavContext';
import { usePlayer } from '../player/PlayerContext';
import CoverMosaic from '../components/CoverMosaic';
import EmptyState from '../components/EmptyState';
import TrackRow from '../components/TrackRow';
import { Icon } from '../components/Icons';

export default function PlaylistView({ id }: { id: string }) {
  const { playlists, renamePlaylist, deletePlaylist, removeTrackFromPlaylist } = usePlayer();
  const { back, navigate } = useNav();
  const playlist = playlists.find((item) => item.id === id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(playlist?.name ?? '');
  const [confirming, setConfirming] = useState(false);

  const list = tracksFromIds(playlist?.trackIds ?? []);
  const ids = list.map((track) => track.id);
  const collection = useCollection(ids);
  const duration = list.reduce((sum, track) => sum + track.duration, 0);

  useEffect(() => {
    if (!playlist) back();
  }, [playlist, back]);

  if (!playlist) return null;

  const saveName = () => {
    if (draft.trim()) renamePlaylist(playlist.id, draft);
    setEditing(false);
  };

  return (
    <div className="view collection-view">
      <header className="collection-hero">
        <div className="collection-art">
          <CoverMosaic tracks={list} rounded={18} />
        </div>
        <div className="collection-body">
          <span className="eyebrow">Playlist</span>
          {editing ? (
            <form
              className="playlist-edit"
              onSubmit={(event) => {
                event.preventDefault();
                saveName();
              }}
            >
              <input
                className="text-input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={saveName}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setDraft(playlist.name);
                    setEditing(false);
                  }
                }}
                maxLength={40}
                autoFocus
                aria-label="Playlist name"
              />
            </form>
          ) : (
            <div className="collection-title-row">
              <h2>{playlist.name}</h2>
              <button
                type="button"
                className="icon-btn ghost tiny"
                onClick={() => {
                  setDraft(playlist.name);
                  setEditing(true);
                }}
                aria-label="Rename playlist"
                title="Rename"
              >
                <Icon name="chevronRight" size={15} />
              </button>
            </div>
          )}
          <p className="collection-meta">
            {plural(list.length, 'track')}
            {list.length > 0 && ` · ${formatTotal(duration)}`}
          </p>
          <div className="collection-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={collection.play}
              disabled={list.length === 0}
            >
              <Icon name={collection.isPlaying ? 'pause' : 'play'} size={17} />
              {collection.isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={collection.shuffle}
              disabled={list.length === 0}
            >
              <Icon name="shuffle" size={16} />
              Shuffle
            </button>
            <button
              type="button"
              className="btn btn-ghost danger"
              onClick={() => setConfirming(true)}
            >
              <Icon name="trash" size={16} />
              Delete
            </button>
          </div>
          {confirming && (
            <div className="confirm">
              <span>Delete “{playlist.name}”?</span>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  deletePlaylist(playlist.id);
                  back();
                }}
              >
                Delete
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </header>

      {list.length === 0 ? (
        <EmptyState
          icon="list"
          title="This playlist is waiting"
          description="Add tracks from anywhere in the app — hit the ••• menu on any row and choose “Add to playlist”."
          actionLabel="Browse the library"
          onAction={() => navigate({ kind: 'library' })}
        />
      ) : (
        <div className="track-list">
          {list.map((track, index) => (
            <TrackRow
              key={track.id}
              track={track}
              index={index}
              contextIds={ids}
              showCover
              onRemove={() => removeTrackFromPlaylist(playlist.id, track.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
