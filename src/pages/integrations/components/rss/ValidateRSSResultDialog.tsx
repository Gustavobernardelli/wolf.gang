import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2, XCircle, AlertTriangle, Clock, Image, FileText,
  ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import type { ValidationResult } from '@/types/feedSource';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  result: ValidationResult | null;
  feedName?: string;
}

const COMPAT_CONFIG = {
  full: { label: 'Compatibilidade Total', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  partial: { label: 'Compatibilidade Parcial', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  poor: { label: 'Compatibilidade Insuficiente', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
};

const FIELD_LABELS: Record<string, string> = {
  title: 'Título', link: 'Link/URL', published_at: 'Data de publicação',
  description: 'Descrição', image_url: 'Imagem de capa', author: 'Autor', categories: 'Categorias',
};

const FIELD_COLUMN_MAP: Record<string, { column: string; required: boolean; impact: string }> = {
  title:        { column: 'news_items.title',        required: true,  impact: 'Obrigatório — notícias sem título serão rejeitadas pelo coletor' },
  link:         { column: 'news_items.link',         required: true,  impact: 'Obrigatório — notícias sem URL serão rejeitadas pelo coletor' },
  published_at: { column: 'news_items.published_at', required: true,  impact: 'Obrigatório — notícias sem data serão rejeitadas pelo coletor' },
  description:  { column: 'news_items.description',  required: false, impact: 'Resumo/descrição ficará vazio na notícia' },
  image_url:    { column: 'news_items.image_url',    required: false, impact: 'Sem imagem de capa — geração de artes ficará limitada' },
  author:       { column: 'news_items.author',       required: false, impact: 'Campo autor ficará vazio' },
  categories:   { column: 'news_items.categories',   required: false, impact: 'Array de categorias ficará vazio (text[])' },
};

const ERROR_CODE_LABELS: Record<string, { title: string; detail: string }> = {
  unauthorized:       { title: 'Sessão expirada ou credenciais inválidas', detail: 'Faça login novamente. Se o problema persistir, verifique a chave anon no arquivo .env e as políticas RLS da função.' },
  forbidden:          { title: 'Permissão negada', detail: 'A Edge Function não tem permissão para executar. Verifique as políticas RLS e os roles configurados no Supabase.' },
  function_not_found: { title: 'Edge Function não deployada', detail: 'A função validate-rss-feed não foi encontrada. Execute o deploy via CLI: supabase functions deploy validate-rss-feed' },
  server_error:       { title: 'Erro interno na Edge Function', detail: 'Acesse Supabase Dashboard → Edge Functions → validate-rss-feed → Logs para ver o erro completo.' },
  server_unavailable: { title: 'Serviço temporariamente indisponível', detail: 'O servidor Supabase está indisponível. Aguarde alguns instantes e tente novamente.' },
  network_error:      { title: 'Falha de conexão', detail: 'Não foi possível conectar ao servidor. Verifique sua conexão e o endereço VITE_SUPABASE_URL no .env.' },
  empty_response:     { title: 'Resposta vazia do servidor', detail: 'O servidor respondeu sem conteúdo. Verifique os logs da Edge Function no painel do Supabase.' },
  invalid_response:   { title: 'Resposta inválida', detail: 'O servidor retornou uma resposta que não é JSON válido. A Edge Function pode estar com erro de sintaxe.' },
  invalid_url:        { title: 'URL inválida', detail: 'A URL informada não é válida. Use apenas URLs que começam com http:// ou https://.' },
  timeout:            { title: 'Timeout na requisição', detail: 'O feed demorou mais de 15 segundos para responder. O servidor pode estar lento ou a URL pode estar incorreta.' },
  http_error:         { title: 'Erro HTTP ao acessar o feed', detail: 'O servidor do feed retornou um código de erro. Verifique se a URL está correta e acessível.' },
  source_not_found:   { title: 'Fonte não encontrada', detail: 'O ID da fonte RSS informado não existe no banco de dados.' },
  missing_params:     { title: 'Parâmetros ausentes', detail: 'A requisição não incluiu URL ou feed_source_id. Isso é um erro de integração — reporte ao suporte.' },
  client_error:       { title: 'Erro no cliente', detail: 'Ocorreu um erro inesperado no navegador ao processar a resposta.' },
};

const IMAGE_STRATEGY_LABELS: Record<string, string> = {
  media_content: 'media:content (padrão G1)',
  enclosure: 'enclosure (podcast/RSS padrão)',
  html_parse: 'img tag no HTML da descrição (padrão UOL)',
  none: 'Nenhuma imagem detectada',
};

export function ValidateRSSResultDialog({ open, onOpenChange, result, feedName }: Props) {
  const [showRaw, setShowRaw] = useState(false);
  if (!result) return null;

  const sc = result.schema_check;
  const compatConfig = sc ? COMPAT_CONFIG[sc.estimated_compatibility] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {result.ok
              ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              : <XCircle className="w-5 h-5 text-rose-400" />}
            Resultado da Validação
            {feedName && <span className="text-zinc-400 font-normal text-sm">— {feedName}</span>}
          </DialogTitle>
        </DialogHeader>

        {/* Error state */}
        {!result.ok && (() => {
          const errInfo = result.error_code ? ERROR_CODE_LABELS[result.error_code] : undefined;
          return (
            <div className="space-y-3">
              <Alert className="bg-rose-500/10 border-rose-500/30">
                <XCircle className="w-4 h-4 text-rose-400" />
                <AlertDescription className="text-rose-300 space-y-1">
                  <p className="font-semibold">{errInfo?.title ?? 'Falha na validação'}</p>
                  <p className="text-sm text-rose-300/80">{errInfo?.detail ?? result.error_message}</p>
                  {result.http_status && (
                    <p className="font-mono text-xs text-rose-400/70 mt-1">HTTP {result.http_status} · código: {result.error_code}</p>
                  )}
                  {!result.http_status && result.error_code && (
                    <p className="font-mono text-xs text-rose-400/70 mt-1">código: {result.error_code}</p>
                  )}
                </AlertDescription>
              </Alert>
              {errInfo?.detail !== result.error_message && result.error_message && (
                <p className="text-xs text-zinc-500 px-1">Mensagem original: {result.error_message}</p>
              )}
            </div>
          );
        })()}

        {/* Stats row */}
        {result.ok && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-zinc-400 text-xs mb-1">
                <Clock className="w-3 h-3" /> Resposta
              </div>
              <p className="text-white font-semibold">{result.response_time_ms}ms</p>
            </div>
            <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-zinc-400 text-xs mb-1">
                <FileText className="w-3 h-3" /> Itens
              </div>
              <p className="text-white font-semibold">{result.feed_meta?.items_count ?? 0}</p>
            </div>
            <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
              <div className="text-zinc-400 text-xs mb-1">HTTP</div>
              <p className={`font-semibold ${result.http_status === 200 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {result.http_status}
              </p>
            </div>
          </div>
        )}

        {/* Compatibility Card */}
        {sc && compatConfig && (
          <div className={`rounded-lg border p-4 ${compatConfig.bg}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className={`font-semibold ${compatConfig.color}`}>{compatConfig.label}</h4>
              <Badge variant="outline" className={`${compatConfig.color} border-current text-xs`}>
                {sc.estimated_compatibility.toUpperCase()}
              </Badge>
            </div>

            {/* Fields present */}
            {sc.fields_present.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-zinc-400 mb-1">Campos detectados:</p>
                <div className="flex flex-wrap gap-1.5">
                  {sc.fields_present.map((f) => (
                    <span key={f} className="flex items-center gap-1 text-xs bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> {FIELD_LABELS[f] || f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Fields missing */}
            {sc.fields_missing.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-zinc-400 mb-1">Campos ausentes no feed:</p>
                <div className="space-y-1.5">
                  {sc.fields_missing.map((f) => {
                    const col = FIELD_COLUMN_MAP[f];
                    return (
                      <div key={f} className={`rounded-md px-2.5 py-1.5 ${col?.required ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-zinc-700/40'}`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-medium ${col?.required ? 'text-rose-300' : 'text-zinc-300'}`}>
                            {FIELD_LABELS[f] || f}
                          </span>
                          {col && (
                            <span className="font-mono text-[10px] text-zinc-500">→ {col.column}</span>
                          )}
                          {col?.required && (
                            <span className="text-[10px] text-rose-400 font-semibold uppercase tracking-wide">obrigatório</span>
                          )}
                        </div>
                        {col && (
                          <p className="text-[11px] text-zinc-500 mt-0.5">{col.impact}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Image strategy */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-2">
              <Image className="w-3 h-3" />
              <span>Estratégia de imagem: <span className="text-zinc-300">{IMAGE_STRATEGY_LABELS[sc.image_extraction_strategy] || sc.image_extraction_strategy}</span></span>
            </div>

            {/* Warnings */}
            {sc.warnings.length > 0 && (
              <div className="mt-3 space-y-1">
                {sc.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-amber-300/80">
                    <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {w}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sample items */}
        {result.sample && result.sample.length > 0 && (
          <>
            <Separator className="bg-zinc-800" />
            <div>
              <h4 className="text-sm font-medium text-zinc-300 mb-2">Prévia dos itens coletados</h4>
              <div className="space-y-2">
                {result.sample.map((item, i) => (
                  <div key={i} className="flex gap-3 bg-zinc-800/40 rounded-lg p-3">
                    {item.image_url && (
                      <img src={item.image_url} alt="" className="w-16 h-12 object-cover rounded flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-200 font-medium line-clamp-2">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.published_at && (
                          <span className="text-xs text-zinc-500">{new Date(item.published_at).toLocaleString('pt-BR')}</span>
                        )}
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5">
                            <ExternalLink className="w-3 h-3" /> Abrir
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Raw JSON toggle */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRaw(!showRaw)}
            className="text-zinc-500 hover:text-zinc-300 text-xs gap-1"
          >
            {showRaw ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showRaw ? 'Ocultar' : 'Ver'} JSON bruto
          </Button>
          {showRaw && (
            <pre className="mt-2 p-3 bg-zinc-950 rounded-lg text-xs text-zinc-400 overflow-auto max-h-48 font-mono">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
