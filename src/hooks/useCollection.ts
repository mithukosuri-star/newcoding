import { usePlayer } from '../player/PlayerContext';

/** Play / pause / shuffle helpers for an album, playlist, or mix. */
export function useCollection(ids: string[]) {
  const { currentTrack, isPlaying, playCollection, shuffleCollection, togglePlay } = usePlayer();
  const containsCurrent = Boolean(currentTrack && ids.includes(currentTrack.id));
  return {
    containsCurrent,
    isPlaying: containsCurrent && isPlaying,
    play: () => {
      if (containsCurrent) togglePlay();
      else playCollection(ids);
    },
    start: () => playCollection(ids),
    shuffle: () => shuffleCollection(ids),
  };
}
