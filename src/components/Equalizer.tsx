/** Tiny animated bars shown next to the row that is currently playing. */
export default function Equalizer({ paused = false }: { paused?: boolean }) {
  return (
    <span className={`equalizer ${paused ? 'paused' : ''}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}
