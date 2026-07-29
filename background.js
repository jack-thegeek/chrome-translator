// 背景脚本 - 处理 API 请求（支持 OpenAI 和 Claude 格式）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'translate') {
    translateText(request.text, request.config)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function translateText(text, config) {
  const { apiKey, baseUrl, model, targetLang } = config;
  // 自动检测协议：优先使用 provider，否则根据 baseUrl 推断
  const provider = config.provider || (baseUrl.includes('anthropic') ? 'claude' : 'openai');
  const systemPrompt = `你是一个专业的翻译助手。请将用户输入的文本翻译成${targetLang || '中文'}。只返回翻译结果，不要解释。如果是句子，请保持语句通顺自然。`;

  if (provider === 'claude') {
    return translateWithClaude(text, config, systemPrompt);
  }
  return translateWithOpenAI(text, config, systemPrompt);
}

async function translateWithOpenAI(text, config, systemPrompt) {
  const { apiKey, baseUrl, model } = config;
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });
  } catch (err) {
    throw new Error(`网络错误: ${err.message}\nURL: ${url}`);
  }

  let data = null;
  const responseText = await response.text();
  try {
    data = JSON.parse(responseText);
  } catch {
    // 响应不是 JSON
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || responseText || `HTTP ${response.status}`;
    throw new Error(`${errorMsg}\n[OpenAI] ${url}`);
  }

  return data.choices?.[0]?.message?.content?.trim() || '翻译失败';
}

async function translateWithClaude(text, config, systemPrompt) {
  const { apiKey, baseUrl, model } = config;
  const url = `${baseUrl.replace(/\/$/, '')}/messages`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: text }
        ]
      })
    });
  } catch (err) {
    throw new Error(`网络错误: ${err.message}\nURL: ${url}`);
  }

  let data = null;
  const responseText = await response.text();
  try {
    data = JSON.parse(responseText);
  } catch {
    // 响应不是 JSON
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || responseText || `HTTP ${response.status}`;
    throw new Error(`${errorMsg}\n[Claude] ${url}`);
  }

  const textBlock = data.content?.find(c => c.type === 'text');
  return textBlock?.text?.trim() || '翻译失败';
}
