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

/** 修复模型常见的残缺 JSON：尾逗号、控制字符、中文标点、字符串内裸换行等 */
function repairJsonText(input) {
  let s = String(input || '')
    .replace(/^\uFEFF/, '')
    .replace(/，/g, ',')
    .replace(/：/g, ':')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    // 去掉对象/数组尾逗号
    .replace(/,\s*([}\]])/g, '$1')
    // JSON 不允许的控制字符（保留 \t \n \r，后续再处理字符串内换行）
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

  // 字符串字面量内的裸换行 → \n
  let out = '';
  let inStr = false;
  let escaped = false;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (inStr) {
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        out += ch;
        inStr = false;
        continue;
      }
      if (ch === '\n') {
        out += '\\n';
        continue;
      }
      if (ch === '\r') {
        out += '\\r';
        continue;
      }
      if (ch === '\t') {
        out += '\\t';
        continue;
      }
      out += ch;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      out += ch;
      continue;
    }
    out += ch;
  }
  return out;
}

function tryParseJson(text) {
  const candidates = [text, repairJsonText(text)];
  let lastErr;
  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('无法解析 JSON');
}

function extractJson(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('模型返回为空');

  try {
    return tryParseJson(raw);
  } catch (_) {
    /* fall through */
  }

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return tryParseJson(fenced[1].trim());
    } catch (_) {
      /* fall through */
    }
  }

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return tryParseJson(raw.slice(start, end + 1));
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
    const name = String(err?.name || '');
    const msg = String(err?.message || err || '');
    if (name === 'AbortError' || /timeout|aborted|terminated/i.test(msg)) {
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
