// Provider-agnostic text generation. Default: Google Gemini (free tier). Optional fallback: any
// OpenAI-compatible endpoint (Groq, OpenRouter, ...). Keys stay on the server.
export type ChatTurn = { role: 'user' | 'assistant'; content: string };
export type GenerateArgs = { system: string; messages: ChatTurn[]; maxTokens?: number };
export type Provider = { name: string; generate: (args: GenerateArgs) => Promise<string> };

export function geminiProvider(opts: { apiKey: string; model: string; fetchImpl?: typeof fetch }): Provider {
  return {
    name: 'gemini',
    async generate({ system, messages, maxTokens = 400 }) {
      const f = opts.fetchImpl ?? fetch;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(opts.model)}:generateContent`;
      const res = await f(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': opts.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`gemini ${res.status}`);
      const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
      if (!text) throw new Error('gemini empty response');
      return text;
    },
  };
}

export function openAICompatProvider(opts: { name: string; baseUrl: string; apiKey: string; model: string; fetchImpl?: typeof fetch }): Provider {
  return {
    name: opts.name,
    async generate({ system, messages, maxTokens = 400 }) {
      const f = opts.fetchImpl ?? fetch;
      const res = await f(`${opts.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.apiKey}` },
        body: JSON.stringify({
          model: opts.model,
          max_tokens: maxTokens,
          temperature: 0.3,
          messages: [{ role: 'system', content: system }, ...messages],
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`${opts.name} ${res.status}`);
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error(`${opts.name} empty response`);
      return text;
    },
  };
}

/** Build the provider chain from env. Empty array means "rule-based mode only". */
export function providersFromEnv(env: Record<string, string | undefined> = process.env): Provider[] {
  const list: Provider[] = [];
  if (env.GEMINI_API_KEY && env.ASSISTANT_MODEL) {
    list.push(geminiProvider({ apiKey: env.GEMINI_API_KEY, model: env.ASSISTANT_MODEL }));
  }
  if (env.ASSISTANT_FALLBACK_BASE_URL && env.ASSISTANT_FALLBACK_API_KEY && env.ASSISTANT_FALLBACK_MODEL) {
    list.push(
      openAICompatProvider({
        name: 'fallback',
        baseUrl: env.ASSISTANT_FALLBACK_BASE_URL,
        apiKey: env.ASSISTANT_FALLBACK_API_KEY,
        model: env.ASSISTANT_FALLBACK_MODEL,
      }),
    );
  }
  return list;
}
