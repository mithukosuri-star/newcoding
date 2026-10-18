import {
  albums,
  artists,
  featuredTrack,
  getAlbum,
  moodMixes,
  tracks,
} from '../data/catalog';
import { formatTotal, greeting, todayLabel } from '../lib/format';
import { useCollection } from '../hooks/useCollection';
import { useNav } from '../nav/NavContext';
import { usePlayer } from '../player/PlayerContext';
import Cover from '../components/Cover';
import MediaCard from '../components/MediaCard';
import SectionHeader from '../components/SectionHeader';
import TrackRow from '../components/TrackRow';
import { Icon } from '../components/Icons';
import type { Album, MoodMix, Track } from '../types';

function MixTile({ mix, onOpen }: { mix: MoodMix; onOpen: () => void }) {
  const collection = useCollection(mix.trackIds);
  return (
    <MediaCard
      gradient={[mix.from, mix.to]}
      icon={mix.icon}
      title={mix.name}
      subtitle={`${mix.trackIds.length} tracks · ${mix.tagline}`}
      onClick={onOpen}
      onPlay={collection.play}
      isPlaying={collection.isPlaying}
    />
  );
}

function AlbumTile({ album, onOpen }: { album: Album; onOpen: () => void }) {
  const collection = useCollection(album.tracks.map((track) => track.id));
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

function RecentTile({ track, contextIds }: { track: Track; contextIds: string[] }) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const active = currentTrack?.id === track.id;
  return (
    <MediaCard
      image={track.cover}
      title={track.title}
      subtitle={track.artist}
      onClick={() => playTrack(track.id, contextIds)}
      onPlay={() => (active ? togglePlay() : playTrack(track.id, contextIds))}
      isPlaying={active && isPlaying}
    />
  );
}

export default function HomeView() {
  const { navigate } = useNav();
  const { recent, isFavorite, toggleFavorite } = usePlayer();
  const heroAlbum = getAlbum(featuredTrack.album) ?? albums[0];
  const heroIds = heroAlbum.tracks.map((track) => track.id);
  const hero = useCollection(heroIds);
  const allIds = tracks.map((track) => track.id);
  const heroLiked = isFavorite(featuredTrack.id);
  const recentIds = recent.map((track) => track.id);

  return (
    <div className="view home-view">
      <div className="greeting">
        <h2>{greeting()}</h2>
        <p>{todayLabel()}</p>
      </div>

      <section
        className="feature"
        style={{ '--hero-accent': heroAlbum.accent } as React.CSSProperties}
        aria-labelledby="feature-title"
      >
        <div className="feature-backdrop" style={{ backgroundImage: `url(${heroAlbum.cover})` }} />
        <div className="feature-art">
          <Cover src={heroAlbum.cover} alt={`${heroAlbum.name} cover`} accent={heroAlbum.accent} eager />
        </div>
        <div className="feature-body">
          <span className="eyebrow">Featured album</span>
          <h2 id="feature-title">{heroAlbum.name}</h2>
          <button
            type="button"
            className="feature-artist"
            onClick={() => navigate({ kind: 'artist', name: heroAlbum.artist })}
          >
            {heroAlbum.artist}
          </button>
          <p>
            {heroAlbum.tracks.length} tracks · {formatTotal(heroAlbum.duration)} · {featuredTrack.genre}
          </p>
          <div className="feature-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={hero.play}
              aria-label={hero.isPlaying ? 'Pause featured album' : 'Play featured album'}
            >
              <Icon name={hero.isPlaying ? 'pause' : 'play'} size={17} />
              {hero.isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              className="btn btn-ghost-dark"
              onClick={() => navigate({ kind: 'album', name: heroAlbum.name })}
            >
              View album
            </button>
            <button
              type="button"
              className={`round-btn ${heroLiked ? 'liked' : ''}`}
              onClick={() => toggleFavorite(featuredTrack.id)}
              aria-label={heroLiked ? 'Remove from favorites' : 'Save album highlight'}
              title={heroLiked ? 'Saved' : 'Save'}
            >
              <Icon name={heroLiked ? 'heartFilled' : 'heart'} size={18} />
            </button>
          </div>
        </div>
        <div className="feature-bars" aria-hidden="true">
          {[0.5, 0.85, 0.35, 0.7, 0.95, 0.4, 0.62, 0.3, 0.75, 0.55, 0.9, 0.45].map(
            (value, index) => (
              <span key={index} style={{ height: `${value * 100}%` }} />
            ),
          )}
        </div>
      </section>

      <section className="block">
        <SectionHeader title="Made for you" subtitle="Mixes built from the moods in your catalogue" />
        <div className="card-grid">
          {moodMixes.map((mix) => (
            <MixTile key={mix.id} mix={mix} onOpen={() => navigate({ kind: 'mix', id: mix.id })} />
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="block">
          <SectionHeader
            title="Recently played"
            action={
              <button
                type="button"
                className="text-btn"
                onClick={() => navigate({ kind: 'favorites' })}
              >
                Favorites
                <Icon name="chevronRight" size={14} />
              </button>
            }
          />
          <div className="card-row">
            {recent.slice(0, 8).map((track) => (
              <RecentTile key={track.id} track={track} contextIds={recentIds} />
            ))}
          </div>
        </section>
      )}

      <section className="block">
        <SectionHeader
          title="Albums"
          action={
            <button type="button" className="text-btn" onClick={() => navigate({ kind: 'library' })}>
              See all
              <Icon name="chevronRight" size={14} />
            </button>
          }
        />
        <div className="card-grid">
          {albums.map((album) => (
            <AlbumTile
              key={album.name}
              album={album}
              onOpen={() => navigate({ kind: 'album', name: album.name })}
            />
          ))}
        </div>
      </section>

      <section className="block">
        <SectionHeader
          title="Artists"
          action={
            <button type="button" className="text-btn" onClick={() => navigate({ kind: 'library' })}>
              See all
              <Icon name="chevronRight" size={14} />
            </button>
          }
        />
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

      <section className="block">
        <SectionHeader
          title="All tracks"
          subtitle={`${tracks.length} originals, synthesized from scratch`}
          action={
            <button type="button" className="text-btn" onClick={() => navigate({ kind: 'library' })}>
              Open library
              <Icon name="chevronRight" size={14} />
            </button>
          }
        />
        <div className="track-list">
          {tracks.map((track, index) => (
            <TrackRow
              key={track.id}
              track={track}
              index={index}
              contextIds={allIds}
              showCover
              showAlbum
            />
          ))}
        </div>
      </section>
    </div>
  );
}
