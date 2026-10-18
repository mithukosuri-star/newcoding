import rawTracks from './tracks.generated.json';
import type { Album, Artist, MoodMix, Track } from '../types';

export const tracks = rawTracks as Track[];

export const trackById = new Map(tracks.map((track) => [track.id, track]));

export function getTrack(id: string): Track | undefined {
  return trackById.get(id);
}

export function tracksFromIds(ids: string[]): Track[] {
  return ids.map((id) => trackById.get(id)).filter((track): track is Track => Boolean(track));
}

export function totalDuration(items: Track[]): number {
  return items.reduce((sum, track) => sum + track.duration, 0);
}

export const albums: Album[] = (() => {
  const byName = new Map<string, Track[]>();
  for (const track of tracks) {
    const list = byName.get(track.album) ?? [];
    list.push(track);
    byName.set(track.album, list);
  }
  const order = [...byName.keys()];
  return order.map((name) => {
    const list = byName.get(name) ?? [];
    return {
      name,
      artist: list[0]?.artist ?? 'Unknown',
      cover: list[0]?.cover ?? '',
      accent: list[0]?.accent ?? '#8b5cf6',
      tracks: list,
      duration: totalDuration(list),
    };
  });
})();

export function getAlbum(name: string): Album | undefined {
  return albums.find((album) => album.name.toLowerCase() === name.toLowerCase());
}

export const artists: Artist[] = (() => {
  const byName = new Map<string, Track[]>();
  for (const track of tracks) {
    const list = byName.get(track.artist) ?? [];
    list.push(track);
    byName.set(track.artist, list);
  }
  return [...byName.entries()].map(([name, list]) => ({
    name,
    tracks: list,
    albums: albums.filter((album) => album.artist.toLowerCase() === name.toLowerCase()),
    cover: list[0]?.cover ?? '',
    accent: list[0]?.accent ?? '#8b5cf6',
  }));
})();

export function getArtist(name: string): Artist | undefined {
  return artists.find((artist) => artist.name.toLowerCase() === name.toLowerCase());
}

/** Mood mixes are generated from the tags baked into the catalogue. */
export const moodMixes: MoodMix[] = [
  {
    id: 'night-drive',
    name: 'Night Drive',
    tagline: 'Neon synths and a road with no end',
    from: '#7c3aed',
    to: '#db2777',
    icon: 'moon',
    trackIds: tracks
      .filter((track) => track.moods.includes('night drive') || track.moods.includes('energy'))
      .map((track) => track.id),
  },
  {
    id: 'deep-focus',
    name: 'Deep Focus',
    tagline: 'Low-key textures for long stretches of work',
    from: '#0f766e',
    to: '#22d3ee',
    icon: 'headphones',
    trackIds: tracks.filter((track) => track.moods.includes('focus')).map((track) => track.id),
  },
  {
    id: 'slow-light',
    name: 'Slow Light',
    tagline: 'Warm lo-fi for unhurried afternoons',
    from: '#b45309',
    to: '#fbbf24',
    icon: 'sun',
    trackIds: tracks.filter((track) => track.moods.includes('chill')).map((track) => track.id),
  },
  {
    id: 'after-hours',
    name: 'After Hours',
    tagline: 'Downtempo and ambient for the small hours',
    from: '#1e3a8a',
    to: '#6366f1',
    icon: 'wave',
    trackIds: tracks
      .filter(
        (track) =>
          track.moods.includes('late night') || track.moods.includes('wind down'),
      )
      .map((track) => track.id),
  },
];

export function getMoodMix(id: string): MoodMix | undefined {
  return moodMixes.find((mix) => mix.id === id);
}

export const genres = [...new Set(tracks.map((track) => track.genre))];

export const featuredTrack = tracks[0];
