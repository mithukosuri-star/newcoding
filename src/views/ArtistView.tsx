import { getArtist } from '../data/catalog';
import { formatTotal, plural } from '../lib/format';
import { useCollection } from '../hooks/useCollection';
import { useNav } from '../nav/NavContext';
import Cover from '../components/Cover';
import EmptyState from '../components/EmptyState';
import MediaCard from '../components/MediaCard';
import SectionHeader from '../components/SectionHeader';
import TrackRow from '../components/TrackRow';
import { Icon } from '../components/Icons';

export default function ArtistView({ name }: { name: string }) {
  const artist = getArtist(name);
  const { navigate } = useNav();
  const ids = artist?.tracks.map((track) => track.id) ?? [];
  const collection = useCollection(ids);
  const duration = artist?.tracks.reduce((sum, track) => sum + track.duration, 0) ?? 0;

  if (!artist) {
    return (
      <div className="view">
        <EmptyState
          icon="music"
          title="Artist not found"
          description="That artist is not in your catalogue."
          actionLabel="Back to home"
          onAction={() => navigate({ kind: 'home' })}
        />
      </div>
    );
  }

  return (
    <div className="view collection-view">
      <header className="artist-hero">
        <div className="artist-hero-art">
          <Cover src={artist.cover} alt={artist.name} accent={artist.accent} rounded={999} eager />
        </div>
        <div className="collection-body">
          <span className="eyebrow">Artist</span>
          <h2>{artist.name}</h2>
          <p className="collection-meta">
            {plural(artist.albums.length, 'album')} · {plural(artist.tracks.length, 'track')} ·{' '}
            {formatTotal(duration)}
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

      <section className="block">
        <SectionHeader title="Discography" />
        <div className="card-grid">
          {artist.albums.map((album) => (
            <MediaCard
              key={album.name}
              image={album.cover}
              title={album.name}
              subtitle={`${album.tracks.length} tracks`}
              onClick={() => navigate({ kind: 'album', name: album.name })}
              onPlay={() => navigate({ kind: 'album', name: album.name })}
            />
          ))}
        </div>
      </section>

      <section className="block">
        <SectionHeader title="Tracks" />
        <div className="track-list">
          {artist.tracks.map((track, index) => (
            <TrackRow
              key={track.id}
              track={track}
              index={index}
              contextIds={ids}
              showCover={false}
              showAlbum
            />
          ))}
        </div>
      </section>
    </div>
  );
}
