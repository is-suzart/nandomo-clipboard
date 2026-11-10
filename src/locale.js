import GLib from 'gi://GLib';
import { createTranslator } from '../../../packages/core/src/i18n.js';

const en = {
  'Todos': 'All', 'Feliz': 'Happy', 'Triste': 'Sad', 'Raiva': 'Angry',
  'Choro': 'Crying', 'Gatos': 'Cats', 'Outros': 'Other',
  'Área de transferência': 'Clipboard',
  'Histórico': 'History', 'Fixados': 'Pinned', 'Emojis': 'Emoji',
  'Pausar': 'Pause', 'Retomar': 'Resume', 'Fixar': 'Pin', 'Desafixar': 'Unpin',
  'Copiar {item}': 'Copy {item}', '{action} {item}': '{action} {item}',
  'Limpar histórico': 'Clear history',
  'Filtrar itens': 'Filter items', 'Buscar no Klipy': 'Search Klipy',
  'Captura pausada': 'Capture paused', 'Selecione para copiar': 'Select to copy',
  'Copie um texto em qualquer app para vê-lo aqui.': 'Copy text in any app to see it here.',
  'Use Fixar no histórico para guardar um texto entre sessões.': 'Pin text from History to keep it between sessions.',
  'Os GIFs do Klipy aparecem aqui.': 'Klipy GIFs appear here.',
  'O GNOME não conseguiu salvar os itens fixados.': 'GNOME could not save pinned items.',
  'Nenhum texto corresponde à busca.': 'No text matches your search.',
  'Nenhum resultado para esse termo.': 'No matches for this search.',
  'Configure a chave do Klipy primeiro.': 'Set up your Klipy API key first.',
  'Buscando GIFs…': 'Searching for GIFs…', 'Baixando GIF…': 'Downloading GIF…',
  'Nenhum GIF encontrado.': 'No GIFs found.', '{count} resultados · Klipy': '{count} results · Klipy',
  'A busca no Klipy falhou.': 'The Klipy search failed.',
  'Não foi possível baixar o GIF.': 'Could not download the GIF.',
  'Página anterior': 'Previous page', 'Próxima página': 'Next page',
  'GIFs do Klipy': 'Klipy GIFs', 'Chave de API do Klipy': 'Klipy API key',
  'A busca envia o termo digitado ao Klipy. A chave é salva nas configurações locais do GNOME.':
    'Your search terms are sent to Klipy. Your API key is saved in local GNOME settings.',
  'Sorriso': 'Smile', 'Rindo de chorar': 'Tears of joy', 'Gargalhada': 'Laughing',
  'Emocionado': 'Holding back tears', 'Apaixonado': 'In love', 'Carinho': 'Affection',
  'Óculos escuros': 'Sunglasses', 'Pensando': 'Thinking', 'Alívio': 'Relief',
  'Chorando': 'Crying', 'De ponta-cabeça': 'Upside down', 'Sono': 'Sleep',
  'Continência': 'Salute', 'Surpresa': 'Surprise', 'Comemoração': 'Celebration',
  'Palmas': 'Clapping', 'Positivo': 'Thumbs up', 'Negativo': 'Thumbs down',
  'Aceno': 'Wave', 'Obrigado': 'Thank you', 'Acordo': 'Handshake', 'Força': 'Strength',
  'Coração': 'Heart', 'Brilho': 'Sparkles', 'Fogo': 'Fire', 'Festa': 'Party',
  'Foguete': 'Rocket', 'Confirmado': 'Confirmed', 'Erro': 'Error', 'Olhos': 'Eyes',
  'Caveira': 'Skull', 'Gato': 'Cat', 'Cachorro': 'Dog', 'Café': 'Coffee',
  'Pizza': 'Pizza', 'Arco-íris': 'Rainbow',
};

export const { t } = createTranslator({
  catalogs: { pt: {}, en },
  locale: GLib.get_language_names()[0],
  fallback: 'en',
  source: 'pt',
});
