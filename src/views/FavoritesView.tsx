import { tracksFromIds } from '../data/catalog';
import { formatTotal, plural } from '../lib/format';
import { useCollection } from '../hooks/useCollection';
import { useNav } from '../nav/NavContext';
import { usePlayer } from '../player/PlayerContext';
import EmptyState from '../components/EmptyState';
import TrackRow from '../components/TrackRow';
import { Icon } from '../components/Icons';

export default function FavoritesView() {
  const { favorites } = usePlayer();
  const { navigate } = useNav();
  const list = tracksFromIds(favorites);
  const ids = list.map((track) => track.id);
  const collection = useCollection(ids);
  const duration = list.reduce((sum, track) => sum + track.duration, 0);

  return (
    <div className="view collection-view">
      <header className="collection-hero favorites-hero">
        <div className="fav-art" aria-hidden="true">
          <Icon name="heartFilled" size={64} />
        </div>
        <div className="collection-body">
          <span className="eyebrow">Collection</span>
          <h2>Favorites</h2>
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
          </div>
        </div>
      </header>

      {list.length === 0 ? (
        <EmptyState
          icon="heart"
          title="Nothing saved yet"
          description="Tap the heart on any track to keep it here. Your favorites live on this device."
          actionLabel="Discover music"
          onAction={() => navigate({ kind: 'home' })}
        />
      ) : (
        <div className="track-list">
          {list.map((track, index) => (
            <TrackRow key={track.id} track={track} index={index} contextIds={ids} />
          ))}
        </div>
      )}
    </div>
  );
}
