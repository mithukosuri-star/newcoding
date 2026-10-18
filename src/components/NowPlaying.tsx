import { useEffect } from 'react';
import { useNav } from '../nav/NavContext';
import { usePlayer } from '../player/PlayerContext';
import { formatTime } from '../lib/format';
import Cover from './Cover';
import { Icon } from './Icons';
import Visualizer from './Visualizer';

export default function NowPlaying() {
  const {
    currentTrack,
    nowPlayingOpen,
    setNowPlayingOpen,
    isPlaying,
    isBuffering,
    progress,
    duration,
    volume,
    muted,
    shuffle,
    repeat,
    analyser,
    queue,
    queueIndex,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    isFavorite,
    toggleFavorite,
    playTrack,
    setQueueOpen,
  } = usePlayer();
  const { navigate } = useNav();

  useEffect(() => {
    if (!nowPlayingOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNowPlayingOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [nowPlayingOpen, setNowPlayingOpen]);

  if (!nowPlayingOpen || !currentTrack) return null;

  const liked = isFavorite(currentTrack.id);
  const upNext = queue.slice(queueIndex + 1, queueIndex + 7);
  const percent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="np" style={{ '--accent': currentTrack.accent } as React.CSSProperties}>
      <div
        className="np-backdrop"
        style={{ backgroundImage: `url(${currentTrack.cover})` }}
        aria-hidden="true"
      />
      <div className="np-scrim" aria-hidden="true" />

      <div className="np-inner">
        <header className="np-header">
          <div className="np-header-label">
            <span className="np-chip">Now playing</span>
            <button
              type="button"
              className="np-album"
              onClick={() => {
                setNowPlayingOpen(false);
                navigate({ kind: 'album', name: currentTrack.album });
              }}
            >
              {currentTrack.album}
            </button>
          </div>
          <div className="np-header-actions">
            <button
              type="button"
              className="icon-btn ghost"
              onClick={() => setQueueOpen(true)}
              aria-label="Open queue"
              title="Queue"
            >
              <Icon name="queue" size={19} />
            </button>
            <button
              type="button"
              className="icon-btn ghost"
              onClick={() => setNowPlayingOpen(false)}
              aria-label="Close now playing"
              title="Close"
            >
              <Icon name="chevronDown" size={22} />
            </button>
          </div>
        </header>

        <div className="np-grid">
          <section className="np-stage">
            <div className="np-art-wrap">
              <div className="np-glow" style={{ backgroundImage: `url(${currentTrack.cover})` }} />
              <Cover
                src={currentTrack.cover}
                alt={`${currentTrack.album} cover`}
                accent={currentTrack.accent}
                className="np-art"
                eager
              />
            </div>

            <div className="np-info">
              <h2>{currentTrack.title}</h2>
              <div className="np-info-row">
                <button
                  type="button"
                  className="np-artist"
                  onClick={() => {
                    setNowPlayingOpen(false);
                    navigate({ kind: 'artist', name: currentTrack.artist });
                  }}
                >
                  {currentTrack.artist}
                </button>
                <button
                  type="button"
                  className={`np-like ${liked ? 'liked' : ''}`}
                  onClick={() => toggleFavorite(currentTrack.id)}
                  aria-label={liked ? 'Remove from favorites' : 'Save to favorites'}
                >
                  <Icon name={liked ? 'heartFilled' : 'heart'} size={19} />
                </button>
              </div>
              <div className="np-tags">
                <span>{currentTrack.genre}</span>
                <span>{currentTrack.bpm} BPM</span>
                <span>{currentTrack.key}</span>
              </div>
            </div>

            <div className="np-visualizer-wrap">
              <Visualizer analyser={analyser} active={isPlaying} bars={64} className="np-visualizer" />
            </div>

            <div className="np-progress">
              <input
                type="range"
                className="slider"
                min={0}
                max={Math.max(duration, 0.01)}
                step={0.1}
                value={Math.min(progress, duration || 0.01)}
                onChange={(event) => seek(Number(event.target.value))}
                style={{ '--progress': `${percent}%` } as React.CSSProperties}
                aria-label="Seek"
              />
              <div className="np-times">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="np-controls">
              <button
                type="button"
                className={`icon-btn ghost ${shuffle ? 'on' : ''}`}
                onClick={toggleShuffle}
                aria-label="Shuffle"
                aria-pressed={shuffle}
              >
                <Icon name="shuffle" size={19} />
              </button>
              <button type="button" className="icon-btn ghost" onClick={previous} aria-label="Previous">
                <Icon name="previous" size={22} />
              </button>
              <button
                type="button"
                className={`np-play ${isBuffering ? 'buffering' : ''}`}
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                <Icon name={isPlaying ? 'pause' : 'play'} size={28} />
              </button>
              <button type="button" className="icon-btn ghost" onClick={next} aria-label="Next">
                <Icon name="next" size={22} />
              </button>
              <button
                type="button"
                className={`icon-btn ghost ${repeat !== 'off' ? 'on' : ''}`}
                onClick={cycleRepeat}
                aria-label={`Repeat ${repeat}`}
              >
                <Icon name={repeat === 'one' ? 'repeatOne' : 'repeat'} size={19} />
              </button>
            </div>

            <div className="np-volume">
              <button
                type="button"
                className="icon-btn ghost"
                onClick={toggleMute}
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                <Icon
                  name={muted || volume === 0 ? 'volumeMuted' : volume < 0.45 ? 'volumeLow' : 'volume'}
                  size={18}
                />
              </button>
              <input
                type="range"
                className="slider"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                style={{ '--progress': `${(muted ? 0 : volume) * 100}%` } as React.CSSProperties}
                aria-label="Volume"
              />
            </div>
          </section>

          <aside className="np-next" aria-label="Up next">
            <div className="np-next-head">
              <h3>Up next</h3>
              <button type="button" onClick={() => setQueueOpen(true)}>
                Queue <Icon name="chevronRight" size={14} />
              </button>
            </div>
            {upNext.length === 0 ? (
              <p className="np-next-empty">Nothing queued. You&apos;re at the end of the list.</p>
            ) : (
              <div className="np-next-list">
                {upNext.map((track, index) => (
                  <button
                    key={`${track.id}-${index}`}
                    type="button"
                    className="np-next-item"
                    onClick={() => playTrack(track.id)}
                  >
                    <Cover src={track.cover} alt="" accent={track.accent} rounded={8} />
                    <span className="np-next-text">
                      <span className="np-next-title">{track.title}</span>
                      <span className="np-next-artist">{track.artist}</span>
                    </span>
                    <span className="np-next-duration">{formatTime(track.duration)}</span>
                  </button>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
