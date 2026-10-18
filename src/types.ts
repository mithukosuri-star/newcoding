export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  moods: string[];
  bpm: number;
  key: string;
  cover: string;
  accent: string;
  audio: string;
  duration: number;
  bytes: number;
}

export interface Album {
  name: string;
  artist: string;
  cover: string;
  accent: string;
  tracks: Track[];
  duration: number;
}

export interface Artist {
  name: string;
  tracks: Track[];
  albums: Album[];
  cover: string;
  accent: string;
}

export interface MoodMix {
  id: string;
  name: string;
  tagline: string;
  trackIds: string[];
  from: string;
  to: string;
  icon: 'moon' | 'headphones' | 'sun' | 'wave';
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
}

export type RepeatMode = 'off' | 'all' | 'one';

export type View =
  | { kind: 'home' }
  | { kind: 'search' }
  | { kind: 'library' }
  | { kind: 'favorites' }
  | { kind: 'playlist'; id: string }
  | { kind: 'album'; name: string }
  | { kind: 'artist'; name: string }
  | { kind: 'mix'; id: string };
