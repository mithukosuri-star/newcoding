import { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  active: boolean;
  bars?: number;
  className?: string;
  idle?: boolean;
}

/** Frequency bars driven by the Web Audio analyser, with a calm idle state. */
export default function Visualizer({
  analyser,
  active,
  bars = 56,
  className = '',
  idle = true,
}: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let frame = 0;
    let start = performance.now();
    const values = new Float32Array(bars);
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      if (canvas.width !== Math.round(rect.width * dpr)) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);

      if (analyser && data && active) {
        analyser.getByteFrequencyData(data);
        for (let i = 0; i < bars; i += 1) {
          const ratio = Math.pow(i / bars, 1.7);
          const index = Math.min(data.length - 1, Math.floor(ratio * data.length * 0.82));
          const target = data[index] / 255;
          values[i] += (target - values[i]) * 0.35;
        }
      } else if (idle) {
        const t = (now - start) / 1000;
        for (let i = 0; i < bars; i += 1) {
          const wave = 0.5 + 0.5 * Math.sin(t * 0.8 + i * 0.42);
          const target = 0.05 + wave * 0.055;
          values[i] += (target - values[i]) * 0.05;
        }
      } else {
        for (let i = 0; i < bars; i += 1) values[i] *= 0.9;
      }

      const gap = Math.max(2, rect.width / bars * 0.28);
      const barWidth = (rect.width - gap * (bars - 1)) / bars;
      for (let i = 0; i < bars; i += 1) {
        const height = Math.max(2, values[i] * rect.height);
        const x = i * (barWidth + gap);
        const y = rect.height - height;
        const gradient = context.createLinearGradient(0, rect.height, 0, y);
        gradient.addColorStop(0, 'rgba(200, 245, 96, 0.95)');
        gradient.addColorStop(0.55, 'rgba(200, 245, 96, 0.55)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.85)');
        context.fillStyle = gradient;
        if (typeof context.roundRect === 'function') {
          context.beginPath();
          context.roundRect(x, y, barWidth, height, Math.min(barWidth / 2, 2.5));
          context.fill();
        } else {
          context.fillRect(x, y, barWidth, height);
        }
      }
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [analyser, active, bars, idle]);

  return <canvas ref={canvasRef} className={`visualizer ${className}`} aria-hidden="true" />;
}
