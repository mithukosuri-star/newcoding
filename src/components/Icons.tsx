import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'play'
  | 'pause'
  | 'next'
  | 'previous'
  | 'shuffle'
  | 'repeat'
  | 'repeatOne'
  | 'heart'
  | 'heartFilled'
  | 'volume'
  | 'volumeLow'
  | 'volumeMuted'
  | 'queue'
  | 'close'
  | 'plus'
  | 'search'
  | 'home'
  | 'library'
  | 'clock'
  | 'more'
  | 'chevronLeft'
  | 'chevronDown'
  | 'chevronRight'
  | 'check'
  | 'trash'
  | 'moon'
  | 'sun'
  | 'headphones'
  | 'wave'
  | 'music'
  | 'sparkle'
  | 'menu'
  | 'list'
  | 'disc';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const paths: Record<IconName, ReactNode> = {
  play: <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="6.5" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="13.9" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  next: (
    <>
      <path d="M6 6.2v11.6L15 12 6 6.2Z" fill="currentColor" stroke="none" />
      <rect x="16.4" y="5.6" width="2.4" height="12.8" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  previous: (
    <>
      <path d="M18 6.2v11.6L9 12l9-5.8Z" fill="currentColor" stroke="none" />
      <rect x="5.2" y="5.6" width="2.4" height="12.8" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  shuffle: (
    <>
      <path d="M4 7h3.2c1.4 0 2.6.7 3.4 1.9l3.8 6.2c.8 1.2 2 1.9 3.4 1.9H20" />
      <path d="m17 14 3 3-3 3" />
      <path d="M4 17h3.2c1.4 0 2.6-.7 3.4-1.9" />
      <path d="M17 4l3 3-3 3" />
      <path d="M14 8.4c.6-.9 1.6-1.4 2.7-1.4H20" />
    </>
  ),
  repeat: (
    <>
      <path d="M4 12V9.5A3.5 3.5 0 0 1 7.5 6H20" />
      <path d="m17 3 3 3-3 3" />
      <path d="M20 12v2.5A3.5 3.5 0 0 1 16.5 18H4" />
      <path d="m7 21-3-3 3-3" />
    </>
  ),
  repeatOne: (
    <>
      <path d="M4 12V9.5A3.5 3.5 0 0 1 7.5 6H20" />
      <path d="m17 3 3 3-3 3" />
      <path d="M20 12v2.5A3.5 3.5 0 0 1 16.5 18H4" />
      <path d="m7 21-3-3 3-3" />
      <path d="M11 10.2h1.4V15" strokeWidth={1.6} />
    </>
  ),
  heart: (
    <path d="M12 20s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.5 3.1C19.5 15.4 12 20 12 20Z" />
  ),
  heartFilled: (
    <path
      d="M12 20s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.5 3.1C19.5 15.4 12 20 12 20Z"
      fill="currentColor"
    />
  ),
  volume: (
    <>
      <path d="M4 9.5h3L12 5v14l-5-4.5H4v-5Z" />
      <path d="M15.5 8.8a4.5 4.5 0 0 1 0 6.4" />
      <path d="M18 6.2a8 8 0 0 1 0 11.6" />
    </>
  ),
  volumeLow: (
    <>
      <path d="M4 9.5h3L12 5v14l-5-4.5H4v-5Z" />
      <path d="M15.5 8.8a4.5 4.5 0 0 1 0 6.4" />
    </>
  ),
  volumeMuted: (
    <>
      <path d="M4 9.5h3L12 5v14l-5-4.5H4v-5Z" />
      <path d="m16 9.5 5 5M21 9.5l-5 5" />
    </>
  ),
  queue: (
    <>
      <path d="M4 7h11M4 12h11M4 17h7" />
      <path d="M17.5 10.5v7.2" />
      <circle cx="16" cy="18.4" r="1.6" />
      <path d="M17.5 10.5 21 9.4v3.3l-3.5 1" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  home: (
    <>
      <path d="m4 10.5 8-6.5 8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5Z" />
      <path d="M9.5 20.5V14h5v6.5" />
    </>
  ),
  library: (
    <>
      <path d="M5 4.5v15M9.5 4.5v15M14.5 5.2l4.3 13.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  more: (
    <>
      <circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  chevronLeft: <path d="m14.5 6-6 6 6 6" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9.5 7V5.4A1.4 1.4 0 0 1 10.9 4h2.2a1.4 1.4 0 0 1 1.4 1.4V7" />
      <path d="m6.5 7 .9 12.1A1.5 1.5 0 0 0 8.9 20.5h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
      <path d="M10.5 11v5.5M13.5 11v5.5" />
    </>
  ),
  moon: <path d="M20.5 13.2A8.6 8.6 0 1 1 10.8 3.5a6.7 6.7 0 0 0 9.7 9.7Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.8v2.2M12 19v2.2M4.3 4.3l1.6 1.6M18.1 18.1l1.6 1.6M2.8 12H5M19 12h2.2M4.3 19.7l1.6-1.6M18.1 5.9l1.6-1.6" />
    </>
  ),
  headphones: (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <path d="M4 14h2.6a1 1 0 0 1 1 1v3.6a1 1 0 0 1-1 1H5.4A1.4 1.4 0 0 1 4 18.2V14Z" />
      <path d="M20 14h-2.6a1 1 0 0 0-1 1v3.6a1 1 0 0 0 1 1h1.2a1.4 1.4 0 0 0 1.4-1.4V14Z" />
    </>
  ),
  wave: (
    <path d="M2.5 12h2.2l1.8-5.5 2.4 11 2.2-8 2 5 1.9-8.5 2 11 1.8-5H21.5" />
  ),
  music: (
    <>
      <path d="M9 18V6.5l10-2v11" />
      <circle cx="6.8" cy="18" r="2.3" />
      <circle cx="16.8" cy="15.5" r="2.3" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.5 13.8 9l5.5 1.8-5.5 1.8L12 18l-1.8-5.4L4.7 10.8 10.2 9 12 3.5Z" />
      <path d="M19 17.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  list: (
    <>
      <path d="M8.5 6.5h11M8.5 12h11M8.5 17.5h11" />
      <circle cx="4.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="17.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  disc: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2.2" />
    </>
  ),
};

export function Icon({ name, size = 20, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
