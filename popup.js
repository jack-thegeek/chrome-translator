// 设置页面逻辑 - 多配置管理
document.addEventListener('DOMContentLoaded', () => {
  let configs = [];
  let activeConfigId = null;

  // 语言选项
  const languages = [
    { value: '中文', label: '中文' },
    { value: 'English', label: 'English' },
    { value: '日本語', label: '日本語' },
    { value: '한국어', label: '한국어' }
  ];

  const SYSTEM_GOOGLE_ID = 'config_system_google';

  function createSystemGoogleConfig(targetLang = '中文') {
    return {
      id: SYSTEM_GOOGLE_ID,
      name: '谷歌翻译',
      isSystem: true,
      provider: 'google',
      baseUrl: 'https://translate.googleapis.com',
      apiKey: '',
      model: '',
      targetLang: targetLang,
      createdAt: 0
    };
  }

  // API 协议选项（用于自定义配置）
  const providers = [
    { value: 'openai', label: 'OpenAI 兼容' },
    { value: 'claude', label: 'Claude API' }
  ];

  // DOM 元素
  const configDropdown = document.getElementById('configDropdown');
  const dropdownName = document.getElementById('dropdownName');

  const dropdownList = document.getElementById('configDropdownList');
  const configNameInput = document.getElementById('configName');
  const baseUrlInput = document.getElementById('baseUrl');
  const modelInput = document.getElementById('model');
  const apiKeyInput = document.getElementById('apiKey');
  const toggleApiKeyBtn = document.getElementById('toggleApiKey');
  const langDropdown = document.getElementById('langDropdown');
  const langValue = document.getElementById('langValue');
  const langDropdownList = document.getElementById('langDropdownList');
  const providerDropdown = document.getElementById('providerDropdown');
  const providerValue = document.getElementById('providerValue');
  const providerDropdownList = document.getElementById('providerDropdownList');
  let selectedLang = '中文';
  let selectedProvider = 'openai';

  // 加载配置
  loadConfigs();

  function loadConfigs() {
    chrome.storage.local.get(['translatorConfigs', 'activeConfigId'], (result) => {
      configs = result.translatorConfigs || [];
      activeConfigId = result.activeConfigId || null;

      // 寻找或补充系统固定预设：谷歌翻译
      let googleConfig = configs.find(c => c.id === SYSTEM_GOOGLE_ID || c.isSystem || c.name === '谷歌翻译');
      if (!googleConfig) {
        googleConfig = createSystemGoogleConfig();
        configs.unshift(googleConfig);
      } else {
        googleConfig.id = SYSTEM_GOOGLE_ID;
        googleConfig.name = '谷歌翻译';
        googleConfig.isSystem = true;
        googleConfig.provider = 'google';
        googleConfig.baseUrl = 'https://translate.googleapis.com';
      }

      // 如果没有自定义配置，补充一个默认配置
      if (configs.length === 1 && configs[0].isSystem) {
        const defaultConfig = createDefaultConfig('默认配置');
        configs.push(defaultConfig);
      }

      // 确保 activeConfigId 有效
      if (!activeConfigId || !configs.find(c => c.id === activeConfigId)) {
        activeConfigId = configs[0].id;
      }

      renderDropdown();
      loadConfigToForm(activeConfigId);
      saveConfigs();
    });
  }

  function createDefaultConfig(name) {
    return {
      id: generateId(),
      name: name,
      baseUrl: '',
      apiKey: '',
      model: '',
      targetLang: '中文',
      provider: 'openai',
      createdAt: Date.now()
    };
  }

  function generateId() {
    return 'config_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 渲染配置下拉框
  function renderDropdown() {
    // 更新触发器
    const activeConfig = configs.find(c => c.id === activeConfigId);
    if (activeConfig) {
      const isSys = activeConfig.isSystem || activeConfig.id === SYSTEM_GOOGLE_ID;
      dropdownName.innerHTML = isSys
        ? `${escapeHtml(activeConfig.name)} <span class="config-system-badge">内置</span>`
        : escapeHtml(activeConfig.name);
    }

    // 渲染列表
    dropdownList.innerHTML = '';
    configs.forEach(config => {
      const item = document.createElement('div');
      item.className = 'config-dropdown-item' + (config.id === activeConfigId ? ' active' : '');
      item.dataset.id = config.id;
      const isSys = config.isSystem || config.id === SYSTEM_GOOGLE_ID;
      const systemBadge = isSys ? ` <span class="config-system-badge">内置</span>` : '';
      item.innerHTML = `
        <div class="config-dropdown-item-label">
          <div class="config-dropdown-item-name">${escapeHtml(config.name)}${systemBadge}</div>
        </div>
        <svg class="config-dropdown-item-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      item.addEventListener('click', () => selectConfig(config.id));
      dropdownList.appendChild(item);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function selectConfig(configId) {
    if (configId === activeConfigId) {
      closeDropdown();
      return;
    }
    // 先保存当前配置
    updateCurrentConfigFromForm();
    saveConfigs();

    // 切换到新配置
    activeConfigId = configId;
    loadConfigToForm(activeConfigId);
    saveConfigs();
    renderDropdown();
    closeDropdown();
  }

  function openDropdown() {
    configDropdown.classList.add('open');
  }

  function closeDropdown() {
    configDropdown.classList.remove('open');
  }

  function toggleDropdown() {
    configDropdown.classList.toggle('open');
  }

  // 触发器点击
  document.querySelector('.config-dropdown-trigger').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  // 点击外部关闭
  document.addEventListener('click', (e) => {
    if (!configDropdown.contains(e.target)) {
      closeDropdown();
    }
  });

  // === 语言下拉框 ===
  function renderLangDropdown() {
    langDropdownList.innerHTML = '';
    languages.forEach(lang => {
      const item = document.createElement('div');
      item.className = 'select-dropdown-item' + (lang.value === selectedLang ? ' active' : '');
      item.dataset.value = lang.value;
      item.innerHTML = `
        <span class="select-dropdown-item-name">${lang.label}</span>
        <svg class="select-dropdown-item-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      item.addEventListener('click', () => selectLang(lang.value));
      langDropdownList.appendChild(item);
    });
  }

  function selectLang(value) {
    selectedLang = value;
    langValue.textContent = value;
    renderLangDropdown();
    closeLangDropdown();
    // 自动保存
    updateCurrentConfigFromForm();
    saveConfigs();
  }

  function openLangDropdown() {
    langDropdown.classList.add('open');
  }

  function closeLangDropdown() {
    langDropdown.classList.remove('open');
  }

  function toggleLangDropdown() {
    langDropdown.classList.toggle('open');
  }

  // 语言触发器点击
  langDropdown.querySelector('.select-dropdown-trigger').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleLangDropdown();
  });

  // 点击外部关闭语言下拉
  document.addEventListener('click', (e) => {
    if (!langDropdown.contains(e.target)) {
      closeLangDropdown();
    }
  });

  // 初始化语言下拉
  renderLangDropdown();

  // === 协议下拉框 ===
  function renderProviderDropdown() {
    providerDropdownList.innerHTML = '';
    providers.forEach(p => {
      const item = document.createElement('div');
      item.className = 'select-dropdown-item' + (p.value === selectedProvider ? ' active' : '');
      item.dataset.value = p.value;
      item.innerHTML = `
        <span class="select-dropdown-item-name">${p.label}</span>
        <svg class="select-dropdown-item-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      item.addEventListener('click', () => selectProvider(p.value));
      providerDropdownList.appendChild(item);
    });
  }

  function selectProvider(value) {
    selectedProvider = value;
    providerValue.textContent = providers.find(p => p.value === value)?.label || value;
    renderProviderDropdown();
    closeProviderDropdown();
    // 自动填充 Google 翻译默认 Endpoint
    if (value === 'google' && !baseUrlInput.value.trim()) {
      baseUrlInput.value = 'https://translate.googleapis.com';
    }
    // 更新 placeholder
    updatePlaceholder();
    // 自动保存
    updateCurrentConfigFromForm();
    saveConfigs();
  }

  function updatePlaceholder() {
    const activeConfig = configs.find(c => c.id === activeConfigId);
    const isSys = activeConfig && (activeConfig.isSystem || activeConfig.id === SYSTEM_GOOGLE_ID);

    if (isSys) {
      baseUrlInput.placeholder = 'https://translate.googleapis.com';
      apiKeyInput.placeholder = '(系统内置，无需 Key)';
      modelInput.placeholder = '(系统内置)';
    } else if (selectedProvider === 'claude') {
      baseUrlInput.placeholder = 'https://api.anthropic.com/v1';
      apiKeyInput.placeholder = 'sk-ant-...';
      modelInput.placeholder = 'claude-3-5-sonnet-20241022';
    } else {
      baseUrlInput.placeholder = 'https://api.openai.com/v1';
      apiKeyInput.placeholder = 'sk-...';
      modelInput.placeholder = 'gpt-3.5-turbo';
    }
  }

  function openProviderDropdown() {
    providerDropdown.classList.add('open');
  }

  function closeProviderDropdown() {
    providerDropdown.classList.remove('open');
  }

  function toggleProviderDropdown() {
    providerDropdown.classList.toggle('open');
  }

  // 协议触发器点击
  providerDropdown.querySelector('.select-dropdown-trigger').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleProviderDropdown();
  });

  // 点击外部关闭协议下拉
  document.addEventListener('click', (e) => {
    if (!providerDropdown.contains(e.target)) {
      closeProviderDropdown();
    }
  });

  // 初始化协议下拉
  renderProviderDropdown();
  updatePlaceholder();

  // === 获取模型列表 ===
  const fetchModelsBtn = document.getElementById('fetchModelsBtn');
  const modelsDropdown = document.getElementById('modelsDropdown');
  const modelsDropdownList = document.getElementById('modelsDropdownList');

  fetchModelsBtn.addEventListener('click', async () => {
    const baseUrl = baseUrlInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    if (!baseUrl || !apiKey) {
      showStatus('请填写 API Endpoint 和 API Key', 'error');
      return;
    }

    fetchModelsBtn.disabled = true;
    fetchModelsBtn.classList.add('loading');

    try {
      const url = `${baseUrl.replace(/\/$/, '')}/models`;

      const headers = { 'Content-Type': 'application/json' };
      if (selectedProvider === 'claude') {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(url, { headers });
      const data = await response.json();

      const models = (data.data || []).map(m => m.id);

      if (models.length === 0) {
        modelsDropdownList.innerHTML = '<div class="models-dropdown-empty">未找到模型</div>';
      } else {
        modelsDropdownList.innerHTML = '';
        models.forEach(modelId => {
          const item = document.createElement('div');
          item.className = 'models-dropdown-item';
          item.textContent = modelId;
          item.addEventListener('click', () => {
            modelInput.value = modelId;
            closeModelsDropdown();
            updateCurrentConfigFromForm();
            saveConfigs();
          });
          modelsDropdownList.appendChild(item);
        });
      }
      modelsDropdown.classList.add('show');
    } catch (err) {
      showStatus('获取模型列表失败', 'error');
    }

    fetchModelsBtn.disabled = false;
    fetchModelsBtn.classList.remove('loading');
  });

  function closeModelsDropdown() {
    modelsDropdown.classList.remove('show');
  }

  // 点击外部关闭模型下拉
  document.addEventListener('click', (e) => {
    if (!modelsDropdown.contains(e.target) && e.target !== fetchModelsBtn && !fetchModelsBtn.contains(e.target)) {
      closeModelsDropdown();
    }
  });

  function loadConfigToForm(configId) {
    const config = configs.find(c => c.id === configId);
    if (!config) return;

    const isSys = config.isSystem || config.id === SYSTEM_GOOGLE_ID;

    configNameInput.value = config.name;
    baseUrlInput.value = isSys ? 'https://translate.googleapis.com' : (config.baseUrl || '');
    apiKeyInput.value = isSys ? '' : (config.apiKey || '');
    modelInput.value = isSys ? '' : (config.model || '');
    selectedLang = config.targetLang || '中文';
    selectedProvider = isSys ? 'google' : (config.provider || 'openai');

    langValue.textContent = selectedLang;
    providerValue.textContent = isSys ? 'Google 翻译 (内置引擎)' : (providers.find(p => p.value === selectedProvider)?.label || 'OpenAI 兼容');

    // 系统内置配置锁定核心字段，仅允许切换目标语言
    configNameInput.disabled = isSys;
    baseUrlInput.disabled = isSys;
    apiKeyInput.disabled = isSys;
    modelInput.disabled = isSys;
    fetchModelsBtn.style.display = isSys ? 'none' : 'flex';
    providerDropdown.style.pointerEvents = isSys ? 'none' : 'auto';
    providerDropdown.style.opacity = isSys ? '0.65' : '1';

    updatePlaceholder();
    renderLangDropdown();
    renderProviderDropdown();
  }

  function saveConfigs() {
    chrome.storage.local.set({
      translatorConfigs: configs,
      activeConfigId: activeConfigId
    });
  }

  function getCurrentFormData() {
    return {
      name: configNameInput.value.trim() || '未命名配置',
      baseUrl: baseUrlInput.value.trim(),
      apiKey: apiKeyInput.value.trim(),
      model: modelInput.value.trim(),
      targetLang: selectedLang,
      provider: selectedProvider
    };
  }

  function updateCurrentConfigFromForm() {
    const config = configs.find(c => c.id === activeConfigId);
    if (!config) return;

    if (config.isSystem || config.id === SYSTEM_GOOGLE_ID) {
      config.targetLang = selectedLang;
      return;
    }

    const data = getCurrentFormData();
    config.name = data.name;
    config.baseUrl = data.baseUrl;
    config.apiKey = data.apiKey;
    config.model = data.model;
    config.targetLang = data.targetLang;
    config.provider = data.provider;
  }

  // 表单输入变化时自动保存
  [configNameInput, baseUrlInput, apiKeyInput, modelInput].forEach(el => {
    el.addEventListener('input', () => {
      updateCurrentConfigFromForm();
      saveConfigs();
      renderDropdown();
    });
    el.addEventListener('change', () => {
      updateCurrentConfigFromForm();
      saveConfigs();
      renderDropdown();
    });
  });

  // API Key 显示/隐藏切换
  toggleApiKeyBtn.addEventListener('click', () => {
    const type = apiKeyInput.type === 'password' ? 'text' : 'password';
    apiKeyInput.type = type;
    toggleApiKeyBtn.style.color = type === 'text' ? '#6366f1' : '#94a3b8';
  });

  // 测试连接
  const testInput = document.getElementById('testInput');
  const testResult = document.getElementById('testResult');
  const testResultBody = document.getElementById('testResultBody');

  document.getElementById('testBtn').addEventListener('click', async () => {
    const btn = document.getElementById('testBtn');
    btn.disabled = true;
    btn.textContent = '测试中...';
    testResult.style.display = 'none';

    const config = {
      baseUrl: baseUrlInput.value.trim(),
      apiKey: apiKeyInput.value.trim(),
      model: modelInput.value.trim() || (selectedProvider === 'claude' ? 'claude-3-5-sonnet-20241022' : 'gpt-3.5-turbo'),
      targetLang: selectedLang,
      provider: selectedProvider
    };

    const testText = testInput.value.trim() || '你好';

    if (config.provider !== 'google' && (!config.baseUrl || !config.apiKey)) {
      showStatus('请填写 API Endpoint 和 API Key', 'error');
      btn.disabled = false;
      btn.textContent = '测试';
      return;
    }

    try {
      let url, requestOptions, response;

      if (config.provider === 'google') {
        let host = (config.baseUrl || 'https://translate.googleapis.com').trim().replace(/\/$/, '');
        if (!host.startsWith('http://') && !host.startsWith('https://')) {
          host = 'https://' + host;
        }
        const langMap = { '中文': 'zh-CN', 'English': 'en', '日本語': 'ja', '한국어': 'ko' };
        const tl = langMap[config.targetLang] || 'zh-CN';
        url = `${host}/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(testText)}`;
        requestOptions = {
          method: 'GET',
          headers: {
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
          }
        };
        response = await fetch(url, requestOptions);
      } else if (config.provider === 'claude') {
        url = `${config.baseUrl.replace(/\/$/, '')}/messages`;
        requestOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: 500,
            messages: [
              { role: 'user', content: testText }
            ]
          })
        };
        response = await fetch(url, requestOptions);
      } else {
        url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
        requestOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: config.model,
            messages: [
              { role: 'system', content: 'You are a helpful assistant.' },
              { role: 'user', content: testText }
            ],
            max_tokens: 500
          })
        };
        response = await fetch(url, requestOptions);
      }

      // 显示请求参数（fetch 格式，可直接复制到控制台执行）
      const requestParamsEl = document.getElementById('requestParams');
      const requestParamsBody = document.getElementById('requestParamsBody');
      requestParamsEl.style.display = 'block';
      const fetchOptions = {
        method: requestOptions.method,
        headers: requestOptions.headers,
        body: requestOptions.body
      };
      requestParamsBody.textContent = `fetch(${JSON.stringify(url)}, ${JSON.stringify(fetchOptions, null, 2)});`;

      const responseText = await response.text();
      let data = null;
      try { data = JSON.parse(responseText); } catch {}

      if (response.ok) {
        // 提取响应内容
        let resultText = '';
        if (config.provider === 'google') {
          if (Array.isArray(data) && Array.isArray(data[0])) {
            resultText = data[0].filter(i => i && i[0]).map(i => i[0]).join('');
          }
        } else if (config.provider === 'claude') {
          const textBlock = data?.content?.find(c => c.type === 'text');
          resultText = textBlock?.text?.trim() || '';
        } else {
          resultText = data?.choices?.[0]?.message?.content || '';
        }
        showStatus('连接成功！', 'success');
        testResult.style.display = 'block';
        testResultBody.className = 'test-result-body';
        testResultBody.textContent = resultText || '(空响应)';
      } else {
        const errorMsg = data?.error?.message || responseText || `HTTP ${response.status}`;
        showStatus('请求失败', 'error');
        testResult.style.display = 'block';
        testResultBody.className = 'test-result-body error';
        testResultBody.textContent = `${errorMsg}\nURL: ${url}`;
      }
    } catch (err) {
      showStatus('网络错误', 'error');
      testResult.style.display = 'block';
      testResultBody.className = 'test-result-body error';
      testResultBody.textContent = `网络错误: ${err.message}`;
    }

    btn.disabled = false;
    btn.textContent = '测试';
  });

  // 复制请求参数
  document.getElementById('copyRequestBtn').addEventListener('click', () => {
    const params = document.getElementById('requestParamsBody').textContent;
    navigator.clipboard.writeText(params).then(() => {
      showStatus('请求参数已复制到剪贴板', 'success');
    }).catch(() => {
      showStatus('复制失败', 'error');
    });
  });

  // 回车触发测试
  testInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('testBtn').click();
    }
  });

  // 新建配置
  document.getElementById('newConfigBtn').addEventListener('click', () => {
    document.getElementById('newConfigModal').classList.add('show');
    document.getElementById('newConfigName').value = '';
    document.getElementById('newConfigName').focus();
  });

  document.getElementById('cancelNewConfig').addEventListener('click', () => {
    document.getElementById('newConfigModal').classList.remove('show');
  });

  document.getElementById('confirmNewConfig').addEventListener('click', () => {
    const name = document.getElementById('newConfigName').value.trim() || '新配置';
    const newConfig = createDefaultConfig(name);
    configs.push(newConfig);
    activeConfigId = newConfig.id;
    saveConfigs();
    renderDropdown();
    loadConfigToForm(activeConfigId);
    document.getElementById('newConfigModal').classList.remove('show');
    showStatus('配置已创建', 'success');
  });

  // 回车确认新建
  document.getElementById('newConfigName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('confirmNewConfig').click();
    }
  });

  // 删除配置
  document.getElementById('deleteConfigBtn').addEventListener('click', () => {
    const config = configs.find(c => c.id === activeConfigId);
    if (!config) return;

    if (config.isSystem || config.id === SYSTEM_GOOGLE_ID) {
      showStatus('系统内置预设不可删除', 'error');
      return;
    }

    const userConfigs = configs.filter(c => !c.isSystem && c.id !== SYSTEM_GOOGLE_ID);
    if (userConfigs.length < 1) {
      showStatus('至少保留一个自定义配置', 'error');
      return;
    }

    if (!confirm(`确定要删除配置「${config.name}」吗？`)) return;

    configs = configs.filter(c => c.id !== activeConfigId);
    activeConfigId = configs[0].id;
    saveConfigs();
    renderDropdown();
    loadConfigToForm(activeConfigId);
    showStatus('配置已删除', 'success');
  });

  // 导出所有配置
  document.getElementById('exportBtn').addEventListener('click', () => {
    if (configs.length === 0) {
      showStatus('没有可导出的配置', 'error');
      return;
    }

    const exportData = {
      version: 1,
      configs: configs.map(c => ({
        name: c.name,
        baseUrl: c.baseUrl,
        apiKey: c.apiKey,
        model: c.model,
        targetLang: c.targetLang,
        provider: c.provider || 'openai'
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-translator-configs.json';
    a.click();
    URL.revokeObjectURL(url);
    showStatus(`已导出 ${configs.length} 个配置`, 'success');
  });

  // 导入配置（支持单配置和多配置格式）
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });

  document.getElementById('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        let importedConfigs = [];

        // 多配置格式（带 configs 数组）
        if (data.configs && Array.isArray(data.configs)) {
          importedConfigs = data.configs.filter(c => c.provider === 'google' || (c.baseUrl && c.apiKey));
        }
        // 单配置格式（兼容旧版）
        else if (data.provider === 'google' || (data.baseUrl && data.apiKey)) {
          importedConfigs = [data];
        }

        if (importedConfigs.length === 0) {
          showStatus('配置文件格式错误：缺少必填字段', 'error');
          return;
        }

        importedConfigs.forEach(data => {
          const newConfig = createDefaultConfig(data.name || '导入的配置');
          newConfig.baseUrl = data.baseUrl || '';
          newConfig.apiKey = data.apiKey || '';
          newConfig.model = data.model || '';
          newConfig.targetLang = data.targetLang || '中文';
          newConfig.provider = data.provider || 'openai';
          configs.push(newConfig);
        });

        activeConfigId = configs[configs.length - 1].id;
        saveConfigs();
        renderDropdown();
        loadConfigToForm(activeConfigId);
        showStatus(`已导入 ${importedConfigs.length} 个配置`, 'success');
      } catch {
        showStatus('配置文件解析失败', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // Toast notifications
  function showStatus(message, type) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;

    const iconSvg = type === 'success'
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';

    const formattedMessage = escapeHtml(message)
      .replace(/\n/g, '<br>')
      .replace(/\[([^\]]+)\]/g, '<code style="background:rgba(255,255,255,0.2);padding:1px 4px;border-radius:3px;font-size:11px;">$1</code>');

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-message">${formattedMessage}</div>
    `;

    container.appendChild(toast);

    // Auto remove - errors stay longer
    const duration = type === 'error' ? 6000 : 2500;
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 200);
    }, duration);
  }
});
