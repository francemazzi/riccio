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
  // se arriva una versione nuova, ricarico una sola volta così non si resta sulla pagina vecchia
  const avevaSw = !!navigator.serviceWorker.controller;
  let ricaricato = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!avevaSw || ricaricato) return;
    ricaricato = true;
    location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${BASE}sw.js`, { scope: BASE }).catch(() => {});
  });
}
