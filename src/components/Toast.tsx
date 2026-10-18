import { usePlayer } from '../player/PlayerContext';
import { Icon } from './Icons';

export default function Toast() {
  const { toast } = usePlayer();
  if (!toast) return null;

  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast-icon">
        <Icon name="check" size={14} strokeWidth={2.6} />
      </span>
      {toast}
    </div>
  );
}
