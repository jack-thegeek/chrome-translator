// 内容脚本 - 划词显示翻译图标，点击后翻译
(function() {
  'use strict';

  let triggerBtn = null;
  let popup = null;
  let selectedText = '';
  let lastSelectionRange = null;
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  // 创建触发图标按钮
  function createTriggerButton() {
    if (triggerBtn) triggerBtn.remove();

    triggerBtn = document.createElement('div');
    triggerBtn.id = 'ai-translator-trigger';
    triggerBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 8l6 6"></path>
        <path d="M4 14l6-6 2-3"></path>
        <path d="M2 5h12"></path>
        <path d="M7 2h1"></path>
        <path d="M22 22l-5-10-5 10"></path>
        <path d="M14 18h6"></path>
      </svg>
    `;
    triggerBtn.title = '点击翻译';

    document.body.appendChild(triggerBtn);

    // 点击触发翻译
    triggerBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    triggerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!selectedText) return;

      // 隐藏触发按钮
      hideTriggerButton();

      // 显示翻译弹窗
      createPopup();
      positionPopup(lastSelectionRange);

      // 开始翻译
      translate(selectedText);
    });

    return triggerBtn;
  }

  // 定位触发按钮
  function positionTriggerButton(range) {
    if (!triggerBtn) return;

    const rect = range.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    let left = rect.right + scrollX + 8;
    let top = rect.bottom + scrollY - 32;

    // 边界检测
    const btnSize = 32;
    if (left + btnSize > scrollX + window.innerWidth - 8) {
      left = rect.left + scrollX - btnSize - 8;
    }
    if (left < scrollX + 8) {
      left = scrollX + 8;
    }
    if (top < scrollY + 8) {
      top = rect.top + scrollY + 4;
    }

    triggerBtn.style.left = left + 'px';
    triggerBtn.style.top = top + 'px';
  }

  // 隐藏触发按钮
  function hideTriggerButton() {
    if (triggerBtn) {
      triggerBtn.classList.add('ai-translator-hiding');
      setTimeout(() => {
        if (triggerBtn) {
          triggerBtn.remove();
          triggerBtn = null;
        }
      }, 150);
    }
  }

  // 创建翻译弹窗
  function createPopup() {
    if (popup) popup.remove();

    popup = document.createElement('div');
    popup.id = 'ai-translator-popup';
    popup.innerHTML = `
      <div class="ai-translator-header">
        <span class="ai-translator-title">AI 翻译</span>
        <div class="ai-translator-actions">
          <button class="ai-translator-btn ai-translator-copy" title="复制结果">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="ai-translator-btn ai-translator-close" title="关闭">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="ai-translator-result">
        <div class="ai-translator-loading">
          <div class="ai-translator-spinner"></div>
          <span>翻译中...</span>
        </div>
      </div>
    `;

    document.body.appendChild(popup);

    // 复制按钮
    popup.querySelector('.ai-translator-copy').addEventListener('click', () => {
      const result = popup.querySelector('.ai-translator-result').textContent;
      navigator.clipboard.writeText(result).then(() => {
        const btn = popup.querySelector('.ai-translator-copy');
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 1500);
      });
    });

    // 关闭按钮 - 唯一关闭方式
    popup.querySelector('.ai-translator-close').addEventListener('click', hidePopup);

    // 拖动功能
    const header = popup.querySelector('.ai-translator-header');
    header.addEventListener('mousedown', startDrag);

    return popup;
  }

  // 开始拖动
  function startDrag(e) {
    if (e.target.closest('.ai-translator-btn')) return; // 点击按钮不触发拖动

    isDragging = true;
    popup.classList.add('ai-translator-dragging');

    const rect = popup.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    dragOffsetX = e.clientX + scrollX - (rect.left + scrollX);
    dragOffsetY = e.clientY + scrollY - (rect.top + scrollY);

    e.preventDefault();
  }

  // 拖动中
  document.addEventListener('mousemove', (e) => {
    if (!isDragging || !popup) return;

    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    let newLeft = e.clientX + scrollX - dragOffsetX;
    let newTop = e.clientY + scrollY - dragOffsetY;

    // 边界限制
    const rect = popup.getBoundingClientRect();
    const margin = 10;
    newLeft = Math.max(scrollX + margin, Math.min(newLeft, scrollX + window.innerWidth - rect.width - margin));
    newTop = Math.max(scrollY + margin, Math.min(newTop, scrollY + window.innerHeight - rect.height - margin));

    popup.style.left = newLeft + 'px';
    popup.style.top = newTop + 'px';
  });

  // 结束拖动
  document.addEventListener('mouseup', () => {
    if (isDragging && popup) {
      isDragging = false;
      popup.classList.remove('ai-translator-dragging');
    }
  });

  // 定位弹窗
  function positionPopup(range) {
    if (!popup) return;

    const rect = range.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    const popupWidth = 380;
    const popupHeight = 200;
    const margin = 10;

    let left = rect.left + scrollX + (rect.width / 2) - (popupWidth / 2);
    let top = rect.bottom + scrollY + margin;

    // 边界检测
    if (left < scrollX + margin) left = scrollX + margin;
    if (left + popupWidth > scrollX + window.innerWidth - margin) {
      left = scrollX + window.innerWidth - popupWidth - margin;
    }
    if (top + popupHeight > scrollY + window.innerHeight - margin) {
      top = rect.top + scrollY - popupHeight - margin;
    }

    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
  }

  // 隐藏弹窗
  function hidePopup() {
    if (popup) {
      popup.classList.add('ai-translator-hiding');
      setTimeout(() => {
        if (popup) {
          popup.remove();
          popup = null;
        }
      }, 200);
    }
  }

  // 发送翻译请求（自动回退）
  function translate(text) {
    chrome.storage.local.get(['translatorConfigs', 'activeConfigId'], (result) => {
      const configs = result.translatorConfigs || [];
      const activeConfigId = result.activeConfigId;

      if (configs.length === 0) {
        showError('没有可用的翻译配置');
        return;
      }

      // 构建尝试顺序：优先当前配置，然后按顺序尝试其他
      const activeIndex = configs.findIndex(c => c.id === activeConfigId);
      const tryOrder = [...configs];
      if (activeIndex > 0) {
        // 把 activeConfig 移到第一位
        const [active] = tryOrder.splice(activeIndex, 1);
        tryOrder.unshift(active);
      }

      // 过滤掉没有 apiKey 的配置
      const validConfigs = tryOrder.filter(c => c.apiKey);

      if (validConfigs.length === 0) {
        showError('请先在插件设置中配置 API Key');
        return;
      }

      // 尝试请求，失败自动回退
      let attemptIndex = 0;
      const errors = [];

      function tryNext() {
        if (attemptIndex >= validConfigs.length) {
          // 所有配置都失败，显示详细错误
          const detail = errors.map(e => `• ${e.name}: ${e.error}`).join('\n');
          showError(`所有配置请求失败\n${detail}`);
          return;
        }

        const config = validConfigs[attemptIndex];
        const isFallback = attemptIndex > 0;

        if (isFallback) {
          showLoading(`「${validConfigs[attemptIndex - 1].name}」失败，正在尝试「${config.name}」...`);
        }

        chrome.runtime.sendMessage({
          type: 'translate',
          text: text,
          config: config
        }, (response) => {
          if (chrome.runtime.lastError) {
            // 网络错误，尝试下一个
            errors.push({ name: config.name, error: chrome.runtime.lastError.message });
            attemptIndex++;
            tryNext();
            return;
          }

          if (response.success) {
            showResult(response.result, isFallback ? config.name : null);
          } else {
            // API 错误，尝试下一个
            errors.push({ name: config.name, error: response.error });
            attemptIndex++;
            tryNext();
          }
        });
      }

      tryNext();
    });
  }

  // 显示翻译结果
  function showResult(result, fallbackName) {
    if (!popup) return;

    const resultEl = popup.querySelector('.ai-translator-result');
    const fallbackBadge = fallbackName
      ? `<div class="ai-translator-fallback-badge">由「${escapeHtml(fallbackName)}」翻译</div>`
      : '';
    resultEl.innerHTML = `${fallbackBadge}<div class="ai-translator-text">${escapeHtml(result)}</div>`;
  }

  // 更新加载状态
  function showLoading(message) {
    if (!popup) return;
    const resultEl = popup.querySelector('.ai-translator-result');
    resultEl.innerHTML = `<div class="ai-translator-loading">
      <div class="ai-translator-spinner"></div>
      <span>${escapeHtml(message)}</span>
    </div>`;
  }

  // 显示错误
  function showError(message) {
    if (!popup) return;
    const resultEl = popup.querySelector('.ai-translator-result');
    // 将错误消息格式化，保留换行并高亮关键信息
    const formattedMessage = escapeHtml(message)
      .replace(/\n/g, '<br>')
      .replace(/\[([^\]]+)\]/g, '<code class="ai-translator-error-tag">[$1]</code>');
    resultEl.innerHTML = `<div class="ai-translator-error">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
      <span>${formattedMessage}</span>
    </div>`;
  }

  // HTML 转义
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 处理选中文本 - 仅显示触发图标
  function handleSelection() {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (!text || text.length > 5000) return;

    selectedText = text;

    // 保存选区位置用于定位
    if (selection.rangeCount > 0) {
      lastSelectionRange = selection.getRangeAt(0);
    }

    // 只显示触发图标
    const btn = createTriggerButton();
    positionTriggerButton(lastSelectionRange);
  }

  // 鼠标释放时显示触发图标
  document.addEventListener('mouseup', (e) => {
    // 点击弹窗内部不处理
    if (popup && popup.contains(e.target)) return;
    // 点击触发按钮不处理
    if (triggerBtn && triggerBtn.contains(e.target)) return;

    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (text && text.length <= 5000) {
        handleSelection();
      } else {
        // 没选中文本，隐藏触发按钮
        hideTriggerButton();
      }
    }, 100);
  });

  // ESC 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideTriggerButton();
    }
  });

})();
