import { useEffect } from 'react';
import { usePlayer } from '../player/PlayerContext';
import { formatTime } from '../lib/format';
import Cover from './Cover';
import Equalizer from './Equalizer';
import { Icon } from './Icons';

export default function QueuePanel() {
  const {
    queue,
    queueIndex,
    currentTrack,
    isPlaying,
    queueOpen,
    setQueueOpen,
    jumpToQueueIndex,
    removeFromQueue,
    clearQueue,
    togglePlay,
  } = usePlayer();

  useEffect(() => {
    if (!queueOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setQueueOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [queueOpen, setQueueOpen]);

  if (!queueOpen) return null;

  const upcoming = queue.slice(queueIndex + 1);

  return (
    <>
      <button
        type="button"
        className="queue-backdrop"
        aria-label="Close queue"
        onClick={() => setQueueOpen(false)}
      />
      <aside className="queue-panel" aria-label="Playback queue">
        <header className="queue-head">
          <div>
            <h2>Queue</h2>
            <p>{upcoming.length} up next</p>
          </div>
          <div className="queue-head-actions">
            {upcoming.length > 0 && (
              <button type="button" className="text-btn" onClick={clearQueue}>
                Clear
              </button>
            )}
            <button
              type="button"
              className="icon-btn ghost"
              onClick={() => setQueueOpen(false)}
              aria-label="Close queue"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </header>

        <div className="queue-scroll">
          {currentTrack && (
            <>
              <h3 className="queue-label">Now playing</h3>
              <div className="queue-now">
                <Cover src={currentTrack.cover} alt="" accent={currentTrack.accent} rounded={8} />
                <div className="queue-now-text">
                  <span className="queue-now-title">{currentTrack.title}</span>
                  <span className="queue-now-artist">{currentTrack.artist}</span>
                </div>
                <button
                  type="button"
                  className="icon-btn ghost"
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  <Icon name={isPlaying ? 'pause' : 'play'} size={16} />
                </button>
                <Equalizer paused={!isPlaying} />
              </div>
            </>
          )}

          <h3 className="queue-label">
            Next up <span>{upcoming.length}</span>
          </h3>

          {upcoming.length === 0 ? (
            <p className="queue-empty">Your queue is empty. Add tracks from anywhere in the app.</p>
          ) : (
            <ul className="queue-list">
              {upcoming.map((track, offset) => {
                const index = queueIndex + 1 + offset;
                return (
                  <li key={`${track.id}-${index}`} className="queue-item">
                    <button
                      type="button"
                      className="queue-item-main"
                      onClick={() => jumpToQueueIndex(index)}
                    >
                      <Cover src={track.cover} alt="" accent={track.accent} rounded={7} />
                      <span className="queue-item-text">
                        <span className="queue-item-title">{track.title}</span>
                        <span className="queue-item-artist">{track.artist}</span>
                      </span>
                      <span className="queue-item-duration">{formatTime(track.duration)}</span>
                    </button>
                    <button
                      type="button"
                      className="queue-item-remove"
                      onClick={() => removeFromQueue(index)}
                      aria-label={`Remove ${track.title} from the queue`}
                    >
                      <Icon name="close" size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
