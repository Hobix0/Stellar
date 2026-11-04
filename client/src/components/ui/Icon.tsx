/* ==================================================================
   Stellar · Schlichte Strich-Icons (inline SVG, 24×24)
   ================================================================== */

const ICON_PATHS = {
    home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    page: 'M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5',
    projects: 'M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v6h-4z',
    search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM20 20l-4-4',
    plus: 'M12 5v14M5 12h14',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
    chevronRight: 'M9 6l6 6-6 6',
    chevronLeft: 'M15 6l-6 6 6 6',
    inbox: 'M4 13l2.5-8h11L20 13v6H4zM4 13h5l1 2h4l1-2h5',
    sunrise: 'M12 3v5M5.6 8.6l1.4 1.4M18.4 8.6L17 10M3 17h18M7 17a5 5 0 0 1 10 0M3 21h18',
    chevronDown: 'M6 9l6 6 6-6',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
    grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
    sun: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
    menu: 'M4 6h16M4 12h16M4 18h16',
    close: 'M6 6l12 12M18 6L6 18',
    check: 'M5 12l5 5 9-10',
    restore: 'M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    board: 'M4 4h16v16H4zM9.3 4v16M14.6 4v16',
    list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
    calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
    edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
    settings: 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
} as const;

export type IconName = keyof typeof ICON_PATHS;

interface IconProps {
    name: IconName;
    size?: number;
    className?: string;
}

export function Icon({ name, size = 18, className }: IconProps) {
    return (
        <svg
            className={className}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d={ICON_PATHS[name]} />
        </svg>
    );
}
