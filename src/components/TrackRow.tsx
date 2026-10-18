import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNav } from '../nav/NavContext';
import { usePlayer } from '../player/PlayerContext';
import { formatTime } from '../lib/format';
import type { Track } from '../types';
import Cover from './Cover';
import Equalizer from './Equalizer';
import { Icon } from './Icons';

interface TrackRowProps {
  track: Track;
  contextIds: string[];
  index?: number;
  showCover?: boolean;
  showAlbum?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
}

export default function TrackRow({
  track,
  contextIds,
  index,
  showCover = true,
  showAlbum = true,
  onRemove,
  removeLabel = 'Remove from playlist',
}: TrackRowProps) {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    isFavorite,
    toggleFavorite,
    addToQueue,
    openPlaylistPicker,
  } = usePlayer();
  const { navigate } = useNav();
  const [menu, setMenu] = useState<{ left: number; top: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isCurrent = currentTrack?.id === track.id;
  const playingThis = isCurrent && isPlaying;
  const liked = isFavorite(track.id);

  useEffect(() => {
    if (!menu) return;
    const onPointer = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenu(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null);
    };
    const onScroll = () => setMenu(null);
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [menu]);

  const openMenu = (button: HTMLElement) => {
    const rect = button.getBoundingClientRect();
    const width = 232;
    const height = onRemove ? 344 : 304;
    const left = Math.min(Math.max(12, rect.right - width), window.innerWidth - width - 12);
    const top =
      rect.bottom + 8 + height > window.innerHeight ? Math.max(12, rect.top - height - 8) : rect.bottom + 8;
    setMenu({ left, top });
  };

  return (
    <div className={`track-row ${isCurrent ? 'is-current' : ''}`} role="row">
      <div className="row-index">
        {index !== undefined && (
          <span className="row-number">{playingThis ? <Equalizer /> : String(index + 1).padStart(2, '0')}</span>
        )}
        <button
          type="button"
          className="row-play"
          onClick={() => (isCurrent ? togglePlay() : playTrack(track.id, contextIds))}
          aria-label={playingThis ? `Pause ${track.title}` : `Play ${track.title}`}
        >
          <Icon name={playingThis ? 'pause' : 'play'} size={16} />
        </button>
      </div>

      {showCover && (
        <div className="row-cover">
          <Cover src={track.cover} alt={`${track.album} cover`} accent={track.accent} rounded={8} />
        </div>
      )}

      <div className="row-main">
        <button
          type="button"
          className="row-title"
          onClick={() => (isCurrent ? togglePlay() : playTrack(track.id, contextIds))}
        >
          {track.title}
        </button>
        <button
          type="button"
          className="row-artist"
          onClick={() => navigate({ kind: 'artist', name: track.artist })}
        >
          {track.artist}
        </button>
      </div>

      {showAlbum && (
        <button
          type="button"
          className="row-album"
          onClick={() => navigate({ kind: 'album', name: track.album })}
        >
          {track.album}
        </button>
      )}

      <div className="row-bpm" title={`${track.bpm} BPM · ${track.key}`}>
        {track.bpm} BPM
      </div>

      <div className="row-actions">
        <button
          type="button"
          className={`row-icon ${liked ? 'liked' : ''}`}
          onClick={() => toggleFavorite(track.id)}
          aria-label={liked ? `Remove ${track.title} from favorites` : `Save ${track.title}`}
          title={liked ? 'Remove from favorites' : 'Save to favorites'}
        >
          <Icon name={liked ? 'heartFilled' : 'heart'} size={17} />
        </button>
        <span className="row-duration">{formatTime(track.duration)}</span>
        {onRemove && (
          <button
            type="button"
            className="row-icon"
            onClick={onRemove}
            aria-label={removeLabel}
            title={removeLabel}
          >
            <Icon name="close" size={16} />
          </button>
        )}
        <button
          type="button"
          className="row-icon"
          onClick={(event) => openMenu(event.currentTarget)}
          aria-label={`More options for ${track.title}`}
          aria-haspopup="menu"
          aria-expanded={Boolean(menu)}
        >
          <Icon name="more" size={18} />
        </button>
      </div>

      {menu &&
        createPortal(
          <div
            className="menu"
            ref={menuRef}
            style={{ left: menu.left, top: menu.top }}
            role="menu"
            aria-label={`Options for ${track.title}`}
          >
            <div className="menu-head">
              <Cover src={track.cover} alt="" accent={track.accent} rounded={6} />
              <div>
                <strong>{track.title}</strong>
                <span>{track.artist}</span>
              </div>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                addToQueue(track.id, true);
                setMenu(null);
              }}
            >
              <Icon name="next" size={16} /> Play next
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                addToQueue(track.id);
                setMenu(null);
              }}
            >
              <Icon name="queue" size={16} /> Add to queue
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                openPlaylistPicker(track.id);
                setMenu(null);
              }}
            >
              <Icon name="plus" size={16} /> Add to playlist…
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                toggleFavorite(track.id);
                setMenu(null);
              }}
            >
              <Icon name={liked ? 'heartFilled' : 'heart'} size={16} />
              {liked ? 'Remove from favorites' : 'Save to favorites'}
            </button>
            <div className="menu-sep" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                navigate({ kind: 'album', name: track.album });
                setMenu(null);
              }}
            >
              <Icon name="disc" size={16} /> Go to album
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                navigate({ kind: 'artist', name: track.artist });
                setMenu(null);
              }}
            >
              <Icon name="music" size={16} /> Go to artist
            </button>
            {onRemove && (
              <>
                <div className="menu-sep" />
                <button
                  type="button"
                  role="menuitem"
                  className="danger"
                  onClick={() => {
                    onRemove();
                    setMenu(null);
                  }}
                >
                  <Icon name="trash" size={16} /> {removeLabel}
                </button>
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
