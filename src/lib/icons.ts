/** Icone e illustrazioni SVG inline, stile a tratto, colorate via currentColor. */
const stroke = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

function svg(inner: string, label = '', viewBox = '0 0 24 24', cls = 'icon'): string {
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="${cls}" viewBox="${viewBox}" ${a11y} ${stroke}>${inner}</svg>`;
}

export const icons = {
  phone: (l = '') => svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>', l),
  pin: (l = '') => svg('<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.800 7 11 7 11z"/><circle cx="12" cy="10" r="2.500"/>', l),
  box: (l = '') => svg('<path d="M3 8l9-4 9 4v9l-9 4-9-4z"/><path d="M3 8l9 4 9-4M12 12v9"/>', l),
  heat: (l = '') => svg('<path d="M9 3h6v4a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3z"/><path d="M10 12c1-1 2 0 2 1.500S11 16 12 16.500M14 12.500c.500.500.500 1.500 0 2"/>', l),
  moon: (l = '') => svg('<path d="M20 14.500A8 8 0 0 1 9.500 4 8 8 0 1 0 20 14.500z"/>', l),
  sun: (l = '') => svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.500 1.500M17.500 17.500L19 19M5 19l1.500-1.500M17.500 6.500L19 5"/>', l),
  tick: (l = '') => svg('<circle cx="12" cy="12" r="3"/><path d="M12 9V6m0 12v-3m-3-3H6m12 0h-3M9.500 9.500L8 8m8 8l-1.500-1.500M14.500 9.500L16 8M8 16l1.500-1.500"/>', l),
  fly: (l = '') => svg('<ellipse cx="12" cy="14" rx="3" ry="4"/><path d="M9.500 11C6 8 4 9 4 10.500S7 13 9.500 12.500M14.500 11c3.500-3 5.500-2 5.500-.500S17 13 14.500 12.500M10 10l-1-4m5 4l1-4"/>', l),
  scale: (l = '') => svg('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 9a5 4 0 0 1 8 0M12 9l1.500-1.500"/>', l),
  drop: (l = '') => svg('<path d="M12 3s6 6.500 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11z"/>', l),
  milk: (l = '') => svg('<path d="M9 3h6v3l3 4v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V10l3-4z"/><path d="M4 4l16 16"/>', l),
  warn: (l = '') => svg('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>', l),
  lung: (l = '') => svg('<path d="M12 4v8M12 12c-2 1-3 1-4 4v3c-2 0-4-1-4-4 0-4 2-8 4-8 1 0 4 1 4 5zM12 12c2 1 3 1 4 4v3c2 0 4-1 4-4 0-4-2-8-4-8-1 0-4 1-4 5z"/>', l),
  bandage: (l = '') => svg('<rect x="2" y="8" width="20" height="8" rx="4" transform="rotate(-35 12 12)"/><path d="M10.500 10.500l.01 0m2.990 3l.01 0M10.500 13.500l.01 0m2.990-3l.01 0"/>', l),
  info: (l = '') => svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.500v.01"/>', l),
  search: (l = '') => svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', l),
  check: (l = '') => svg('<path d="M5 12l5 5 9-10"/>', l),
  close: (l = '') => svg('<path d="M6 6l12 12M18 6L6 18"/>', l),
  flag: (l = '') => svg('<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>', l),
};

/** Mascotte: riccio in primo piano, aculei a zig-zag. */
export function mascot(label = 'Un riccio sorridente'): string {
  return `<svg class="art" viewBox="0 0 240 180" role="img" aria-label="${label}">
  <ellipse cx="120" cy="165" rx="85" ry="9" fill="#4a3728" opacity=".15"/>
  <path d="M30 140 L18 118 L38 118 L26 92 L48 96 L42 66 L66 78 L68 48 L92 66 L100 36 L120 58 L136 32 L148 58 L172 40 L174 68 L200 58 L196 88 L220 92 L206 114 L222 130 L196 140 Z" fill="#4a3728"/>
  <path d="M52 138 L46 112 L66 118 L64 88 L88 102 L94 74 L114 94 L130 70 L142 96 L166 82 L166 108 L190 106 L184 130 Z" fill="#6b4f3a"/>
  <path d="M170 142 C172 116 190 100 214 108 C232 120 238 140 232 154 C226 164 200 166 170 160 Z" fill="#c9a27a"/>
  <path d="M170 146 C176 134 186 126 198 124 C206 130 206 144 198 156 Z" fill="#f3e9d8"/>
  <circle cx="206" cy="122" r="4.5" fill="#2b2118"/><circle cx="207.500" cy="120.500" r="1.400" fill="#fff"/>
  <circle cx="236" cy="143" r="5.500" fill="#2b2118"/>
  <path d="M208 142 q8 7 16 0" fill="none" stroke="#2b2118" stroke-width="2.500" stroke-linecap="round"/>
  <ellipse cx="190" cy="108" rx="6" ry="9" fill="#c9a27a" transform="rotate(-20 190 108)"/>
  <rect x="86" y="146" width="14" height="14" rx="6" fill="#c9a27a"/><rect x="132" y="148" width="14" height="12" rx="6" fill="#c9a27a"/>
</svg>`;
}

export function logo(): string {
  return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
  <path d="M5 34 L3 26 L9 27 L7 18 L14 22 L16 12 L22 19 L27 10 L31 19 L38 14 L38 23 L45 25 L40 31 L44 36 Z" fill="#c9a27a"/>
  <path d="M32 36 C33 28 38 24 44 26 C48 30 48 36 44 40 L32 40 Z" fill="#f3e9d8"/>
  <circle cx="39" cy="31" r="1.800" fill="#2b2118"/><circle cx="46" cy="35" r="2" fill="#2b2118"/></svg>`;
}

export const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#4a3728"/><path d="M5 34 L3 26 L9 27 L7 18 L14 22 L16 12 L22 19 L27 10 L31 19 L38 14 L38 23 L45 25 L40 31 L44 36 Z" fill="#c9a27a"/><path d="M32 36 C33 28 38 24 44 26 C48 30 48 36 44 40 L32 40 Z" fill="#f3e9d8"/><circle cx="39" cy="31" r="1.800" fill="#2b2118"/></svg>`;
