# Pipeline de Storage e Processamento de Imagens

Este documento explica como o Wolfgang gerencia as imagens associadas às notícias coletadas, desde o download até a otimização e armazenamento final.

## 📂 Estrutura do Bucket
Todas as imagens otimizadas são salvas no bucket público **`Midia`**. O caminho de armazenamento segue a convenção:
`Imagens/{YYYY}/{MM}/{DD}/{hash_16_caracteres}.webp`

Isso previne a criação de um único diretório com milhões de arquivos, dividindo-os por data, e garante URLs únicas, porém determinísticas.

## 🔄 Fluxo da Função `process-image`

A Edge Function `process-image` atua como o motor de download e otimização. Ela foi projetada para ser idempotente e segura.

**1. Validação e Download**:
Recebe a URL pública original e tenta baixá-la, ignorando arquivos que não sejam imagem ou maiores que 8 MB, num prazo máximo de 20 segundos.

**2. Hashing (SHA-256)**:
Calcula o hash do arquivo original cru. Este hash se torna a "impressão digital" da imagem.

**3. Deduplicação**:
Verifica na tabela `media_assets` se esse hash já existe. Se existir, o processamento para imediatamente e a imagem já existente no bucket é retornada, poupando CPU e Storage.

**4. Otimização (Wasm)**:
Caso seja inédita, a imagem é decodificada e redimensionada para, no máximo, 1920 pixels de largura (mantendo a proporção). Finalmente, ela é encodada no formato `WebP` (qualidade 82).

**5. Upload e Registro**:
A imagem otimizada sobe para o Supabase Storage. Em seguida, as informações de resolução, tamanho e formato são registradas na tabela `media_assets`.

**6. Vinculação**:
Se a chamada incluir o ID de uma notícia (`news_item_id`), o registro da tabela `news_items` será atualizado com uma Chave Estrangeira (`image_asset_id`) apontando para o Asset processado.

## 📊 Limpeza de Órfãos (Cleanup)
Quando um feed é deletado, ou quando uma notícia troca de imagem, a Trigger no banco decrementa a coluna `reference_count` do respectivo `media_asset`. 

Periodicamente, é possível rodar `SELECT * FROM cleanup_orphan_assets(7)` para listar os arquivos com referência "0" criados há mais de 7 dias, garantindo que podemos apagá-los com segurança do Storage para liberar espaço de discos mortos.

## 🧪 Como invocar a Edge Function

Você pode testar o motor independentemente usando CURL. Certifique-se de usar sua `anon_key` do Supabase no cabeçalho de autorização.

```bash
curl -X POST 'https://atkstqfnwdbwhplukkiq.supabase.co/functions/v1/process-image' \
  -H "Authorization: Bearer <SUA_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
        "image_url": "https://s2-g1.glbimg.com/imagem_exemplo.jpg"
      }'
```
