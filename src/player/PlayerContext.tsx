import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getTrack, tracks as allTracks } from '../data/catalog';
import { shuffleArray } from '../lib/format';
import { usePersistentState } from '../lib/storage';
import type { Playlist, RepeatMode, Track } from '../types';

/* One <audio> element per page, shared by every component. */
let sharedAudio: HTMLAudioElement | null = null;
function getAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = 'metadata';
  }
  return sharedAudio;
}

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const SEED_PLAYLISTS: Playlist[] = [
  {
    id: 'late-night',
    name: 'Late Night Drive',
    trackIds: ['neon-drift', 'static-bloom', 'afterglow'],
    createdAt: 1,
  },
  {
    id: 'deep-work',
    name: 'Deep Work',
    trackIds: ['tidal-bloom', 'golden-hour', 'paper-planes'],
    createdAt: 2,
  },
  {
    id: 'sunday-morning',
    name: 'Sunday Morning',
    trackIds: ['paper-planes', 'golden-hour', 'tidal-bloom'],
    createdAt: 3,
  },
];

interface PlayerContextValue {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  isBuffering: boolean;
  progress: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  analyser: AnalyserNode | null;
  favorites: string[];
  recent: Track[];
  playlists: Playlist[];
  nowPlayingOpen: boolean;
  queueOpen: boolean;
  playlistPickerFor: string | null;
  toast: string | null;

