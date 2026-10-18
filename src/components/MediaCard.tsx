import type { IconName } from './Icons';
import { Icon } from './Icons';

interface MediaCardProps {
  image?: string;
  gradient?: [string, string];
  title: string;
  subtitle: string;
  onClick?: () => void;
  onPlay?: () => void;
  isPlaying?: boolean;
  icon?: IconName;
}

/** Album / mix / playlist tile with a hover play affordance. */
export default function MediaCard({
  image,
  gradient,
  title,
  subtitle,
  onClick,
  onPlay,
  isPlaying = false,
  icon,
}: MediaCardProps) {
  return (
    <div className="media-card">
      <div
        className="media-art"
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick?.();
          }
        }}
        style={
          gradient && !image
            ? { background: `linear-gradient(145deg, ${gradient[0]}, ${gradient[1]})` }
            : undefined
        }
      >
        {image ? (
          <img src={image} alt="" loading="lazy" decoding="async" draggable={false} />
        ) : (
          <span className="media-art-icon">{icon && <Icon name={icon} size={30} />}</span>
        )}
        {onPlay && (
          <button
            type="button"
            className="card-play"
            onClick={(event) => {
              event.stopPropagation();
              onPlay();
            }}
            aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={18} />
          </button>
        )}
      </div>
      <button type="button" className="media-meta" onClick={onClick}>
        <span className="media-title">{title}</span>
        <span className="media-sub">{subtitle}</span>
      </button>
    </div>
  );
}
