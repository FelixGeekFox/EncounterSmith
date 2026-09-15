import {
  RecentMemory,
  formatAsMarkdown,
  formatAsText,
  generate,
  rerollField,
  type GeneratorDefinition,
  type GeneratorResult,
} from './engine';
import { copyText } from './clipboard';

/**
 * Browser wiring for a generator. The markup is rendered by GeneratorShell.astro
 * and this module only fills in values and manages state, so the page is
 * complete and readable before any script runs.
 *
 * Values are written with textContent throughout. Nothing here builds HTML from
 * table data.
 */

const STATUS_RESET_MS = 6000;

function query<T extends Element>(root: ParentNode, selector: string): T | null {
  return root.querySelector<T>(selector);
}

export function mountGenerator(root: HTMLElement, definition: GeneratorDefinition): void {
  const fieldListNode = query<HTMLElement>(root, '[data-fields]');
  const emptyState = query<HTMLElement>(root, '[data-empty]');
  const status = query<HTMLElement>(root, '[data-status]');
  const resultsNode = query<HTMLElement>(root, '[data-results]');
  if (!fieldListNode || !resultsNode) return;

  // Re-bound after the guard so the narrowing survives into the hoisted
  // function declarations below.
  const fieldList: HTMLElement = fieldListNode;
  const results: HTMLElement = resultsNode;

  const memory = new RecentMemory(definition.recentMemory);
  const locked = new Set<string>();
  let current: GeneratorResult | undefined;
  let statusTimer: number | undefined;

  const fieldNodes = new Map<string, HTMLElement>();
  for (const node of root.querySelectorAll<HTMLElement>('[data-field]')) {
    const key = node.dataset['field'];
    if (key) fieldNodes.set(key, node);
  }

  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function announce(message: string): void {
    if (!status) return;
    status.textContent = message;
    if (statusTimer !== undefined) window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {
      status.textContent = '';
    }, STATUS_RESET_MS);
  }

  function setResultActionsEnabled(enabled: boolean): void {
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-needs-result]')) {
      button.disabled = !enabled;
    }
  }

  function paint(result: GeneratorResult): void {
    for (const field of definition.fields) {
      const node = fieldNodes.get(field.key);
      const value = result[field.key];
      if (!node || !value) continue;
      const target = query<HTMLElement>(node, '[data-value]');
      if (target) target.textContent = value.text;
      node.dataset['state'] = 'filled';
    }
  }

  function reveal(): void {
    if (emptyState) emptyState.hidden = true;
    fieldList.hidden = false;
    results.hidden = false;
  }

  function isFirstRun(): boolean {
    return current === undefined;
  }

  function runFullGenerate(): void {
    const first = isFirstRun();
    const next = generate(definition, { memory, locked, previous: current });
    current = next;
    reveal();
    paint(next);
    setResultActionsEnabled(true);

    if (first) {
      results.focus({ preventScroll: prefersReducedMotion });
      if (!prefersReducedMotion) {
        results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      announce(`${definition.noun} generated. ${definition.fields.length} fields filled.`);
    } else {
      const lockedCount = locked.size;
      announce(
        lockedCount > 0
          ? `New ${definition.nounLower} generated. ${lockedCount} field${lockedCount === 1 ? '' : 's'} kept.`
          : `New ${definition.nounLower} generated.`,
      );
    }
  }

  function runFieldReroll(key: string): void {
    if (!current) {
      runFullGenerate();
      return;
    }
    const field = definition.fields.find((candidate) => candidate.key === key);
    if (!field) return;
    const next = rerollField(definition, current, key, { memory });
    current = next;
    paint(next);
    announce(`${field.label} rerolled.`);
  }

  function toggleLock(key: string, button: HTMLButtonElement): void {
    const node = fieldNodes.get(key);
    const field = definition.fields.find((candidate) => candidate.key === key);
    if (!field) return;
    const nowLocked = !locked.has(key);
    if (nowLocked) {
      locked.add(key);
    } else {
      locked.delete(key);
    }
    button.setAttribute('aria-pressed', String(nowLocked));
    const label = query<HTMLElement>(button, '[data-lock-label]');
    if (label) label.textContent = nowLocked ? 'Locked' : 'Lock';
    if (node) node.dataset['locked'] = String(nowLocked);
    announce(`${field.label} ${nowLocked ? 'locked' : 'unlocked'}.`);
  }

  async function handleCopy(kind: 'text' | 'markdown'): Promise<void> {
    if (!current) return;
    const payload =
      kind === 'markdown'
        ? formatAsMarkdown(definition, current)
        : formatAsText(definition, current);
    const copied = await copyText(payload);
    announce(
      copied
        ? `Copied as ${kind === 'markdown' ? 'Markdown' : 'plain text'}.`
        : 'Copy failed. Your browser blocked clipboard access, so select the result and copy it manually.',
    );
  }

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>('button[data-action]');
    if (!button || !root.contains(button)) return;
    const action = button.dataset['action'];
    const key = button.closest<HTMLElement>('[data-field]')?.dataset['field'];

    switch (action) {
      case 'generate':
        event.preventDefault();
        runFullGenerate();
        break;
      case 'reroll':
        event.preventDefault();
        if (key) runFieldReroll(key);
        break;
      case 'lock':
        event.preventDefault();
        if (key) toggleLock(key, button);
        break;
      case 'copy-text':
        event.preventDefault();
        void handleCopy('text');
        break;
      case 'copy-markdown':
        event.preventDefault();
        void handleCopy('markdown');
        break;
      case 'print':
        event.preventDefault();
        window.print();
        break;
      default:
        break;
    }
  });

  // The controls are real buttons, so keyboard activation is handled by the
  // browser. This only adds the convenience shortcut advertised on the page.
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'g' || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
    if (target instanceof HTMLButtonElement) return;
    runFullGenerate();
  });

  root.dataset['ready'] = 'true';
  setResultActionsEnabled(false);
}