  playTrack: (trackId: string, contextIds?: string[]) => void;
  playCollection: (ids: string[], startIndex?: number) => void;
  shuffleCollection: (ids: string[]) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleFavorite: (trackId: string) => void;
  isFavorite: (trackId: string) => boolean;
  addToQueue: (trackId: string, playNext?: boolean) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  jumpToQueueIndex: (index: number) => void;
  createPlaylist: (name: string, trackId?: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, trackId: string) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  setNowPlayingOpen: (open: boolean) => void;
  setQueueOpen: (open: boolean) => void;
  openPlaylistPicker: (trackId: string) => void;
  closePlaylistPicker: () => void;
  notify: (message: string) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [queueIds, setQueueIds] = usePersistentState<string[]>(
    'sonora.queue.v1',
    allTracks.map((track) => track.id),
  );
  const [queueIndex, setQueueIndex] = usePersistentState<number>('sonora.queueIndex.v1', 0);
  const [isPlaying, setPlaying] = useState(false);
  const [isBuffering, setBuffering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = usePersistentState<number>('sonora.volume.v1', 0.78);
  const [muted, setMuted] = usePersistentState<boolean>('sonora.muted.v1', false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [favorites, setFavorites] = usePersistentState<string[]>('sonora.favorites.v1', []);
  const [recentIds, setRecentIds] = usePersistentState<string[]>('sonora.recent.v1', []);
  const [playlists, setPlaylists] = usePersistentState<Playlist[]>(
    'sonora.playlists.v1',
    SEED_PLAYLISTS,
  );
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [playlistPickerFor, setPlaylistPickerFor] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const queueRef = useRef(queueIds);
  const indexRef = useRef(queueIndex);
  const repeatRef = useRef(repeat);
  const playingRef = useRef(isPlaying);
  const currentIdRef = useRef(currentId);
  const autoplayRef = useRef(false);
  const graphRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const baseQueueRef = useRef<{ ids: string[]; index: number } | null>(null);
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    queueRef.current = queueIds;
  }, [queueIds]);
  useEffect(() => {
    indexRef.current = queueIndex;
  }, [queueIndex]);
  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);
  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    currentIdRef.current = currentId;
  }, [currentId]);

  const queue = useMemo(() => queueIds.map((id) => getTrack(id)).filter(Boolean) as Track[], [queueIds]);
  const currentTrack = currentId ? getTrack(currentId) ?? null : null;
  const recent = useMemo(
    () => recentIds.map((id) => getTrack(id)).filter(Boolean) as Track[],
    [recentIds],
  );

  const notify = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const ensureGraph = useCallback(() => {
    const audio = getAudio();
    if (!audio) return;
    if (graphRef.current) {
      if (graphRef.current.state === 'suspended') void graphRef.current.resume();
      return;
    }
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      const context = new Ctor();
      const source = context.createMediaElementSource(audio);
      const node = context.createAnalyser();
      node.fftSize = 256;
      node.smoothingTimeConstant = 0.8;
      source.connect(node);
      node.connect(context.destination);
      graphRef.current = context;
      analyserRef.current = node;
      setAnalyser(node);
      if (context.state === 'suspended') void context.resume();
    } catch {
      // The element already has a source node; audio still plays normally.
    }
  }, []);

  const playAudio = useCallback(() => {
    const audio = getAudio();
    if (!audio) return;
    ensureGraph();
    const result = audio.play();
    if (result) {
      result.then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      setPlaying(true);
    }
  }, [ensureGraph]);

  const pushRecent = useCallback(
    (trackId: string) => {
      setRecentIds((prev) => [trackId, ...prev.filter((id) => id !== trackId)].slice(0, 12));
    },
    [setRecentIds],
  );

  const startQueue = useCallback(
    (ids: string[], index: number) => {
      if (ids.length === 0) return;
      const safeIndex = Math.min(Math.max(index, 0), ids.length - 1);
      autoplayRef.current = true;
      queueRef.current = ids;
      indexRef.current = safeIndex;
      setQueueIds(ids);
      setQueueIndex(safeIndex);
      setCurrentId(ids[safeIndex]);
      pushRecent(ids[safeIndex]);
    },
    [pushRecent, setQueueIds, setQueueIndex],
  );

  const playTrack = useCallback(
    (trackId: string, contextIds?: string[]) => {
      const audio = getAudio();
      if (!audio) return;
      ensureGraph();
      if (contextIds && contextIds.length) {
        startQueue(contextIds, contextIds.indexOf(trackId));
        return;
      }
      const index = queueRef.current.indexOf(trackId);
      if (index >= 0) {
        if (trackId === currentIdRef.current) {
          playAudio();
          return;
        }
        autoplayRef.current = true;
        indexRef.current = index;
        setQueueIndex(index);
        setCurrentId(trackId);
        pushRecent(trackId);
        return;
      }
      const insertAt = Math.max(0, Math.min(indexRef.current + 1, queueRef.current.length));
      const ids = [...queueRef.current];
      ids.splice(insertAt, 0, trackId);
      startQueue(ids, insertAt);
    },
    [ensureGraph, playAudio, pushRecent, setQueueIndex, startQueue],
  );

  const playCollection = useCallback(
    (ids: string[], startIndex = 0) => {
      const valid = ids.filter((id) => Boolean(getTrack(id)));
      if (valid.length === 0) return;
      startQueue(valid, startIndex);
    },
    [startQueue],
  );

  const shuffleCollection = useCallback(
    (ids: string[]) => {
      const valid = ids.filter((id) => Boolean(getTrack(id)));
      if (valid.length === 0) return;
      setShuffle(true);
      startQueue(shuffleArray(valid), 0);
    },
    [startQueue],
  );

  const togglePlay = useCallback(() => {
    const audio = getAudio();
    if (!audio) return;
    if (!currentIdRef.current) {
      const ids = queueRef.current.length ? queueRef.current : allTracks.map((track) => track.id);
      startQueue(ids, Math.min(indexRef.current, ids.length - 1));
      return;
    }
    if (audio.paused) {
      playAudio();
    } else {
      audio.pause();
      setPlaying(false);
    }
  }, [playAudio, startQueue]);

  const next = useCallback(() => {
    const ids = queueRef.current;
    if (ids.length === 0) return;
    const index = indexRef.current;
    let target = index + 1;
    if (target >= ids.length) {
      if (repeatRef.current === 'all') target = 0;
      else return;
    }
    autoplayRef.current = playingRef.current;
    indexRef.current = target;
    setQueueIndex(target);
    setCurrentId(ids[target]);
  }, [setQueueIndex]);

  const previous = useCallback(() => {
    const audio = getAudio();
    const ids = queueRef.current;
    if (!audio || ids.length === 0) return;
    if (audio.currentTime > 3.5) {
      audio.currentTime = 0;
      setProgress(0);
      return;
    }
    const index = indexRef.current;
    let target = index - 1;
    if (target < 0) {
      if (repeatRef.current === 'all') target = ids.length - 1;
      else {
        audio.currentTime = 0;
        setProgress(0);
        return;
      }
    }
    autoplayRef.current = playingRef.current;
    indexRef.current = target;
    setQueueIndex(target);
    setCurrentId(ids[target]);
  }, [setQueueIndex]);

  const seek = useCallback((seconds: number) => {
    const audio = getAudio();
    if (!audio) return;
    const max = Number.isFinite(audio.duration) ? audio.duration : 0;
    const value = Math.min(Math.max(seconds, 0), max);
    audio.currentTime = value;
    setProgress(value);
  }, []);

  const setVolume = useCallback(
    (value: number) => {
      const clamped = Math.min(1, Math.max(0, value));
      setVolumeState(clamped);
      if (clamped > 0) setMuted(false);
    },
    [setMuted, setVolumeState],
  );

  const toggleMute = useCallback(() => setMuted((value) => !value), [setMuted]);

  const toggleShuffle = useCallback(() => {
    const nextValue = !shuffle;
    setShuffle(nextValue);
    if (nextValue) {
      baseQueueRef.current = { ids: queueRef.current, index: indexRef.current };
      const current = currentIdRef.current;
      const rest = queueRef.current.filter((id) => id !== current);
      const ids = current ? [current, ...shuffleArray(rest)] : shuffleArray(rest);
      queueRef.current = ids;
      indexRef.current = 0;
      setQueueIds(ids);
      setQueueIndex(0);
    } else if (baseQueueRef.current) {
      const { ids, index } = baseQueueRef.current;
      const current = currentIdRef.current;
      const found = current ? ids.indexOf(current) : -1;
      const restoredIndex = found >= 0 ? found : index;
      queueRef.current = ids;
      indexRef.current = restoredIndex;
      setQueueIds(ids);
      setQueueIndex(restoredIndex);
      baseQueueRef.current = null;
    }
  }, [shuffle, setQueueIds, setQueueIndex]);

  const cycleRepeat = useCallback(() => {
    setRepeat((mode) => (mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off'));
  }, []);

  const toggleFavorite = useCallback(
    (trackId: string) => {
      const track = getTrack(trackId);
      setFavorites((prev) => {
        const exists = prev.includes(trackId);
        notify(exists ? 'Removed from your favorites' : `Saved “${track?.title ?? 'Track'}”`);
        return exists ? prev.filter((id) => id !== trackId) : [trackId, ...prev];
      });
    },
    [notify, setFavorites],
  );

  const isFavorite = useCallback((trackId: string) => favorites.includes(trackId), [favorites]);

  const addToQueue = useCallback(
    (trackId: string, playNext = false) => {
      const track = getTrack(trackId);
      if (!track) return;
      if (queueRef.current.length === 0) {
        startQueue([trackId], 0);
        notify(`Playing “${track.title}”`);
        return;
      }
      const ids = [...queueRef.current];
      if (playNext) {
        const at = indexRef.current + 1;
        ids.splice(at, 0, trackId);
        queueRef.current = ids;
        setQueueIds(ids);
        notify(`Playing “${track.title}” next`);
      } else {
        ids.push(trackId);
        queueRef.current = ids;
        setQueueIds(ids);
        notify(`Added “${track.title}” to the queue`);
      }
    },
    [notify, setQueueIds, startQueue],
  );

  const removeFromQueue = useCallback(
    (index: number) => {
      if (index <= indexRef.current || index >= queueRef.current.length) return;
      const ids = queueRef.current.filter((_, i) => i !== index);
      queueRef.current = ids;
      setQueueIds(ids);
    },
    [setQueueIds],
  );

  const clearQueue = useCallback(() => {
    const current = currentIdRef.current;
    const ids = current ? [current] : [];
    queueRef.current = ids;
    indexRef.current = 0;
    setQueueIds(ids);
    setQueueIndex(0);
    notify('Queue cleared');
  }, [notify, setQueueIds, setQueueIndex]);

  const jumpToQueueIndex = useCallback(
    (index: number) => {
      const ids = queueRef.current;
      if (index < 0 || index >= ids.length) return;
      autoplayRef.current = true;
      indexRef.current = index;
      setQueueIndex(index);
      setCurrentId(ids[index]);
      pushRecent(ids[index]);
    },
    [pushRecent, setQueueIndex],
  );

  const createPlaylist = useCallback(
    (name: string, trackId?: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const playlist: Playlist = {
        id: makeId(),
        name: trimmed,
        trackIds: trackId ? [trackId] : [],
        createdAt: Date.now(),
      };
      setPlaylists((prev) => [...prev, playlist]);
      notify(`Playlist “${trimmed}” created`);
    },
    [notify, setPlaylists],
  );

  const renamePlaylist = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setPlaylists((prev) => prev.map((list) => (list.id === id ? { ...list, name: trimmed } : list)));
    },
    [setPlaylists],
  );

  const deletePlaylist = useCallback(
    (id: string) => {
      setPlaylists((prev) => prev.filter((list) => list.id !== id));
      notify('Playlist deleted');
    },
    [notify, setPlaylists],
  );

  const addTrackToPlaylist = useCallback(
    (playlistId: string, trackId: string) => {
      const playlist = playlists.find((list) => list.id === playlistId);
      const track = getTrack(trackId);
      if (!playlist || !track) return;
      if (playlist.trackIds.includes(trackId)) {
        notify(`Already in “${playlist.name}”`);
        return;
      }
      setPlaylists((prev) =>
        prev.map((list) =>
          list.id === playlistId ? { ...list, trackIds: [...list.trackIds, trackId] } : list,
        ),
      );
      notify(`Added “${track.title}” to “${playlist.name}”`);
    },
    [notify, playlists, setPlaylists],
  );

  const removeTrackFromPlaylist = useCallback(
    (playlistId: string, trackId: string) => {
      setPlaylists((prev) =>
        prev.map((list) =>
          list.id === playlistId
            ? { ...list, trackIds: list.trackIds.filter((id) => id !== trackId) }
            : list,
        ),
      );
      notify('Removed from playlist');
    },
    [notify, setPlaylists],
  );

  const openPlaylistPicker = useCallback((trackId: string) => setPlaylistPickerFor(trackId), []);
  const closePlaylistPicker = useCallback(() => setPlaylistPickerFor(null), []);

  /* ------------------------------ audio wiring ----------------------------- */

  useEffect(() => {
    const audio = getAudio();
    if (!audio || !currentTrack) return;

    const absolute = new URL(currentTrack.audio, window.location.href).href;
    const shouldPlay = autoplayRef.current || playingRef.current;
    autoplayRef.current = false;

    if (audio.src !== absolute) {
      audio.src = currentTrack.audio;
      audio.load();
      setProgress(0);
      setDuration(currentTrack.duration);
      setBuffering(shouldPlay);
    }

    if (shouldPlay) {
      playAudio();
    } else {
      setPlaying(false);
    }
    // Only react to a different track, not to volume/state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  useEffect(() => {
    const audio = getAudio();
    if (!audio) return;

    const onTime = () => setProgress(audio.currentTime);
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setBuffering(true);
    const onReady = () => setBuffering(false);
    const onEnded = () => {
      const ids = queueRef.current;
      const index = indexRef.current;
      if (repeatRef.current === 'one') {
        audio.currentTime = 0;
        void audio.play();
        return;
      }
      if (index + 1 < ids.length) {
        autoplayRef.current = true;
        indexRef.current = index + 1;
        setQueueIndex(index + 1);
        setCurrentId(ids[index + 1]);
        return;
      }
      if (repeatRef.current === 'all' && ids.length > 0) {
        autoplayRef.current = true;
        indexRef.current = 0;
        setQueueIndex(0);
        setCurrentId(ids[0]);
        return;
      }
      setPlaying(false);
      setProgress(0);
      audio.currentTime = 0;
    };
    const onError = () => {
      setBuffering(false);
      setPlaying(false);
      notify('Something went wrong playing that track');
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onReady);
    audio.addEventListener('canplay', onReady);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('durationchange', onMeta);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onReady);
      audio.removeEventListener('canplay', onReady);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [notify, setQueueIndex]);

  useEffect(() => {
    const audio = getAudio();
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [muted, volume]);

  /* Warm the browser cache with the next track in the queue. */
  useEffect(() => {
    if (!currentTrack) return;
    const ids = queueRef.current;
    const nextId = ids[indexRef.current + 1] ?? (repeat === 'all' ? ids[0] : undefined);
    const nextTrack = nextId ? getTrack(nextId) : undefined;
    if (!nextTrack) return;
    if (!preloadRef.current) {
      preloadRef.current = new Audio();
      preloadRef.current.preload = 'auto';
    }
    if (preloadRef.current.src !== new URL(nextTrack.audio, window.location.href).href) {
      preloadRef.current.src = nextTrack.audio;
    }
  }, [currentTrack, queueIds, queueIndex, repeat]);

  /* Keep the OS media panel in sync. */
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (!currentTrack) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
      artwork: [{ src: currentTrack.cover, sizes: '1024x1024', type: 'image/jpeg' }],
    });
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => togglePlay()],
      ['pause', () => togglePlay()],
      ['nexttrack', () => next()],
      ['previoustrack', () => previous()],
      [
        'seekto',
        (details) => {
          if (typeof details.seekTime === 'number') seek(details.seekTime);
        },
      ],
    ];
    for (const [action, handler] of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Action not supported by this browser.
      }
    }
  }, [currentTrack, isPlaying, next, previous, seek, togglePlay]);

  const value: PlayerContextValue = {
    currentTrack,
    queue,
    queueIndex,
    isPlaying,
    isBuffering,
    progress,
    duration: duration || currentTrack?.duration || 0,
    volume,
    muted,
    shuffle,
    repeat,
    analyser,
    favorites,
    recent,
    playlists,
    nowPlayingOpen,
    queueOpen,
    playlistPickerFor,
    toast,
    playTrack,
    playCollection,
    shuffleCollection,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    toggleFavorite,
    isFavorite,
    addToQueue,
    removeFromQueue,
    clearQueue,
    jumpToQueueIndex,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    setNowPlayingOpen,
    setQueueOpen,
    openPlaylistPicker,
    closePlaylistPicker,
    notify,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used inside PlayerProvider');
  return context;
}
