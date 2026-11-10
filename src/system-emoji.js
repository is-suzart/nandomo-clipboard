import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { normalizeLocale } from '@nandomo/core';

const RESOURCE = '/org/gtk/libgtk/emoji';
const GTK_DATA = '/usr/share/gtk-4.0/emoji';
const TYPE = new GLib.VariantType('a(aussasasu)');

export function loadSystemEmoji() {
  const locale = normalizeLocale(GLib.get_language_names()[0]);
  const language = locale?.split('-')[0] ?? 'en';
  if (language === 'en') return [];
  let bytes;
  try {
    bytes = Gio.Resource.load(`${GTK_DATA}/${language}.gresource`)
      .lookup_data(`${RESOURCE}/${language}.data`, Gio.ResourceLookupFlags.NONE);
  } catch {
    return [];
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
