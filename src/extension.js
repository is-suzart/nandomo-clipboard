import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';
import Pango from 'gi://Pango';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { batch, effect, signal } from '../../../packages/core/src/index.js';
import { createClipboardModel, matches } from './model.ts';
import { emoji, kaomoji, kaomojiTabs } from './catalog.js';
import { t } from './locale.js';
import { loadSystemEmoji } from './system-emoji.js';
import { animateOnHover } from './gif-hover.js';
import { createKlipy } from './klipy.js';

const TABS = [
  ['history', 'Histórico', 'document-open-recent'],
  ['pinned', 'Fixados', 'nc-bookmark'],
  ['emoji', 'Emojis', 'nc-sparkle-face'],
  ['kaomoji', 'Kaomojis', 'emote-love'],
  ['gif', 'GIFs', 'video-x-generic'],
];

const HELP = {
  history: 'Copie um texto em qualquer app para vê-lo aqui.',
  pinned: 'Use Fixar no histórico para guardar um texto entre sessões.',
  gif: 'Os GIFs do Klipy aparecem aqui.',
};

const PAGE_SIZE = 72;
const GIF_COLUMNS = 3;
const GIF_PAGE_SIZE = 12;
const GIF_PREVIEW_SIZE = 112;
const CLIPBOARD = St.ClipboardType.CLIPBOARD;
const SELECTION = Meta.SelectionType.SELECTION_CLIPBOARD;

function iconButton(name, label, action, style = '') {
  const icon = new St.Icon({ icon_name: `${name}-symbolic`, icon_size: 17 });
  const widget = new St.Button({
    child: icon, accessible_name: t(label), style_class: `nc-button nc-icon ${style}`, can_focus: true,
  });
  widget.connect('clicked', action);
  return widget;
}

function line(text, style = '') {
  const label = new St.Label({ text, style_class: style });
  label.clutter_text.ellipsize = Pango.EllipsizeMode.END;
  return label;
}

export default class ClipboardExtension extends Extension {
  enable() {
    this.settings = this.getSettings();
    this.model = createClipboardModel(this.settings.get_strv('pinned'));
    this.clipboard = St.Clipboard.get_default();
    this.selection = global.display.get_selection();
    this.clipboardRead = (this.clipboardRead ?? 0) + 1;
    this.gifs = signal([]);
    this.page = signal(0);
    this.kaomojiTab = signal('all');
    this.feedback = signal('');
    this.klipy = createKlipy();
    this.emojis = signal(emoji.map(([value, title]) => [value, t(title), title]));
    const emojiLoad = this.emojiLoad = new Gio.Cancellable();
    loadSystemEmoji(emojiLoad).then(entries => {
      if (!emojiLoad.is_cancelled() && entries.length) this.emojis.set(entries);
    }).catch(() => {
      // Keep the built-in catalog on systems without GTK emoji data.
    });

    this.indicator = new PanelMenu.Button(0.5, t('Área de transferência'));
    this.indicator.add_child(new St.Icon({
      icon_name: 'edit-paste-symbolic', style_class: 'system-status-icon',
    }));
    Main.panel.addToStatusArea(this.uuid, this.indicator);
    this.buildPanel();

    this.selectionHandler = this.selection.connect('owner-changed', (_selection, type, owner) => {
      if (type !== SELECTION) return;
      const read = ++this.clipboardRead;
      if (!owner || this.model.paused() || Main.sessionMode.isLocked) return;
      const types = owner.get_mimetypes();
      if (types.some(type => /password|secret|sensitive|concealed|x-kde-passwordmanagerhint/i.test(type))) return;
      this.clipboard.get_text(CLIPBOARD, (_clipboard, text) => {
        if (this.model && read === this.clipboardRead && !Main.sessionMode.isLocked)
          this.model.remember(text);
      });
    });
    Main.wm.addKeybinding('open-clipboard', this.settings, Meta.KeyBindingFlags.NONE,
      Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW, () => this.indicator.menu.toggle());
  }

