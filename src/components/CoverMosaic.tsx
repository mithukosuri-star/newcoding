import type { Track } from '../types';

interface CoverMosaicProps {
  tracks: Track[];
  className?: string;
  rounded?: number;
}

/** 2×2 collage that repeats covers when there are fewer than four. */
export default function CoverMosaic({ tracks, className = '', rounded }: CoverMosaicProps) {
  const covers = tracks.slice(0, 4).map((track) => track.cover);
  const fallback = tracks[0]?.accent ?? '#6366f1';

  if (covers.length === 0) {
    return (
      <div
        className={`mosaic empty-mosaic ${className}`}
        style={{
          background: `linear-gradient(135deg, ${fallback}, #11131d)`,
          borderRadius: rounded,
        }}
        aria-hidden="true"
      />
    );
  }

  const slots = [0, 1, 2, 3].map((index) => covers[index % covers.length]);

  return (
    <div
      className={`mosaic ${className}`}
      style={rounded !== undefined ? { borderRadius: rounded } : undefined}
      aria-hidden="true"
    >
      {slots.map((cover, index) => (
        <img key={`${cover}-${index}`} src={cover} alt="" loading="lazy" draggable={false} />
      ))}
    </div>
  );
}
