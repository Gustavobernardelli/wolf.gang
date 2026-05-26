# Wolfgang — Sistema de Mockups

O Wolfgang utiliza um sistema de templates visuais baseados em camadas PNG transparentes com regiões de texto dinâmicas.

## Fluxo de Criação

1.  **Fonte de Publicação**: Defina uma marca (ex: "Folha de Sarandi"). Cada fonte tem seu próprio diretório no Storage: `Mockups/{fonte_slug}/`.
2.  **Upload de Asset**: O mockup deve ser um arquivo **PNG com canal Alpha (transparência)**.
    *   O sistema valida se a imagem tem transparência.
    *   As dimensões devem bater (±2px) com as especificações do formato (ex: 1080x1080 para Feed).
3.  **Editor de Regiões**: No editor visual, você define as áreas onde o texto da notícia será renderizado.
    *   **Headline**: Título principal.
    *   **Kicker (Chapéu)**: Pequeno texto de categoria acima do título.
    *   **Credit**: Crédito da imagem ou autor.
4.  **Composição (Preview)**: O sistema sobrepõe:
    1.  Fundo (opcional)
    2.  Imagem da Notícia (slot)
    3.  Mockup PNG (camada superior)
    4.  Textos dinâmicos

## Formatos Suportados

| Formato | Resolução | Aspect Ratio | Uso Principal |
|---------|-----------|--------------|---------------|
| `feed_square` | 1080x1080 | 1:1 | Instagram/Facebook Feed |
| `feed_portrait`| 1080x1350 | 4:5 | Instagram Feed (Alto) |
| `reels` | 1080x1920 | 9:16 | Instagram Reels / TikTok |
| `stories` | 1080x1920 | 9:16 | Instagram Stories |
| `blog_cover` | 1200x630 | 1.91:1 | OpenGraph / WordPress |

## Armazenamento

Os arquivos são centralizados no bucket `Midia` e deduplicados por Hash.
Caminho físico: `Mockups/{fonte_slug}/{formato}/{uuid}.png`

## Edge Function: `upload-mockup`

Esta função processa o arquivo, extrai metadados e garante a integridade dos assets.
- **Validação PNG**: Assinatura mágica `0x89 50 4E 47`.
- **Canal Alpha**: Verifica o `Color Type` no chunk `IHDR` (deve ser 4 ou 6).
- **Dimensões**: Rejeita imagens fora do padrão do formato selecionado.
