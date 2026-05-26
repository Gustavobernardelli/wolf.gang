const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export type GenerateTarget = 'title' | 'subtitle' | 'description';

export interface GenerateOptions {
  channelPrompt: string;
  originalTitle: string;
  originalDescription: string;
  target: GenerateTarget;
  platform?: string;
}

function buildPrompt(opts: GenerateOptions): string {
  const channelInstructions = opts.channelPrompt
    ? `Siga RIGOROSAMENTE as instruções editoriais deste canal:\n\n${opts.channelPrompt}\n\n`
    : '';

  const context =
    `Título original da notícia: "${opts.originalTitle}"\n\n` +
    `Texto original da notícia:\n${opts.originalDescription}\n\n`;

  switch (opts.target) {
    case 'title':
      return (
        `Você é um redator jornalístico.\n\n` +
        channelInstructions +
        context +
        `Reescreva o "Título original da notícia" acima usando sinônimos e estrutura de frase DIFERENTE da original, mantendo:\n` +
        `- Todos os fatos, nomes, locais e elementos essenciais\n` +
        `- O mesmo nível de informação — não simplifique, não omita detalhes, mas seja conciso\n` +
        `- Limite de tamanho: no MÁXIMO 100 caracteres (incluindo espaços)\n\n` +
        `PROIBIÇÕES ABSOLUTAS:\n` +
        `- NUNCA repita o título original — a versão reescrita deve ser visivelmente diferente em palavras e estrutura\n` +
        `- Não use asteriscos (**), markdown, negrito, itálico ou qualquer formatação especial\n` +
        `- Não invente fatos, não omita informações, não adicione opiniões\n` +
        `- Não escreva explicações, aspas ou qualquer texto além do título\n` +
        `- O título gerado NÃO PODE ultrapassar 100 caracteres (incluindo espaços) sob nenhuma circunstância\n\n` +
        `Responda SOMENTE com o título reescrito, como texto simples.`
      );

    case 'subtitle':
      return (
        `Você é um redator jornalístico.\n\n` +
        channelInstructions +
        context +
        `Crie um subtítulo de apoio (por volta de 200 caracteres) para esta notícia que aparecerá na imagem do post.\n` +
        `O subtítulo deve:\n` +
        `- Resumir o fato principal com os elementos-chave: quem, o quê, onde\n` +
        `- Ter em torno de 200 caracteres (incluindo espaços) para fornecer um bom contexto de apoio\n` +
        `- Usar palavras DIFERENTES das usadas no título original\n` +
        `- Ser uma frase completa e informativa\n\n` +
        `PROIBIÇÕES ABSOLUTAS:\n` +
        `- NUNCA repita frases do título original — use vocabulário diferente\n` +
        `- Não use asteriscos (**), markdown, negrito, itálico ou qualquer formatação especial\n` +
        `- Não invente fatos, não adicione opiniões\n` +
        `- Não escreva explicações, aspas ou qualquer texto além do subtítulo\n\n` +
        `Responda SOMENTE com o subtítulo, como texto simples.`
      );

    case 'description': {
      const isSocialMedia = opts.platform === 'instagram' || opts.platform === 'facebook';
      if (isSocialMedia) {
        return (
          `Você é um redator especializado em redes sociais (Instagram e Facebook).\n\n` +
          channelInstructions +
          context +
          `Crie uma descrição resumida e engajadora para uma postagem no ${opts.platform === 'instagram' ? 'Instagram' : 'Facebook'}, baseada na notícia fornecida acima.\n` +
          `Requisitos obrigatórios:\n` +
          `- Limite estrito de no MÁXIMO 500 caracteres (incluindo espaços e hashtags).\n` +
          `- Use destaques visuais para realçar o texto (por exemplo, emojis adequados ao contexto e palavras ou expressões curtas em letras MAIÚSCULAS para atrair a atenção do leitor, como "ATENÇÃO", "IMPORTANTE", "VEJA").\n` +
          `- Inclua no final de 3 a 5 hashtags (#) relevantes associadas ao tema da notícia.\n` +
          `- Mantenha os fatos principais e as informações essenciais, sem inventar dados adicionais.\n\n` +
          `PROIBIÇÕES ABSOLUTAS:\n` +
          `- Não use asteriscos (**), markdown, negrito, itálico ou qualquer formatação especial clássica de markdown.\n` +
          `- Não escreva títulos separados, explicações, aspas externas ou qualquer texto além da própria legenda/descrição.\n\n` +
          `Responda SOMENTE com a legenda da postagem pronta, como texto simples.`
        );
      }
      return (
        `Você é um redator jornalístico.\n\n` +
        channelInstructions +
        context +
        `Reescreva o "Texto original da notícia" acima usando palavras diferentes, mantendo:\n` +
        `- Todos os fatos, nomes, datas, locais e números exatamente como estão\n` +
        `- O mesmo tamanho e nível de detalhe do texto original\n` +
        `- Texto corrido, sem parágrafos separados com título, sem marcadores, sem numeração\n\n` +
        `PROIBIÇÕES ABSOLUTAS:\n` +
        `- Não use asteriscos (**), markdown, negrito, itálico ou qualquer formatação especial\n` +
        `- Não invente fatos, não omita informações, não adicione opiniões\n` +
        `- Não escreva títulos, subtítulos, introduções ou explicações\n\n` +
        `Responda SOMENTE com o parágrafo reescrito, como texto simples.`
      );
    }
  }
}

// title/subtitle: disable thinking (thinkingBudget: 0) so tokens aren't consumed by reasoning.
// description: allow thinking for higher quality rewrite.
const THINKING_BUDGETS: Record<GenerateTarget, number> = {
  title:       0,
  subtitle:    0,
  description: 8000,
};

const TOKEN_LIMITS: Record<GenerateTarget, number> = {
  title:       1024,
  subtitle:    256,
  description: 8192,
};

const TEMPERATURES: Record<GenerateTarget, number> = {
  title:       0.65,
  subtitle:    0.65,
  description: 0.30,
};

export async function generateWithAI(opts: GenerateOptions): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Chave da API Gemini não configurada (VITE_GEMINI_API_KEY).');
  }

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(opts) }] }],
      generationConfig: {
        temperature:     TEMPERATURES[opts.target],
        maxOutputTokens: TOKEN_LIMITS[opts.target],
        thinkingConfig:  { thinkingBudget: THINKING_BUDGETS[opts.target] },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as any)?.error?.message ?? `Erro Gemini HTTP ${res.status}`,
    );
  }

  const json = await res.json();
  const candidate = json?.candidates?.[0];
  const finishReason: string = candidate?.finishReason ?? '';

  // Filter out internal thought parts (present when thinkingBudget > 0)
  const parts: Array<{ text?: string; thought?: boolean }> = candidate?.content?.parts ?? [];
  const text = parts
    .filter(p => !p.thought)
    .map(p => p.text ?? '')
    .join('')
    .trim() || undefined;

  if (!text) {
    console.error('[Gemini] Raw response:', JSON.stringify(json, null, 2));
    throw new Error('Gemini não retornou conteúdo válido.');
  }

  if (finishReason === 'MAX_TOKENS') {
    console.warn('[Gemini] Resposta cortada por MAX_TOKENS — alvo:', opts.target);
  }

  // Strip any markdown the model may have added despite instructions
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/^[-•]\s+/gm, '')
    .trim();
}
