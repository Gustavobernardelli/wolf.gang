import { supabase } from '@/lib/supabase';
import type { ValidationResult } from '@/types/feedSource';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  };
}

const HTTP_ERROR_MESSAGES: Record<number, { code: string; message: string }> = {
  401: {
    code: 'unauthorized',
    message: 'Não autorizado (HTTP 401). A sessão pode ter expirado ou as credenciais do Supabase estão incorretas.',
  },
  403: {
    code: 'forbidden',
    message: 'Acesso negado (HTTP 403). Verifique as políticas RLS e as permissões da Edge Function.',
  },
  404: {
    code: 'function_not_found',
    message: 'Edge Function não encontrada (HTTP 404). A função validate-rss-feed pode não estar deployada no Supabase.',
  },
  500: {
    code: 'server_error',
    message: 'Erro interno no servidor (HTTP 500). Verifique os logs da Edge Function no painel do Supabase.',
  },
  503: {
    code: 'server_unavailable',
    message: 'Servidor indisponível (HTTP 503). Tente novamente em alguns instantes.',
  },
};

async function parseValidationResponse(res: Response): Promise<ValidationResult> {
  let text = '';
  try { text = await res.text(); } catch { /* ignore read error */ }

  if (!text.trim()) {
    const known = HTTP_ERROR_MESSAGES[res.status];
    return {
      ok: false,
      error_code: known?.code ?? 'empty_response',
      error_message: known?.message ?? `Servidor retornou resposta vazia (HTTP ${res.status}).`,
      http_status: res.status,
    };
  }

  try {
    return JSON.parse(text) as ValidationResult;
  } catch {
    const known = HTTP_ERROR_MESSAGES[res.status];
    return {
      ok: false,
      error_code: known?.code ?? 'invalid_response',
      error_message: known?.message ?? `O servidor retornou uma resposta inválida (HTTP ${res.status}). Não foi possível processar o resultado.`,
      http_status: res.status,
    };
  }
}

export const validationService = {
  async validateFeedByUrl(url: string): Promise<ValidationResult> {
    const headers = await getAuthHeaders();
    let res: Response;
    try {
      res = await fetch(`${FUNCTIONS_URL}/validate-rss-feed`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url }),
      });
    } catch (e) {
      return {
        ok: false,
        error_code: 'network_error',
        error_message: `Falha de rede ao contactar o servidor: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
    return parseValidationResponse(res);
  },

  async validateFeedById(feedSourceId: string): Promise<ValidationResult> {
    const headers = await getAuthHeaders();
    let res: Response;
    try {
      res = await fetch(`${FUNCTIONS_URL}/validate-rss-feed`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ feed_source_id: feedSourceId }),
      });
    } catch (e) {
      return {
        ok: false,
        error_code: 'network_error',
        error_message: `Falha de rede ao contactar o servidor: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
    return parseValidationResponse(res);
  },

  async testWebhook(webhookId: string): Promise<{
    ok: boolean;
    http_status?: number;
    duration_ms?: number;
    response_preview?: string;
    error?: string;
  }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/test-webhook-endpoint`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ webhook_id: webhookId }),
    });
    return res.json();
  },

  async collectFromSource(feedSourceId: string): Promise<{
    ok: boolean;
    items_collected?: number;
    items_new?: number;
    error?: string;
  }> {
    const headers = await getAuthHeaders();
    let res: Response;
    try {
      res = await fetch(`${FUNCTIONS_URL}/collect-news`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ feed_source_id: feedSourceId }),
      });
    } catch (e) {
      return {
        ok: false,
        error: `Falha de rede: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
    
    if (!res.ok) {
      const text = await res.text();
      try {
        const err = JSON.parse(text);
        return { ok: false, error: err.error || err.error_message || 'Erro desconhecido' };
      } catch {
        return { ok: false, error: `Erro no servidor (HTTP ${res.status})` };
      }
    }

    return res.json();
  },
};
