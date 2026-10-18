import { getAlbum } from '../data/catalog';
import { formatTotal, plural } from '../lib/format';
import { useCollection } from '../hooks/useCollection';
import { useNav } from '../nav/NavContext';
import Cover from '../components/Cover';
import EmptyState from '../components/EmptyState';
import TrackRow from '../components/TrackRow';
import { Icon } from '../components/Icons';

export default function AlbumView({ name }: { name: string }) {
  const album = getAlbum(name);
  const { navigate } = useNav();
  const ids = album?.tracks.map((track) => track.id) ?? [];
  const collection = useCollection(ids);

  if (!album) {
    return (
      <div className="view">
        <EmptyState
          icon="disc"
          title="Album not found"
          description="That album is not in your catalogue."
          actionLabel="Back to home"
          onAction={() => navigate({ kind: 'home' })}
        />
      </div>
    );
  }

  return (
    <div className="view collection-view">
      <header className="collection-hero album-hero">
        <div className="collection-art square">
          <Cover src={album.cover} alt={`${album.name} cover`} accent={album.accent} eager rounded={18} />
        </div>
        <div className="collection-body">
          <span className="eyebrow">Album</span>
          <h2>{album.name}</h2>
          <button
            type="button"
            className="collection-artist"
            onClick={() => navigate({ kind: 'artist', name: album.artist })}
          >
            {album.artist}
          </button>
          <p className="collection-meta">
            {plural(album.tracks.length, 'track')} · {formatTotal(album.duration)} ·{' '}
            {album.tracks[0]?.genre}
          </p>
          <div className="collection-actions">
            <button type="button" className="btn btn-primary" onClick={collection.play}>
              <Icon name={collection.isPlaying ? 'pause' : 'play'} size={17} />
              {collection.isPlaying ? 'Pause' : 'Play'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={collection.shuffle}>
              <Icon name="shuffle" size={16} />
              Shuffle
            </button>
          </div>
        </div>
      </header>

      <div className="track-list album-tracks">
        {album.tracks.map((track, index) => (
          <TrackRow
            key={track.id}
            track={track}
            index={index}
            contextIds={ids}
            showCover={false}
            showAlbum={false}
          />
        ))}
      </div>

      <footer className="album-foot">
        <span>
          Every sound on this record was rendered from scratch by Sonora&apos;s synthesis engine.
        </span>
      </footer>
    </div>
  );
}
