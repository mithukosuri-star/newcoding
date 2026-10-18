import { useNav } from '../nav/NavContext';
import { usePlayer } from '../player/PlayerContext';
import { formatTime } from '../lib/format';
import Cover from './Cover';
import { Icon } from './Icons';
import Visualizer from './Visualizer';

function ProgressSlider({
  value,
  max,
  onChange,
  label,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <input
      type="range"
      className="slider"
      min={0}
      max={Math.max(max, 0.01)}
      step={0.1}
      value={Math.min(value, max || 0.01)}
      onChange={(event) => onChange(Number(event.target.value))}
      style={{ '--progress': `${percent}%` } as React.CSSProperties}
      aria-label={label}
    />
  );
}

export default function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    progress,
    duration,
    volume,
    muted,
    shuffle,
    repeat,
    queue,
    queueIndex,
    analyser,
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
    setNowPlayingOpen,
    setQueueOpen,
    queueOpen,
  } = usePlayer();
  const { navigate } = useNav();

  const liked = currentTrack ? isFavorite(currentTrack.id) : false;
  const upNext = Math.max(0, queue.length - queueIndex - 1);

  return (
    <footer className="player-bar" aria-label="Player">
      <div className="player-track">
        {currentTrack ? (
          <>
            <button
              type="button"
              className="player-cover"
              onClick={() => setNowPlayingOpen(true)}
              aria-label="Open now playing"
            >
              <Cover src={currentTrack.cover} alt={`${currentTrack.album} cover`} accent={currentTrack.accent} rounded={10} eager />
              <span className="player-cover-expand">
                <Icon name="chevronDown" size={16} style={{ transform: 'rotate(180deg)' }} />
              </span>
            </button>
            <div className="player-meta">
              <button
                type="button"
                className="player-title"
                onClick={() => setNowPlayingOpen(true)}
                title={currentTrack.title}
              >
                {currentTrack.title}
              </button>
              <button
                type="button"
                className="player-artist"
                onClick={() => navigate({ kind: 'artist', name: currentTrack.artist })}
              >
                {currentTrack.artist}
              </button>
            </div>
            <button
              type="button"
              className={`icon-btn ghost heart-btn ${liked ? 'liked' : ''}`}
              onClick={() => toggleFavorite(currentTrack.id)}
              aria-label={liked ? 'Remove from favorites' : 'Save to favorites'}
            >
              <Icon name={liked ? 'heartFilled' : 'heart'} size={18} />
            </button>
          </>
        ) : (
          <>
            <div className="player-cover empty" aria-hidden="true">
              <Icon name="music" size={22} />
            </div>
            <div className="player-meta">
              <span className="player-title muted">Nothing playing</span>
              <span className="player-artist">Pick a track to start</span>
            </div>
          </>
        )}
      </div>

      <div className="player-center">
        <div className="player-controls">
          <button
            type="button"
            className={`icon-btn ghost ${shuffle ? 'on' : ''}`}
            onClick={toggleShuffle}
            aria-label={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
            aria-pressed={shuffle}
            title="Shuffle"
          >
            <Icon name="shuffle" size={17} />
          </button>
          <button type="button" className="icon-btn ghost" onClick={previous} aria-label="Previous track">
            <Icon name="previous" size={18} />
          </button>
          <button
            type="button"
            className={`play-btn ${isBuffering ? 'buffering' : ''}`}
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={22} />
          </button>
          <button type="button" className="icon-btn ghost" onClick={next} aria-label="Next track">
            <Icon name="next" size={18} />
          </button>
          <button
            type="button"
            className={`icon-btn ghost repeat-btn ${repeat !== 'off' ? 'on' : ''}`}
            onClick={cycleRepeat}
            aria-label={`Repeat: ${repeat}`}
            title={`Repeat: ${repeat}`}
          >
            <Icon name={repeat === 'one' ? 'repeatOne' : 'repeat'} size={17} />
          </button>
        </div>
        <div className="player-scrub">
          <span className="time">{formatTime(progress)}</span>
          <ProgressSlider value={progress} max={duration} onChange={seek} label="Seek" />
          <span className="time">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="player-extras">
        <button
          type="button"
          className={`icon-btn ghost queue-toggle ${queueOpen ? 'on' : ''}`}
          onClick={() => setQueueOpen(!queueOpen)}
          aria-label="Toggle queue"
          aria-pressed={queueOpen}
          title="Queue"
        >
          <Icon name="queue" size={18} />
          {upNext > 0 && <span className="queue-badge">{upNext}</span>}
        </button>
        <div className="volume">
          <button
            type="button"
            className="icon-btn ghost"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
            title={muted ? 'Unmute' : 'Mute'}
          >
            <Icon
              name={muted || volume === 0 ? 'volumeMuted' : volume < 0.45 ? 'volumeLow' : 'volume'}
              size={18}
            />
          </button>
          <input
            type="range"
            className="slider volume-slider"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            style={{ '--progress': `${(muted ? 0 : volume) * 100}%` } as React.CSSProperties}
            aria-label="Volume"
          />
        </div>
        <div className="player-visualizer" aria-hidden="true">
          <Visualizer analyser={analyser} active={isPlaying} bars={5} />
        </div>
      </div>
    </footer>
  );
}
