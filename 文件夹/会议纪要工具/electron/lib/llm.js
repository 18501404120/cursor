const fs = require('fs');

function getLlmConfig(config) {
  const llm = config?.llm || {};
  return {
    enabled: llm.enabled !== false && Boolean(llm.apiKey),
    baseUrl: (llm.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, ''),
    apiKey: llm.apiKey || '',
    model: llm.model || 'gpt-4o-mini',
    timeoutMs: Number(llm.timeoutMs) || 120000,
  };
}

function extractJson(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('模型返回为空');

  try {
    return JSON.parse(raw);
  } catch (_) {
    /* fall through */
  }

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    return JSON.parse(fenced[1].trim());
  }

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return JSON.parse(raw.slice(start, end + 1));
  }

  throw new Error('无法解析模型返回的 JSON');
}

async function chatCompletion(config, messages, options = {}) {
  const llm = getLlmConfig(config);
  if (!llm.enabled) {
    throw new Error('未配置 LLM API Key，请在 config.json 中设置 llm.apiKey');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), llm.timeoutMs);

  try {
    const body = {
      model: llm.model,
      messages,
      temperature: options.temperature ?? 0.3,
      response_format: options.responseFormat || { type: 'json_object' },
    };

    const res = await fetch(`${llm.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${llm.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const payload = await res.json();
    if (!res.ok) {
      const msg = payload?.error?.message || payload?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw new Error('模型未返回内容');
    return content;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('LLM 请求超时，请稍后重试');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function isLlmConfigured(config) {
  return getLlmConfig(config).enabled;
}

module.exports = {
  getLlmConfig,
  chatCompletion,
  extractJson,
  isLlmConfigured,
};
