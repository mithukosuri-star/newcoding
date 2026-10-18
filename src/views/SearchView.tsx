import { albums, artists, genres, moodMixes, tracks } from '../data/catalog';
import { useCollection } from '../hooks/useCollection';
import { useNav } from '../nav/NavContext';
import { usePlayer } from '../player/PlayerContext';
import Cover from '../components/Cover';
import EmptyState from '../components/EmptyState';
import MediaCard from '../components/MediaCard';
import SectionHeader from '../components/SectionHeader';
import TrackRow from '../components/TrackRow';
import { Icon } from '../components/Icons';
import type { Album, MoodMix } from '../types';

interface SearchViewProps {
  query: string;
  onQueryChange: (value: string) => void;
}

const GENRE_COLORS: Record<string, [string, string]> = {
  Synthwave: ['#5b21b6', '#db2777'],
  'Lo-fi': ['#b45309', '#fbbf24'],
  Ambient: ['#0f766e', '#22d3ee'],
  Downtempo: ['#1e3a8a', '#e11d48'],
};

function GenreCard({ name, onClick }: { name: string; onClick: () => void }) {
  const colors = GENRE_COLORS[name] ?? ['#334155', '#6366f1'];
  return (
    <button
      type="button"
      className="genre-card"
      style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
      onClick={onClick}
    >
      <span>{name}</span>
      <Icon name="wave" size={26} />
    </button>
  );
}

function AlbumResult({ album, onOpen }: { album: Album; onOpen: () => void }) {
  const collection = useCollection(album.tracks.map((track) => track.id));
  return (
    <MediaCard
      image={album.cover}
      title={album.name}
      subtitle={album.artist}
      onClick={onOpen}
      onPlay={collection.play}
      isPlaying={collection.isPlaying}
    />
  );
}

function MixResult({ mix, onOpen }: { mix: MoodMix; onOpen: () => void }) {
  const collection = useCollection(mix.trackIds);
  return (
    <MediaCard
      gradient={[mix.from, mix.to]}
      icon={mix.icon}
      title={mix.name}
      subtitle={mix.tagline}
      onClick={onOpen}
      onPlay={collection.play}
      isPlaying={collection.isPlaying}
    />
  );
}

