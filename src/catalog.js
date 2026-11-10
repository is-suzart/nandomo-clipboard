import catalog from '../vendor/kaomoji.json';

export const emoji = [
  ['😀', 'Sorriso'], ['😂', 'Rindo de chorar'], ['🤣', 'Gargalhada'], ['🥹', 'Emocionado'],
  ['😍', 'Apaixonado'], ['🥰', 'Carinho'], ['😎', 'Óculos escuros'], ['🤔', 'Pensando'],
  ['😅', 'Alívio'], ['😭', 'Chorando'], ['🙃', 'De ponta-cabeça'], ['😴', 'Sono'],
  ['🫡', 'Continência'], ['🤯', 'Surpresa'], ['🙌', 'Comemoração'], ['👏', 'Palmas'],
  ['👍', 'Positivo'], ['👎', 'Negativo'], ['👋', 'Aceno'], ['🙏', 'Obrigado'],
  ['🤝', 'Acordo'], ['💪', 'Força'], ['❤️', 'Coração'], ['✨', 'Brilho'],
  ['🔥', 'Fogo'], ['🎉', 'Festa'], ['🚀', 'Foguete'], ['✅', 'Confirmado'],
  ['❌', 'Erro'], ['👀', 'Olhos'], ['💀', 'Caveira'], ['🐱', 'Gato'],
  ['🐶', 'Cachorro'], ['☕', 'Café'], ['🍕', 'Pizza'], ['🌈', 'Arco-íris'],
];

// Localized search aliases supplement the original Japanese tags and readings.
const categories = {
  aa: 'arte ascii art', animal: 'animal gato cachorro cat dog',
  bikkuri: 'surpresa surprise', chira: 'espiar peek', copype: 'texto text',
  cry: 'triste chorar sad cry', cute: 'fofo cute', egao: 'sorriso smile',
  emoji: 'emoji', kirakira: 'brilho sparkles', mogumogu: 'comer eating',
  nadenade: 'carinho abraço pet hug', nageru: 'jogar throw', nemui: 'sono sleepy',
  okoru: 'raiva angry', otaku: 'otaku', ouen: 'torcida cheer',
  ryosangata: 'fofo cute', suki: 'amor love', taoreru: 'desmaio faint',
  tehepero: 'travesso playful', tereru: 'vergonha shy', ureshii: 'feliz happy',
};

export const kaomojiTabs = [
  ['all', 'Todos'], ['happy', 'Feliz'], ['sad', 'Triste'], ['surprise', 'Surpresa'],
  ['angry', 'Raiva'], ['cry', 'Choro'], ['cat', 'Gatos'], ['other', 'Outros'],
];

const moodGroups = { ureshii: 'happy', egao: 'happy', bikkuri: 'surprise', okoru: 'angry', cry: 'cry' };
const entries = new Map();
for (const { text, tags, reading, categories: groups } of catalog) {
  const entry = entries.get(text) ?? { keywords: new Set(), moods: new Set() };
  for (const term of [...tags, ...reading, ...groups.map(group => categories[group] ?? group)])
    entry.keywords.add(term);
  for (const group of groups) {
    if (moodGroups[group]) entry.moods.add(moodGroups[group]);
  }
  if (tags.some(tag => ['しょんぼり', 'うつむき', 'がっくり', '悲しい'].includes(tag)))
    entry.moods.add('sad');
  if (tags.includes('ねこ') || reading.includes('ねこ')) entry.moods.add('cat');
  entries.set(text, entry);
}

export const kaomoji = [...entries]
  .sort(([left], [right]) => Number(left.includes('\n')) - Number(right.includes('\n')))
  .map(([value, { keywords, moods }]) => [
    value, [...keywords].join(' '), '', moods.size ? moods : new Set(['other']),
  ]);
