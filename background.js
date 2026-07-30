// 背景脚本 - 处理 API 请求（支持 OpenAI 和 Claude 格式）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'translate') {
    translateText(request.text, request.config)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  if (request.type === 'bingDict') {
    fetchBingDictHtml(request.text)
      .then(html => sendResponse({ success: true, html }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// 必应词典查询（参照 crimx/ext-saladict bing engine）
const BING_DICT_LINK =
  'https://cn.bing.com/dict/clientsearch?mkt=zh-CN&setLang=zh&form=BDVEHC&ClientVer=BDDTV3.5.1.4320&q=';

async function fetchBingDictHtml(text) {
  const word = text.replace(/\s+/g, ' ').trim();
  const url = BING_DICT_LINK + encodeURIComponent(word);

  let response;
  try {
    response = await fetch(url, {
      headers: {
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
    });
  } catch (err) {
    throw new Error(`必应词典网络错误: ${err.message}`);
  }

  if (!response.ok) {
    throw new Error(`必应词典 HTTP ${response.status}`);
  }

  return await response.text();
}

async function translateText(text, config) {
  const { apiKey, baseUrl, model, targetLang } = config;
  // 自动检测协议：优先使用 provider，否则根据 baseUrl 推断
  const provider = config.provider || (baseUrl.includes('google') ? 'google' : (baseUrl.includes('anthropic') ? 'claude' : 'openai'));
  const systemPrompt = `你是一个专业的翻译助手。请将用户输入的文本翻译成${targetLang || '中文'}。只返回翻译结果，不要解释。如果原文包含多段或换行，请严格保留与原文一致的换行与段落结构。`;

  if (provider === 'google') {
    return translateWithGoogle(text, config);
  }
  if (provider === 'claude') {
    return translateWithClaude(text, config, systemPrompt);
  }
  return translateWithOpenAI(text, config, systemPrompt);
}

async function translateWithGoogle(text, config) {
  const { baseUrl, targetLang } = config;
  const langMap = {
    '中文': 'zh-CN',
    'English': 'en',
    '日本語': 'ja',
    '한국어': 'ko'
  };
  const tl = langMap[targetLang] || 'zh-CN';
  let host = (baseUrl || 'https://translate.googleapis.com').trim().replace(/\/$/, '');
  if (!host.startsWith('http://') && !host.startsWith('https://')) {
    host = 'https://' + host;
  }
  const url = `${host}/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;

  let response;
  try {
    response = await fetch(url, {
      headers: {
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    });
  } catch (err) {
    throw new Error(`Google 翻译网络错误: ${err.message}\nURL: ${url}`);
  }

  if (!response.ok) {
    throw new Error(`Google 翻译 HTTP ${response.status}\nURL: ${url}`);
  }

  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error(`Google 翻译响应解析失败\nURL: ${url}`);
  }

  if (Array.isArray(data) && Array.isArray(data[0])) {
    const translated = data[0]
      .filter(item => item && item[0])
      .map(item => item[0])
      .join('');
    if (translated) return translated;
  }
  throw new Error('Google 翻译未返回有效的翻译结果');
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
