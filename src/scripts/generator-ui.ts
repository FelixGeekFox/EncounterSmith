import {
  Forge,
  asMarkdown,
  asPlainText,
  isComplete,
  lockedCount,
  type GeneratorDef,
  type Roll,
} from './generator';
import { COPY_FAILED_MESSAGE, copyToClipboard } from './clipboard';

/**
 * Browser wiring for one generator panel.
 *
 * The markup is rendered on the server by GeneratorShell.astro, so the page is
 * complete and readable before any script runs. This module only fills in
 * values and manages state, and it writes every value with textContent: no
 * table content is ever turned into HTML.
 */

const STATUS_CLEAR_MS = 7000;

export function mountForge(root: HTMLElement, def: GeneratorDef): void {
  const slotList = root.querySelector<HTMLElement>('[data-slots]');
  const resultPanel = root.querySelector<HTMLElement>('[data-result]');
  if (!slotList || !resultPanel) return;

  const slots: HTMLElement = slotList;
  const panel: HTMLElement = resultPanel;
  const emptyState = root.querySelector<HTMLElement>('[data-empty]');
  const live = root.querySelector<HTMLElement>('[data-live]');

  const forge = new Forge(def);
  let roll: Roll = forge.empty();
  let hasRolled = false;
  let clearTimer: number | undefined;

  const reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const nodes = new Map<string, HTMLElement>();
  for (const node of root.querySelectorAll<HTMLElement>('[data-slot]')) {
    const id = node.dataset['slot'];
    if (id) nodes.set(id, node);
  }

  function say(message: string): void {
    if (!live) return;
    live.textContent = message;
    if (clearTimer !== undefined) window.clearTimeout(clearTimer);
    clearTimer = window.setTimeout(() => {
      live.textContent = '';
    }, STATUS_CLEAR_MS);
  }

  function enableResultActions(enabled: boolean): void {
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-needs-roll]')) {
      button.disabled = !enabled;
    }
  }

  function paint(): void {
    for (const slot of roll) {
      const node = nodes.get(slot.id);
      if (!node) continue;
      const value = node.querySelector<HTMLElement>('[data-value]');
      if (value) value.textContent = slot.value || value.dataset['placeholder'] || '';
      node.dataset['filled'] = String(slot.value !== '');
      node.dataset['locked'] = String(slot.locked);
      const lockButton = node.querySelector<HTMLButtonElement>('[data-act="lock"]');
      if (lockButton) {
        lockButton.setAttribute('aria-pressed', String(slot.locked));
        const label = lockButton.querySelector<HTMLElement>('[data-lock-text]');
        if (label) label.textContent = slot.locked ? 'Locked' : 'Lock';
      }
    }
  }

  function revealPanel(): void {
    if (emptyState) emptyState.hidden = true;
    panel.hidden = false;
    slots.hidden = false;
  }

  function doRoll(): void {
    const first = !hasRolled;
    roll = forge.roll(roll);
    hasRolled = true;
    revealPanel();
    paint();
    enableResultActions(isComplete(roll));

    if (first) {
      panel.focus({ preventScroll: reducedMotion });
      if (!reducedMotion) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      say(`${def.noun} forged. ${def.fields.length} fields filled.`);
      return;
    }

    const kept = lockedCount(roll);
    say(
      kept > 0
        ? `New ${def.nounInline} forged, keeping ${kept} locked field${kept === 1 ? '' : 's'}.`
        : `New ${def.nounInline} forged.`,
    );
  }

  function doReroll(id: string): void {
    if (!hasRolled) {
      doRoll();
      return;
    }
    const before = roll.find((slot) => slot.id === id);
    roll = forge.reroll(roll, id);
    paint();
    say(`${before?.label ?? 'Field'} rerolled.`);
  }

  function doLock(id: string): void {
    const current = roll.find((slot) => slot.id === id);
    if (!current) return;
    const next = !current.locked;
    roll = Forge.setLock(roll, id, next);
    paint();
    say(`${current.label} ${next ? 'locked' : 'unlocked'}.`);
  }

  async function doCopy(format: 'text' | 'markdown'): Promise<void> {
    if (!isComplete(roll)) return;
    const payload = format === 'markdown' ? asMarkdown(def, roll) : asPlainText(def, roll);
    const copied = await copyToClipboard(payload);
    say(copied ? `Copied as ${format === 'markdown' ? 'Markdown' : 'plain text'}.` : COPY_FAILED_MESSAGE);
  }

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>('button[data-act]');
    if (!button || !root.contains(button)) return;

    const action = button.dataset['act'];
    const slotId = button.closest<HTMLElement>('[data-slot]')?.dataset['slot'];
    event.preventDefault();

    switch (action) {
      case 'roll':
        doRoll();
        break;
      case 'reroll':
        if (slotId) doReroll(slotId);
        break;
      case 'lock':
        if (slotId) doLock(slotId);
        break;
      case 'copy-text':
        void doCopy('text');
        break;
      case 'copy-md':
        void doCopy('markdown');
        break;
      case 'print':
        window.print();
        break;
      default:
        break;
    }
  });

  // Every control is a real button, so the browser handles keyboard activation.
  // This only adds the shortcut the panel advertises.
  root.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 'g') return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLButtonElement
    ) {
      return;
    }
    event.preventDefault();
    doRoll();
  });

  enableResultActions(false);
  root.dataset['ready'] = 'true';
}
