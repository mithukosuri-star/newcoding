import { useState } from 'react';

interface CoverProps {
  src: string;
  alt: string;
  accent?: string;
  className?: string;
  rounded?: number;
  sizes?: string;
  eager?: boolean;
}

export default function Cover({
  src,
  alt,
  accent = '#6366f1',
  className = '',
  rounded,
  sizes,
  eager = false,
}: CoverProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`cover-fallback ${className}`}
        style={{
          background: `linear-gradient(135deg, ${accent}, #11131d 85%)`,
          borderRadius: rounded,
        }}
        aria-label={alt}
        role="img"
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`cover ${className}`}
      style={rounded !== undefined ? { borderRadius: rounded } : undefined}
      sizes={sizes}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
