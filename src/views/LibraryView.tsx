import { useState } from 'react';
import { albums, artists, tracks, tracksFromIds } from '../data/catalog';
import { useCollection } from '../hooks/useCollection';
import { useNav } from '../nav/NavContext';
import { usePlayer } from '../player/PlayerContext';
import Cover from '../components/Cover';
import CoverMosaic from '../components/CoverMosaic';
import MediaCard from '../components/MediaCard';
import TrackRow from '../components/TrackRow';
import { Icon } from '../components/Icons';
import type { Playlist } from '../types';

type Tab = 'playlists' | 'albums' | 'artists' | 'tracks';

const TABS: { key: Tab; label: string }[] = [
  { key: 'playlists', label: 'Playlists' },
  { key: 'albums', label: 'Albums' },
  { key: 'artists', label: 'Artists' },
  { key: 'tracks', label: 'All tracks' },
];

function PlaylistCard({ playlist, onOpen }: { playlist: Playlist; onOpen: () => void }) {
  const collection = useCollection(playlist.trackIds);
  return (
    <div
      className="playlist-card"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <CoverMosaic tracks={tracksFromIds(playlist.trackIds)} className="playlist-card-art" />
      <div className="playlist-card-body">
        <div>
          <span className="playlist-card-name">{playlist.name}</span>
          <span className="playlist-card-sub">
            {playlist.trackIds.length} track{playlist.trackIds.length === 1 ? '' : 's'}
          </span>
        </div>
        <button
          type="button"
          className="card-play static"
          onClick={(event) => {
            event.stopPropagation();
            collection.play();
          }}
          aria-label={collection.isPlaying ? `Pause ${playlist.name}` : `Play ${playlist.name}`}
        >
          <Icon name={collection.isPlaying ? 'pause' : 'play'} size={17} />
        </button>
      </div>
    </div>
  );
}

export default function LibraryView() {
  const { navigate } = useNav();
  const { playlists, createPlaylist } = usePlayer();
  const [tab, setTab] = useState<Tab>('playlists');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const allIds = tracks.map((track) => track.id);
  const all = useCollection(allIds);

  return (
    <div className="view library-view">
      <header className="library-head">
        <div>
          <span className="eyebrow">Your collection</span>
          <h2>Everything you save, in one place.</h2>
        </div>
        <div className="library-head-actions">
          <button type="button" className="btn btn-primary" onClick={all.play}>
            <Icon name={all.isPlaying ? 'pause' : 'play'} size={16} />
            {all.isPlaying ? 'Pause' : 'Play all'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={all.shuffle}>
            <Icon name="shuffle" size={16} />
            Shuffle
          </button>
        </div>
      </header>

      <div className="tabs" role="tablist" aria-label="Library sections">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={`tab ${tab === item.key ? 'active' : ''}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'playlists' && (
        <section className="block">
          <div className="playlist-grid">
            <button type="button" className="playlist-new" onClick={() => setCreating(true)}>
              <span className="playlist-new-icon">
                <Icon name="plus" size={24} />
              </span>
              <span>Create playlist</span>
            </button>
            {playlists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onOpen={() => navigate({ kind: 'playlist', id: playlist.id })}
              />
            ))}
          </div>
        </section>
      )}

      {tab === 'albums' && (
        <section className="block">
          <div className="card-grid">
            {albums.map((album) => (
              <AlbumCard key={album.name} name={album.name} onOpen={() => navigate({ kind: 'album', name: album.name })} />
            ))}
          </div>
        </section>
      )}

      {tab === 'artists' && (
        <section className="block">
          <div className="artist-row">
            {artists.map((artist) => (
              <button
                key={artist.name}
                type="button"
                className="artist-card"
                onClick={() => navigate({ kind: 'artist', name: artist.name })}
              >
                <span className="artist-card-art">
                  <Cover src={artist.cover} alt={artist.name} accent={artist.accent} rounded={999} />
                </span>
                <span className="artist-card-name">{artist.name}</span>
                <span className="artist-card-sub">
                  {artist.tracks.length} track{artist.tracks.length === 1 ? '' : 's'}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {tab === 'tracks' && (
        <section className="block">
          <div className="track-list">
            {tracks.map((track, index) => (
              <TrackRow key={track.id} track={track} index={index} contextIds={allIds} />
            ))}
          </div>
        </section>
      )}

      {creating && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCreating(false);
          }}
        >
          <form
            className="modal small"
            onSubmit={(event) => {
              event.preventDefault();
              if (!name.trim()) return;
              createPlaylist(name);
              setName('');
              setCreating(false);
            }}
          >
            <header className="modal-head">
              <div>
                <h2>New playlist</h2>
                <p>Give it a name you will recognise later.</p>
              </div>
              <button
                type="button"
                className="icon-btn ghost"
                onClick={() => setCreating(false)}
                aria-label="Close"
              >
                <Icon name="close" size={18} />
              </button>
            </header>
            <input
              className="text-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Playlist name"
              maxLength={40}
              autoFocus
              aria-label="Playlist name"
            />
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function AlbumCard({ name, onOpen }: { name: string; onOpen: () => void }) {
  const album = albums.find((item) => item.name === name);
  const collection = useCollection(album?.tracks.map((track) => track.id) ?? []);
  if (!album) return null;
  return (
    <MediaCard
      image={album.cover}
      title={album.name}
      subtitle={`${album.artist} · ${album.tracks.length} tracks`}
      onClick={onOpen}
      onPlay={collection.play}
      isPlaying={collection.isPlaying}
    />
  );
}
