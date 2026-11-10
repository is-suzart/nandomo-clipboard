import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { normalizeLocale } from '../../../packages/core/src/i18n.js';

const RESOURCE = '/org/gtk/libgtk/emoji';
const GTK_DATA = '/usr/share/gtk-4.0/emoji';
const TYPE = new GLib.VariantType('a(aussasasu)');

Gio._promisify(Gio.Subprocess.prototype, 'communicate_async', 'communicate_finish');

export async function loadSystemEmoji(cancellable) {
  const locale = normalizeLocale(GLib.get_language_names()[0]);
  const language = locale?.split('-')[0] ?? 'en';
  let bytes;
  if (language !== 'en') {
    try {
      bytes = Gio.Resource.load(`${GTK_DATA}/${language}.gresource`)
        .lookup_data(`${RESOURCE}/${language}.data`, Gio.ResourceLookupFlags.NONE);
    } catch {
      // GTK packages do not ship every translation.
    }
  }
  if (!bytes) {
    const process = Gio.Subprocess.new(
      ['gresource', 'extract', '/usr/lib/libgtk-4.so.1', `${RESOURCE}/en.data`],
      Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE);
    [bytes] = await process.communicate_async(null, cancellable);
    if (!process.get_successful() || !bytes) return [];
  }

  const data = GLib.Variant.new_from_bytes(TYPE, bytes, false);
  if (!data.is_normal_form()) return [];
  const entries = new Map();
  for (const [codes, english, local, englishTags, localTags] of data.deepUnpack()) {
    const text = String.fromCodePoint(...codes.filter(code => code !== 0x1f3fb).map(code => code || 0xfe0f));
    if (text) entries.set(text, [text, local || english, [english, ...englishTags, ...localTags].join(' ')]);
  }
  return [...entries.values()];
}
