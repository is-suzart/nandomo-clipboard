import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { t } from './src/locale.js';

export default class ClipboardPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const page = new Adw.PreferencesPage({ title: t('Área de transferência') });
    const group = new Adw.PreferencesGroup({
      title: t('GIFs do Klipy'),
      description: t('A busca envia o termo digitado ao Klipy. A chave é salva nas configurações locais do GNOME.'),
    });
    const key = new Adw.PasswordEntryRow({ title: t('Chave de API do Klipy') });
    this.getSettings().bind('klipy-key', key, 'text', Gio.SettingsBindFlags.DEFAULT);
    group.add(key);
    page.add(group);
    window.add(page);
  }
}
