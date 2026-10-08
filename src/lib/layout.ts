import { icons, mascot } from './icons';

const BASE = import.meta.env.BASE_URL;

/** Header e footer sono nell'HTML (plugin Vite) per evitare layout shift: qui solo icone e mascotte. */
export function mountLayout(_page: string): void {
  document.querySelectorAll<HTMLElement>('[data-icon]').forEach((el) => {
    const fn = icons[el.dataset.icon as keyof typeof icons];
    if (fn) el.insertAdjacentHTML('afterbegin', fn(el.dataset.label ?? ''));
  });
  document.querySelectorAll<HTMLElement>('[data-mascot]').forEach((el) => {
    el.innerHTML = mascot();
  });
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${BASE}sw.js`, { scope: BASE }).catch(() => {});
  });
}