  buildPanel() {
    const section = new PopupMenu.PopupMenuSection();
    this.indicator.menu.addMenuItem(section);
    const panel = new St.BoxLayout({ orientation: Clutter.Orientation.VERTICAL, style_class: 'nc-panel' });
    section.box.add_child(panel);

    const header = new St.BoxLayout({ style_class: 'nc-header' });
    header.add_child(new St.Label({
      text: t('Área de transferência'), x_expand: true, y_align: Clutter.ActorAlign.CENTER,
      style_class: 'nc-title',
    }));
    const pause = iconButton('media-playback-pause', 'Pausar', () => {
      this.clipboardRead++;
      this.model.paused.set(!this.model.paused());
    });
    header.add_child(pause);
    panel.add_child(header);

    const tabs = new St.BoxLayout({ style_class: 'nc-tabs' });
    const tabButtons = TABS.map(([id, title, icon]) => {
      const widget = iconButton(icon, title, () => {
        this.cancelRequest();
        batch(() => {
          this.model.tab.set(id);
          this.page.set(0);
          this.gifs.set([]);
          this.feedback.set('');
        });
        this.search.set_text('');
        if (id === 'gif') this.searchGifs();
      }, 'nc-tab');
      if (icon.startsWith('nc-')) {
        const file = this.dir.get_child('icons').get_child(`${icon}-symbolic.svg`);
        widget.child.gicon = new Gio.FileIcon({ file });
      }
      widget.x_expand = true;
      tabs.add_child(widget);
      return [id, widget];
    });
    panel.add_child(tabs);

    this.search = new St.Entry({ hint_text: t('Filtrar itens'), can_focus: true, style_class: 'nc-search' });
    this.search.clutter_text.connect('text-changed', () => {
      this.cancelRequest();
      batch(() => {
        this.model.query.set(this.search.get_text());
        this.page.set(0);
        this.gifs.set([]);
        this.feedback.set('');
      });
      if (this.model.tab() === 'gif') {
        this.gifDebounce = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
          this.gifDebounce = 0;
          this.searchGifs();
          return GLib.SOURCE_REMOVE;
        });
      }
    });
    this.search.clutter_text.connect('activate', () => {
      if (this.model.tab() === 'gif') this.searchGifs();
    });
    panel.add_child(this.search);

    const moods = this.makeGrid();
    moods.grid.add_style_class_name('nc-moods');
    const moodButtons = kaomojiTabs.map(([id, title], index) => {
      const widget = new St.Button({
        label: t(title), can_focus: true, x_expand: true, style_class: 'nc-button nc-mood',
      });
      widget.connect('clicked', () => {
        batch(() => {
          this.kaomojiTab.set(id);
          this.page.set(0);
        });
        this.scroll.vadjustment.value = 0;
      });
      moods.layout.attach(widget, index % 4, Math.floor(index / 4), 1, 1);
      return [id, widget];
    });
    panel.add_child(moods.grid);

    const scroll = this.scroll = new St.ScrollView({ style_class: 'nc-scroll', overlay_scrollbars: true });
    scroll.set_policy(St.PolicyType.NEVER, St.PolicyType.AUTOMATIC);
    this.list = new St.BoxLayout({ orientation: Clutter.Orientation.VERTICAL, style_class: 'nc-list' });
    scroll.set_child(this.list);
    panel.add_child(scroll);

    const footer = new St.BoxLayout({ style_class: 'nc-footer' });
    const status = line('', 'nc-muted');
    status.x_expand = true;
    status.y_align = Clutter.ActorAlign.CENTER;
    footer.add_child(status);
    this.navigation = new St.BoxLayout({ style_class: 'nc-tabs' });
    footer.add_child(this.navigation);
    const clear = iconButton('edit-clear-all', 'Limpar histórico', () => {
      this.clipboardRead++;
      this.model.history.set([]);
    });
    footer.add_child(clear);
    panel.add_child(footer);

    this.effects = [
      effect(() => {
        const paused = this.model.paused();
        pause.accessible_name = t(paused ? 'Retomar' : 'Pausar');
        pause.child.icon_name = paused ? 'media-playback-start-symbolic' : 'media-playback-pause-symbolic';
        const tab = this.model.tab();
        for (const [id, widget] of tabButtons)
          widget.set_style_pseudo_class(id === tab ? 'checked' : '');
        moods.grid.visible = tab === 'kaomoji';
        if (tab === 'kaomoji') {
          const selected = this.kaomojiTab();
          for (const [id, widget] of moodButtons)
            widget.set_style_pseudo_class(id === selected ? 'checked' : '');
        }
        this.search.hint_text = t(tab === 'gif' ? 'Buscar no Klipy' : 'Filtrar itens');
        clear.visible = tab === 'history' && this.model.history().length > 0;
        status.text = this.feedback() || t(paused ? 'Captura pausada' : 'Selecione para copiar');
      }),
      effect(() => this.renderList()),
    ];

    this.indicator.menu.connect('open-state-changed', (_menu, open) => {
      if (open) {
        this.search.grab_key_focus();
        if (this.model.tab() === 'gif' && !this.gifs().length) this.searchGifs();
      }
      else {
        this.cancelRequest();
        this.feedback.set('');
      }
    });
  }

  renderList() {
    const tab = this.model.tab();
    const query = this.model.query();
    this.list.destroy_all_children();
    this.navigation.destroy_all_children();
    this.navigation.hide();

    if (tab === 'history' || tab === 'pinned') {
      const items = this.model.items();
      for (const text of items) {
        const preview = text.replace(/\s+/g, ' ').trim();
        this.addRow(preview, () => this.copyText(text), tab === 'pinned' ? 'Desafixar' : 'Fixar', () => {
          this.model.togglePin(text);
          if (!this.settings.set_strv('pinned', this.model.pinned()))
            this.feedback.set(t('O GNOME não conseguiu salvar os itens fixados.'));
        });
      }
      if (!items.length) this.addHint(t(query.trim() ? 'Nenhum texto corresponde à busca.' : HELP[tab]));
      return;
    }

    if (tab === 'gif') {
      const results = this.gifs();
      if (!results.length) {
        this.addHint(t(HELP.gif));
        return;
      }
      const page = this.page();
      const { grid, layout } = this.makeGrid();
      results.slice(page * GIF_PAGE_SIZE, (page + 1) * GIF_PAGE_SIZE)
        .forEach((gif, index) => layout.attach(this.gifTile(gif), index % GIF_COLUMNS, Math.floor(index / GIF_COLUMNS), 1, 1));
      this.list.add_child(grid);
      this.renderPages(page, Math.ceil(results.length / GIF_PAGE_SIZE));
      return;
    }

    const isEmoji = tab === 'emoji';
    const mood = isEmoji ? 'all' : this.kaomojiTab();
    const results = (isEmoji ? this.emojis() : kaomoji).filter(([value, title, keywords = '', groups]) =>
      (mood === 'all' || groups.has(mood)) && matches(`${value} ${title} ${keywords}`, query));
    if (!results.length) {
      this.addHint(t('Nenhum resultado para esse termo.'));
      return;
    }

    const page = this.page();
    const columns = isEmoji ? 8 : 4;
    const { grid, layout } = this.makeGrid();
    results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).forEach(([value, title], index) => {
      const label = line(value.replace(/\n/g, ' ↵ '));
      label.clutter_text.single_line_mode = true;
      const tile = new St.Button({
        child: label, can_focus: true, x_expand: true,
        accessible_name: t('Copiar {item}', { item: isEmoji ? title : value }),
        style_class: isEmoji ? 'nc-button nc-emoji' : 'nc-button nc-kaomoji',
      });
      tile.connect('clicked', () => this.copyText(value));
      layout.attach(tile, index % columns, Math.floor(index / columns), 1, 1);
    });
    this.list.add_child(grid);

    this.renderPages(page, Math.ceil(results.length / PAGE_SIZE));
  }

  makeGrid() {
    const layout = new Clutter.GridLayout({ column_homogeneous: true, column_spacing: 4, row_spacing: 4 });
    return { grid: new St.Widget({ layout_manager: layout, x_expand: true }), layout };
  }

  gifTile(gif) {
    const icon = new St.Icon({ icon_name: 'video-x-generic-symbolic', icon_size: GIF_PREVIEW_SIZE });
    const preview = new St.Widget({ layout_manager: new Clutter.BinLayout(), width: GIF_PREVIEW_SIZE, height: GIF_PREVIEW_SIZE });
    preview.add_child(icon);
    const tile = new St.Button({
      child: preview, can_focus: true, x_expand: true, style_class: 'nc-button nc-gif',
      accessible_name: t('Copiar {item}', { item: gif.title }),
    });
    tile.connect('clicked', () => this.copyGif(gif));
    if (gif.animation)
      animateOnHover(tile, preview, icon, request => this.klipy.animation(gif.animation, request));
    return tile;
  }

  renderPages(page, pages) {
    if (pages > 1) {
      const navigation = this.navigation;
      const changePage = offset => {
        this.page.set(page + offset);
        this.scroll.vadjustment.value = 0;
        this.search.grab_key_focus();
      };
      if (page > 0) navigation.add_child(iconButton('go-previous', 'Página anterior', () => changePage(-1)));
      const counter = line(`${page + 1} / ${pages}`);
      counter.y_align = Clutter.ActorAlign.CENTER;
      navigation.add_child(counter);
      if (page + 1 < pages) navigation.add_child(iconButton('go-next', 'Próxima página', () => changePage(1)));
      navigation.show();
    }
  }

  addHint(text) {
    const label = line(text, 'nc-empty nc-muted');
    label.clutter_text.line_wrap = true;
    label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
    this.list.add_child(label);
  }

  addRow(text, action, secondary, secondaryAction) {
    const row = new St.BoxLayout({ style_class: 'nc-row' });
    const label = line(text);
    label.x_align = Clutter.ActorAlign.START;
    const copy = new St.Button({
      child: label, accessible_name: t('Copiar {item}', { item: text.slice(0, 100) }),
      style_class: 'nc-button nc-copy', x_expand: true, can_focus: true,
    });
    copy.connect('clicked', action);
    row.add_child(copy);
    if (secondary) {
      const pin = iconButton(secondary === 'Fixar' ? 'non-starred' : 'starred', secondary, secondaryAction);
      pin.accessible_name = t('{action} {item}', { action: t(secondary), item: text.slice(0, 100) });
      row.add_child(pin);
    }
    this.list.add_child(row);
  }

  copyText(text) {
    this.clipboard.set_text(CLIPBOARD, text);
    this.indicator.menu.close();
  }

  cancelRequest() {
    if (this.gifDebounce) GLib.source_remove(this.gifDebounce);
    this.gifDebounce = 0;
    this.request?.cancel();
    this.request = null;
  }

  async searchGifs() {
    this.cancelRequest();
    const key = this.settings.get_string('klipy-key').trim();
    const query = this.model.query().trim();
    if (!key) {
      this.feedback.set(t('Configure a chave do Klipy primeiro.'));
      return;
    }
    const request = this.request = new Gio.Cancellable();
    batch(() => {
      this.page.set(0);
      this.gifs.set([]);
    });
    this.feedback.set(t('Buscando GIFs…'));
    try {
      const results = await this.klipy.search(key, query.slice(0, 120), request);
      if (request.is_cancelled()) return;
      this.gifs.set(results);
      this.feedback.set(results.length ? t('{count} resultados · Klipy', { count: results.length }) : t('Nenhum GIF encontrado.'));
    } catch {
      if (!request.is_cancelled()) this.feedback.set(t('A busca no Klipy falhou.'));
    }
  }

  async copyGif(gif) {
    this.cancelRequest();
    const request = this.request = new Gio.Cancellable();
    this.feedback.set(t('Baixando GIF…'));
    try {
      const bytes = await this.klipy.download(gif.url, request);
      if (request.is_cancelled()) return;
      this.clipboard.set_content(CLIPBOARD, 'image/gif', bytes);
      this.indicator.menu.close();
    } catch {
      if (!request.is_cancelled()) this.feedback.set(t('Não foi possível baixar o GIF.'));
    }
  }

  disable() {
    Main.wm.removeKeybinding('open-clipboard');
    if (this.selectionHandler) this.selection.disconnect(this.selectionHandler);
    this.selectionHandler = 0;
    this.cancelRequest();
    this.emojiLoad?.cancel();
    this.klipy?.close();
    for (const handle of this.effects ?? []) handle.dispose();
    this.effects = [];
    this.indicator?.destroy();
    this.indicator = this.model = this.settings = this.selection = this.clipboard = null;
    this.klipy = this.search = this.list = this.scroll = this.navigation = null;
  }
}
