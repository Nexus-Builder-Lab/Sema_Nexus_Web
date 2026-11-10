// Ícones SVG inline (traço simples), sem biblioteca externa.
const PATHS = {
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
  dashboard: 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  clipboard: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M8 12h8M8 16h5',
  file: 'M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h6',
  users:
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-5-6',
  team: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  menu: 'M3 6h18M3 12h18M3 18h18',
  chevronLeft: 'M15 18l-6-6 6-6',
  bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4',
  logout: 'M9 21H5V3h4M16 17l5-5-5-5M21 12H9',
  alert: 'M12 3 2 21h20zM12 10v5M12 18h.01',
  inbox: 'M3 12h5l2 3h4l2-3h5M5 5h14l2 7v7H3v-7z',
  close: 'M6 6l12 12M18 6 6 18',
  sortAsc: 'M12 5l-5 6h10zM12 19v-8',
  sortDesc: 'M12 19l-5-6h10zM12 5v8',
  sort: 'M12 4l-4 5h8zM12 20l-4-5h8z',
};

export default function Icon({ name, className = '', title }) {
  const d = PATHS[name] || PATHS.alert;
  return (
    <svg
      className={`nx-icon ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <path d={d} />
    </svg>
  );
}
