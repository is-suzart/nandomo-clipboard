# Nandomo Clipboard para GNOME Shell

O ícone na barra superior abre o painel. Para usar **Super+Shift+V**, ative o atalho nas preferências da extensão. A extensão observa alterações de texto no clipboard Wayland. Selecione um item para copiá-lo e cole no app de destino com o atalho habitual. **Fixar** move um texto para a aba **Fixados**. **Desafixar** devolve ao histórico da sessão.

O histórico guarda até 60 textos distintos em memória. Só os fixados persistem nas configurações locais do GNOME. **Pausar** interrompe a captura e **Limpar histórico** esvazia a lista da sessão. A extensão ignora seleções com marcadores MIME conhecidos de conteúdo sensível. Use a pausa para dados sensíveis em apps que não fornecem esses marcadores.

Emojis e kaomojis são pesquisáveis e funcionam offline. Para GIFs, abra as preferências da extensão, informe sua chave do [Klipy](https://klipy.com/developers) e abra a aba **GIFs** para ver os destaques. A busca atualiza enquanto você digita. O grid mostra três colunas e até doze prévias por página, preserva a proporção do GIF e anima cada prévia ao passar o mouse e copia o GIF animado em formato `image/gif`. O app de destino precisa aceitar colagem nesse formato.

## Build e instalação

Quem instala pode baixar o ZIP nas [releases](https://github.com/is-suzart/nandomo-clipboard/releases). Para compilar, use um checkout do Nandomo em `../nandomo` ou informe o caminho em `NANDOMO_DIR`:

```sh
pnpm --dir "${NANDOMO_DIR:-../nandomo}" install --frozen-lockfile
bash build.sh
gnome-extensions install --force dist/nandomo-clipboard@is-suzart.shell-extension.zip
```

Em uma sessão Wayland, saia da sessão e entre novamente para o Shell detectar uma instalação nova. Depois:

```sh
gnome-extensions enable nandomo-clipboard@is-suzart
gnome-extensions prefs nandomo-clipboard@is-suzart
```

O build agrupa o core do Nandomo com a extensão. Signals, computed, batch e effects controlam as abas, o filtro, a lista e o estado de captura. A UI é montada com St dentro do GNOME Shell e usa as APIs nativas de clipboard e teclado. O alvo é GNOME Shell 51.

## Catálogo e idioma

O catálogo inclui 1.708 kaomojis únicos do [Kaomojikan](https://github.com/kaomojikan/kaomoji-data), versão `60c92ea4e85279ad42ff525e9a40464ebeb1003e`, sob licença MIT. As abas filtram por expressão ou tema. A busca funciona offline e considera as categorias em português e inglês, além das etiquetas e leituras japonesas do catálogo.

O GJS consulta o idioma da sessão com `GLib.get_language_names()` e passa o locale para o tradutor do Nandomo. O painel e as preferências usam português para locales `pt` e inglês nos demais. Novos idiomas entram como catálogos em `src/locale.js`.

O seletor inclui 3.944 sequências do [Unicode Emoji 17.0](https://www.unicode.org/Public/17.0.0/emoji/emoji-test.txt), com a licença em `vendor/UNICODE-LICENSE`. Recursos de idioma instalados pelo GTK 4 acrescentam nomes e palavras-chave traduzidos quando disponíveis.

## Publicação no GNOME Extensions

Gere o ZIP com `bash build.sh`, teste em um perfil limpo do GNOME Shell 51 e envie pelo [formulário do GNOME Extensions](https://extensions.gnome.org/upload/). A submissão deve ser revisada pelo mantenedor antes de ser enviada. Consulte as [regras de revisão](https://gjs.guide/extensions/review-guidelines/review-guidelines.html).

O código da extensão e os trechos do core incluídos no ZIP usam BSD-3-Clause. O catálogo Kaomojikan mantém sua licença MIT em `vendor/LICENSE`.
