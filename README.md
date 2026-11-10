# Nandomo Clipboard para GNOME Shell

O ícone na barra superior e **Super+Shift+V** abrem o painel. A extensão observa alterações de texto no clipboard Wayland. Selecione um item para copiá-lo e cole no app de destino com o atalho habitual. **Fixar** move um texto para a aba **Fixados**. **Desafixar** devolve ao histórico da sessão.

O histórico guarda até 60 textos distintos em memória. Só os fixados persistem nas configurações locais do GNOME. **Pausar** interrompe a captura e **Limpar histórico** esvazia a lista da sessão. A extensão ignora seleções com marcadores MIME conhecidos de conteúdo sensível. Use a pausa para dados sensíveis em apps que não fornecem esses marcadores.

Emojis e kaomojis são pesquisáveis e funcionam offline. Para GIFs, abra as preferências da extensão, informe sua chave do [Klipy](https://klipy.com/developers) e abra a aba **GIFs** para ver os destaques. A busca atualiza enquanto você digita. O grid mostra três colunas e até doze prévias por página, preserva a proporção do GIF e anima cada prévia ao passar o mouse e copia o GIF animado em formato `image/gif`. O app de destino precisa aceitar colagem nesse formato.

## Build e instalação

O build atual usa o checkout privado do Nandomo. Com acesso a ele, copie os arquivos deste repositório para `examples/clipboard-gnome` dentro do Nandomo e rode, a partir da raiz:

```sh
pnpm install --frozen-lockfile
cd examples/clipboard-gnome
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

O seletor de emojis reaproveita os dados do GTK 4 instalado, com nomes e palavras-chave do idioma da sessão quando disponíveis. No CachyOS, os recursos traduzidos ficam em `/usr/share/gtk-4.0/emoji`, e o inglês vem da biblioteca `/usr/lib/libgtk-4.so.1`. Se esses dados não puderem ser lidos, a extensão usa o catálogo básico embutido.


## Publicação no GNOME Extensions

Este repositório publica o código da extensão. O core do Nandomo e o ZIP que o incorpora dependem de autorização e licença para redistribuição.

Antes da submissão, definir uma licença GPL compatível para a extensão, confirmar a licença do core, remover o atalho padrão de interação com o clipboard e revisar o uso de `gresource` como subprocesso. Testar instalação e remoção em uma sessão GNOME Shell 51 limpa. Depois, enviar o ZIP criado pelo `build.sh` no [formulário do GNOME Extensions](https://extensions.gnome.org/upload/) e aguardar a revisão. Consulte as [regras de revisão](https://gjs.guide/extensions/review-guidelines/review-guidelines.html).
