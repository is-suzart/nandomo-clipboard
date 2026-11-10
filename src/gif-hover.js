import Clutter from 'gi://Clutter';
import Cogl from 'gi://Cogl';
import GdkPixbuf from 'gi://GdkPixbuf';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';

export function animateOnHover(tile, preview, placeholder, load) {
  const actor = new St.Widget({ visible: false, width: preview.width, height: preview.height, content_gravity: Clutter.ContentGravity.RESIZE_ASPECT });
  preview.add_child(actor);
  let request;
  let timer = 0;
  let animation;
  let still;

  function stop() {
    if (timer) GLib.source_remove(timer);
    timer = 0;
    if (still) actor.content = still;
  }

  function frameContent(frame) {
    const width = frame.get_width();
    const height = frame.get_height();
    const context = global.stage.get_context().get_backend().get_cogl_context();
    const content = St.ImageContent.new_with_preferred_size(width, height);
    content.set_data(context, frame.get_pixels(),
      frame.get_has_alpha() ? Cogl.PixelFormat.RGBA_8888 : Cogl.PixelFormat.RGB_888,
      width, height, frame.get_rowstride());
    return content;
  }

  function play() {
    if (!still || animation.is_static_image()) return;
    stop();
    const iter = animation.get_iter(null);
    function schedule() {
      const delay = iter.get_delay_time();
      if (delay < 0) return;
      timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, Math.max(40, delay), () => {
        timer = 0;
        try {
          if (iter.advance(null)) actor.content = frameContent(iter.get_pixbuf());
          schedule();
        } catch {
          stop();
        }
        return GLib.SOURCE_REMOVE;
      });
    }
    schedule();
  }

  async function prepare() {
    if (still || request) return;
    const current = request = new Gio.Cancellable();
    try {
      const bytes = await load(current);
      if (current.is_cancelled()) return;
      const stream = Gio.MemoryInputStream.new_from_bytes(bytes);
      animation = GdkPixbuf.PixbufAnimation.new_from_stream(stream, current);
      still = frameContent(animation.get_static_image());
      actor.content = still;
      placeholder.hide();
      actor.show();
      if (tile.hover) play();
    } catch {
      // Keep the copy action usable if loading a preview fails.
    } finally {
      if (request === current) request = null;
    }
  }

  function release() {
    request?.cancel();
    request = null;
    stop();
  }

  tile.connect('notify::hover', () => {
    if (tile.hover && tile.mapped) play();
    else stop();
  });
  tile.connect('notify::mapped', () => {
    if (tile.mapped) prepare();
    else release();
  });
  tile.connect('destroy', release);
}
