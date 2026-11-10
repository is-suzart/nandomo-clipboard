import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

Gio._promisify(Soup.Session.prototype, 'send_async', 'send_finish');
Gio._promisify(Gio.InputStream.prototype, 'read_bytes_async', 'read_bytes_finish');

const MEDIA_ORIGIN = /^https:\/\/static[2]?\.klipy\.com\//i;
const GIF_LIMIT = 8 * 1024 * 1024;

export function createKlipy() {
  const session = new Soup.Session({ timeout: 15 });

  async function read(url, limit, cancellable, acceptedType) {
    const message = Soup.Message.new('GET', url);
    message.set_flags(Soup.MessageFlags.NO_REDIRECT);
    const stream = await session.send_async(message, GLib.PRIORITY_DEFAULT, cancellable);
    const chunks = [];
    let length = 0;
    try {
      if (message.status_code !== 200)
        throw new Error(`Klipy retornou HTTP ${message.status_code}.`);
      if (message.response_headers.get_content_type()[0] !== acceptedType)
        throw new Error('O Klipy devolveu um formato inesperado.');
      while (true) {
        const bytes = await stream.read_bytes_async(65536, GLib.PRIORITY_DEFAULT, cancellable);
        if (!bytes.get_size()) break;
        length += bytes.get_size();
        if (length > limit) throw new Error('O arquivo excede o limite de tamanho.');
        chunks.push(bytes.get_data());
      }
    } finally {
      stream.close(null);
    }
    const data = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.length;
    }
    return data;
  }

  async function search(key, query, cancellable) {
    const endpoint = query ? 'search' : 'featured';
    const url = `https://api.klipy.com/v2/${endpoint}`
      + `?key=${encodeURIComponent(key)}${query ? `&q=${encodeURIComponent(query)}` : ''}`
      + '&country=BR&locale=pt_BR&contentfilter=high&media_filter=gif,mediumgif,tinygif&limit=48';
    const data = await read(url, 512 * 1024, cancellable, 'application/json');
    const { results } = JSON.parse(new TextDecoder().decode(data));
    if (!Array.isArray(results)) throw new Error('O Klipy devolveu uma resposta inesperada.');
    return results.flatMap(result => {
      const media = [result.media_formats?.mediumgif, result.media_formats?.gif]
        .find(file => file && MEDIA_ORIGIN.test(file.url) && (!file.size || file.size <= GIF_LIMIT));
      const preview = [result.media_formats?.tinygif, media].find(file =>
        file && MEDIA_ORIGIN.test(file.url) && file.size <= 2 * 1024 * 1024 &&
        file.dims?.length === 2 && file.dims.every(size => size > 0 && size <= 384));
      return media ? [{
        title: String(result.title || 'GIF').slice(0, 120),
        url: media.url,
        animation: preview?.url,
      }] : [];
    }).slice(0, 48);
  }

  async function download(url, cancellable) {
    if (!MEDIA_ORIGIN.test(url)) throw new Error('Origem do GIF inválida.');
    const data = await read(url, GIF_LIMIT, cancellable, 'image/gif');
    if (!/^GIF8[79]a$/.test(new TextDecoder().decode(data.subarray(0, 6))))
      throw new Error('O arquivo recebido não é um GIF.');
    return new GLib.Bytes(data);
  }

  async function animation(url, cancellable) {
    if (!MEDIA_ORIGIN.test(url)) throw new Error('Origem da prévia inválida.');
    const data = await read(url, 2 * 1024 * 1024, cancellable, 'image/gif');
    const width = data[6] | data[7] << 8;
    const height = data[8] | data[9] << 8;
    if (!/^GIF8[79]a$/.test(new TextDecoder().decode(data.subarray(0, 6))) ||
        !width || !height || width > 384 || height > 384)
      throw new Error('GIF fora dos limites da prévia.');
    return new GLib.Bytes(data);
  }

  return { search, download, animation, close: () => session.abort() };
}
