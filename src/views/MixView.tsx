import { getMoodMix, tracksFromIds } from '../data/catalog';
import { formatTotal, plural } from '../lib/format';
import { useCollection } from '../hooks/useCollection';
import { useNav } from '../nav/NavContext';
import EmptyState from '../components/EmptyState';
import TrackRow from '../components/TrackRow';
import { Icon } from '../components/Icons';

export default function MixView({ id }: { id: string }) {
  const mix = getMoodMix(id);
  const { navigate } = useNav();
  const list = tracksFromIds(mix?.trackIds ?? []);
  const ids = list.map((track) => track.id);
  const collection = useCollection(ids);
  const duration = list.reduce((sum, track) => sum + track.duration, 0);

  if (!mix) {
    return (
      <div className="view">
        <EmptyState
          icon="sparkle"
          title="Mix not found"
          description="That mix is no longer available."
          actionLabel="Back to home"
          onAction={() => navigate({ kind: 'home' })}
        />
      </div>
    );
  }

  return (
    <div className="view collection-view">
      <header
        className="collection-hero mix-hero"
        style={{ '--mix-from': mix.from, '--mix-to': mix.to } as React.CSSProperties}
      >
        <div className="mix-art" aria-hidden="true">
          <Icon name={mix.icon} size={56} />
        </div>
        <div className="collection-body">
          <span className="eyebrow">Mix</span>
          <h2>{mix.name}</h2>
          <p className="collection-tagline">{mix.tagline}</p>
          <p className="collection-meta">
            {plural(list.length, 'track')} · {formatTotal(duration)}
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

      <div className="track-list">
        {list.map((track, index) => (
          <TrackRow key={track.id} track={track} index={index} contextIds={ids} />
        ))}
      </div>
    </div>
  );
}
