interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
}

export default function ProgressRing({ value, size = 54, stroke = 5 }: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="progress-ring" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="progress-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#progress-gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: 'stroke-dashoffset 500ms ease' }}
        />
      </svg>
      <span className="progress-ring-value">{Math.round(clamped)}%</span>
    </div>
  );
}