export default function SearchView({ query, onQueryChange }: SearchViewProps) {
  const { navigate } = useNav();
  const { playlists } = usePlayer();
  const q = query.trim().toLowerCase();

  const matchedTracks = q
    ? tracks.filter(
        (track) =>
          track.title.toLowerCase().includes(q) ||
          track.artist.toLowerCase().includes(q) ||
          track.album.toLowerCase().includes(q) ||
          track.genre.toLowerCase().includes(q) ||
          track.moods.some((mood) => mood.includes(q)),
      )
    : [];
  const matchedAlbums = q
    ? albums.filter(
        (album) => album.name.toLowerCase().includes(q) || album.artist.toLowerCase().includes(q),
      )
    : [];
  const matchedArtists = q ? artists.filter((artist) => artist.name.toLowerCase().includes(q)) : [];
  const matchedPlaylists = q
    ? playlists.filter((playlist) => playlist.name.toLowerCase().includes(q))
    : [];
  const matchedMixes = q
    ? moodMixes.filter(
        (mix) => mix.name.toLowerCase().includes(q) || mix.tagline.toLowerCase().includes(q),
      )
    : [];

  const totalResults =
    matchedTracks.length +
    matchedAlbums.length +
    matchedArtists.length +
    matchedPlaylists.length +
    matchedMixes.length;
  const topTrack = matchedTracks[0];
  const contextIds = matchedTracks.map((track) => track.id);
  const topCollection = useCollection(contextIds);

  if (!q) {
    return (
      <div className="view search-view">
        <div className="search-browse">
          <h2>Browse the catalogue</h2>
          <p>Every track here was composed, performed, and synthesized in-house.</p>
          <div className="genre-grid">
            {genres.map((genre) => (
              <GenreCard key={genre} name={genre} onClick={() => onQueryChange(genre)} />
            ))}
          </div>
        </div>

        <section className="block">
          <SectionHeader title="Browse by mood" subtitle="Pick a lane and press play" />
          <div className="card-grid">
            {moodMixes.map((mix) => (
              <MixResult
                key={mix.id}
                mix={mix}
                onOpen={() => navigate({ kind: 'mix', id: mix.id })}
              />
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="view search-view">
      <div className="search-summary">
        <h2>
          Results for <span>“{query.trim()}”</span>
        </h2>
        <p>{totalResults === 0 ? 'Nothing matched' : `${totalResults} results`}</p>
      </div>

      {totalResults === 0 ? (
        <EmptyState
          icon="search"
          title="No matches found"
          description="Try a different title, artist, genre, or mood — or browse the categories instead."
          actionLabel="Clear search"
          onAction={() => onQueryChange('')}
        />
      ) : (
        <>
          {topTrack && (
            <div className="search-top">
              <div className="top-result">
                <span className="eyebrow">Top result</span>
                <div className="top-result-body">
                  <Cover
                    src={topTrack.cover}
                    alt={`${topTrack.title} cover`}
                    accent={topTrack.accent}
                    rounded={14}
                  />
                  <div>
                    <h3>{topTrack.title}</h3>
                    <p>{topTrack.artist}</p>
                  </div>
                  <button
                    type="button"
                    className="top-result-play"
                    onClick={topCollection.play}
                    aria-label={topCollection.isPlaying ? 'Pause top result' : 'Play top result'}
                  >
                    <Icon name={topCollection.isPlaying ? 'pause' : 'play'} size={22} />
                  </button>
                </div>
              </div>

              <div className="search-tracks">
                <h3>Tracks</h3>
                <div className="track-list compact">
                  {matchedTracks.slice(0, 5).map((track, index) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={index}
                      contextIds={contextIds}
                      showCover
                      showAlbum={false}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {matchedAlbums.length > 0 && (
            <section className="block">
              <SectionHeader title="Albums" />
              <div className="card-grid">
                {matchedAlbums.map((album) => (
                  <AlbumResult
                    key={album.name}
                    album={album}
                    onOpen={() => navigate({ kind: 'album', name: album.name })}
                  />
                ))}
              </div>
            </section>
          )}

          {matchedArtists.length > 0 && (
            <section className="block">
              <SectionHeader title="Artists" />
              <div className="artist-row">
                {matchedArtists.map((artist) => (
                  <button
                    key={artist.name}
                    type="button"
                    className="artist-card"
                    onClick={() => navigate({ kind: 'artist', name: artist.name })}
                  >
                    <span className="artist-card-art">
                      <Cover
                        src={artist.cover}
                        alt={artist.name}
                        accent={artist.accent}
                        rounded={999}
                      />
                    </span>
                    <span className="artist-card-name">{artist.name}</span>
                    <span className="artist-card-sub">Artist</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {matchedPlaylists.length > 0 && (
            <section className="block">
              <SectionHeader title="Playlists" />
              <div className="card-grid">
                {matchedPlaylists.map((playlist) => (
                  <MediaCard
                    key={playlist.id}
                    gradient={['#273549', '#111827']}
                    icon="list"
                    title={playlist.name}
                    subtitle={`${playlist.trackIds.length} tracks`}
                    onClick={() => navigate({ kind: 'playlist', id: playlist.id })}
                  />
                ))}
              </div>
            </section>
          )}

          {matchedMixes.length > 0 && (
            <section className="block">
              <SectionHeader title="Mixes" />
              <div className="card-grid">
                {matchedMixes.map((mix) => (
                  <MixResult
                    key={mix.id}
                    mix={mix}
                    onOpen={() => navigate({ kind: 'mix', id: mix.id })}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
