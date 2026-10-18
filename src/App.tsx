import { useEffect, useState } from 'react';
import { getArtist, getMoodMix } from './data/catalog';
import { NavProvider, useNav } from './nav/NavContext';
import { PlayerProvider, usePlayer } from './player/PlayerContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import PlayerBar from './components/PlayerBar';
import NowPlaying from './components/NowPlaying';
import QueuePanel from './components/QueuePanel';
import PlaylistPicker from './components/PlaylistPicker';
import Toast from './components/Toast';
import HomeView from './views/HomeView';
import SearchView from './views/SearchView';
import LibraryView from './views/LibraryView';
import FavoritesView from './views/FavoritesView';
import PlaylistView from './views/PlaylistView';
import AlbumView from './views/AlbumView';
import ArtistView from './views/ArtistView';
import MixView from './views/MixView';

function Shell() {
  const { view, navigate } = useNav();
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    playlists,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    volume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    toggleFavorite,
    setQueueOpen,
    queueOpen,
    nowPlayingOpen,
  } = usePlayer();
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      if (!element) return false;
      return (
        /^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName) || element.isContentEditable === true
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
        return;
      }
      if (isTyping(event.target) || nowPlayingOpen) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case ' ':
          event.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          if (currentTrack) {
            event.preventDefault();
            seek(Math.min(duration, progress + 5));
          }
          break;
        case 'ArrowLeft':
          if (currentTrack) {
            event.preventDefault();
            seek(Math.max(0, progress - 5));
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          setVolume(Math.min(1, volume + 0.05));
          break;
        case 'ArrowDown':
          event.preventDefault();
          setVolume(Math.max(0, volume - 0.05));
          break;
        case '/':
          event.preventDefault();
          document.querySelector<HTMLInputElement>('.topbar-search input')?.focus();
          break;
        case 'q':
        case 'Q':
          setQueueOpen(!queueOpen);
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
        case 's':
        case 'S':
          toggleShuffle();
          break;
        case 'r':
        case 'R':
          cycleRepeat();
          break;
        case 'f':
        case 'F':
          if (currentTrack) toggleFavorite(currentTrack.id);
          break;
        case 'n':
        case 'N':
          next();
          break;
        case 'p':
        case 'P':
          previous();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    currentTrack,
    cycleRepeat,
    duration,
    next,
    nowPlayingOpen,
    progress,
    queueOpen,
    seek,
    setQueueOpen,
    setVolume,
    toggleFavorite,
    toggleMute,
    togglePlay,
    toggleShuffle,
    volume,
  ]);

  useEffect(() => {
    document.body.classList.toggle('is-playing', isPlaying);
  }, [isPlaying]);

  useEffect(() => {
    document.title = currentTrack
      ? `${currentTrack.title} · ${currentTrack.artist} — Sonora`
      : 'Sonora — Original music, synthesized in-house';
  }, [currentTrack]);

  const playlist =
    view.kind === 'playlist' ? playlists.find((item) => item.id === view.id) : undefined;
  const mix = view.kind === 'mix' ? getMoodMix(view.id) : undefined;
  const artist = view.kind === 'artist' ? getArtist(view.name) : undefined;

  let title = 'Home';
  let subtitle: string | undefined = 'Your daily rotation';
  if (view.kind === 'search') {
    title = 'Search';
    subtitle = 'Tracks, albums, artists, and moods';
  } else if (view.kind === 'library') {
    title = 'Your library';
    subtitle = 'Playlists, albums, and everything saved';
  } else if (view.kind === 'favorites') {
    title = 'Favorites';
    subtitle = 'The tracks you keep coming back to';
  } else if (view.kind === 'playlist') {
    title = playlist?.name ?? 'Playlist';
    subtitle = 'Playlist';
  } else if (view.kind === 'album') {
    title = view.name;
    subtitle = 'Album';
  } else if (view.kind === 'artist') {
    title = artist?.name ?? view.name;
    subtitle = 'Artist';
  } else if (view.kind === 'mix') {
    title = mix?.name ?? 'Mix';
    subtitle = 'Made for you';
  }

  const renderView = () => {
    switch (view.kind) {
      case 'search':
        return <SearchView query={search} onQueryChange={setSearch} />;
      case 'library':
        return <LibraryView />;
      case 'favorites':
        return <FavoritesView />;
      case 'playlist':
        return <PlaylistView id={view.id} />;
      case 'album':
        return <AlbumView name={view.name} />;
      case 'artist':
        return <ArtistView name={view.name} />;
      case 'mix':
        return <MixView id={view.id} />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="app">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="app-main">
        <TopBar
          title={title}
          subtitle={subtitle}
          search={search}
          onSearch={setSearch}
          onOpenMenu={() => setSidebarOpen(true)}
          onOpenQueue={() => setQueueOpen(true)}
        />
        <main className="content" id="main">
          {renderView()}
        </main>
        <footer className="page-foot">
          <span>Sonora</span> · A local-first music player with an original, in-house catalogue.
          <button type="button" onClick={() => navigate({ kind: 'home' })}>
            Back to home
          </button>
        </footer>
      </div>

      <PlayerBar />
      <NowPlaying />
      <QueuePanel />
      <PlaylistPicker />
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <NavProvider>
        <Shell />
      </NavProvider>
    </PlayerProvider>
  );
}
