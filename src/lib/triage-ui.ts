import { icons } from './icons';
import { esc } from './cras-view';
import type { Livello, Triage } from './triage';

export const LIV: Record<Livello, { label: string; icon: keyof typeof icons; badge: string }> = {
  urgenza: { label: 'Urgenza', icon: 'warn', badge: 'bad' },
  'scalda-e-chiama': { label: 'Scalda e chiama', icon: 'heat', badge: 'warn' },
  lascialo: { label: 'Lascialo stare', icon: 'check', badge: 'ok' },
};

/** Avviso "in attesa di revisione veterinaria", finché il triage non è firmato. */
export function mostraAvviso(t: Triage, el: HTMLElement): void {
  if (t.revisionato) return;
  el.innerHTML = `<span>${icons.info()}</span><p style="margin:0"><strong>In attesa di revisione veterinaria.</strong> ${esc(t.avviso)}</p>`;
  el.hidden = false;
}
