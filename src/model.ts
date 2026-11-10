import { batch, computed, signal } from '../../../packages/core/src/index.js';

const MAX_TEXT_LENGTH = 16_384;
const HISTORY_LIMIT = 60;

export function matches(text: string, query: string) {
  const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return normalize(text).includes(normalize(query.trim()));
}

export function createClipboardModel(initialPins: string[]) {
  const pinned = signal([...new Set(initialPins.filter(validText))]);
  const history = signal<string[]>([]);
  const query = signal('');
  const tab = signal<'history' | 'pinned' | 'emoji' | 'kaomoji' | 'gif'>('history');
  const paused = signal(false);
  const items = computed(() => (tab() === 'pinned' ? pinned() : history())
    .filter(text => matches(text, query())));

  function remember(text: string) {
    if (!validText(text) || paused() || pinned().includes(text)) return;
    history.set([text, ...history().filter(item => item !== text)].slice(0, HISTORY_LIMIT));
  }

  function togglePin(text: string) {
    if (!validText(text)) return;
    batch(() => {
      if (pinned().includes(text)) {
        pinned.set(pinned().filter(item => item !== text));
        history.set([text, ...history().filter(item => item !== text)].slice(0, HISTORY_LIMIT));
      } else {
        pinned.set([text, ...pinned()]);
        history.set(history().filter(item => item !== text));
      }
    });
  }

  return { pinned, history, query, tab, paused, items, remember, togglePin };
}

function validText(text: string) {
  return typeof text === 'string' && text.length <= MAX_TEXT_LENGTH && Boolean(text.trim());
}
