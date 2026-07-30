// 内容脚本 - 划词显示翻译图标，点击后翻译
(function() {
  'use strict';

  let triggerBtn = null;
  let selectedText = '';
  let lastSelectionRange = null;
  let maxZIndex = 2147483640;
  let activeDragPopup = null;
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

      const textToTranslate = selectedText;
      const targetRange = lastSelectionRange;

      // 隐藏触发按钮
      hideTriggerButton();

      // 显示新翻译弹窗实例
      const popupEl = createPopup(targetRange);
      positionPopup(popupEl, targetRange);

      // 开始翻译
      translate(textToTranslate, popupEl, targetRange);

      // 取消网页文字高亮选择
      try {
        const sel = window.getSelection();
        if (sel) sel.removeAllRanges();
      } catch (err) {}
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

  const COPY_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
  const CHECK_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  // 创建翻译弹窗实例
  function createPopup(targetRange) {
    const popupEl = document.createElement('div');
    popupEl.className = 'ai-translator-popup';
    popupEl.style.zIndex = ++maxZIndex;
    popupEl.innerHTML = `
      <div class="ai-translator-header">
        <span class="ai-translator-title">AI 翻译</span>
        <div class="ai-translator-actions">
          <button class="ai-translator-btn ai-translator-copy" title="复制结果">
            ${COPY_ICON_SVG}
          </button>
          <button class="ai-translator-btn ai-translator-close" title="关闭">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

    document.body.appendChild(popupEl);

    // 点击该弹窗自动提升至最前面
    popupEl.addEventListener('mousedown', () => {
      popupEl.style.zIndex = ++maxZIndex;
    });

    // 复制按钮
    popupEl.querySelector('.ai-translator-copy').addEventListener('click', () => {
      const result = popupEl.querySelector('.ai-translator-result').textContent;
      if (!result) return;
      navigator.clipboard.writeText(result).then(() => {
        const btn = popupEl.querySelector('.ai-translator-copy');
        if (!btn) return;
        btn.innerHTML = CHECK_ICON_SVG;
        btn.classList.add('copied');
        btn.title = '已复制';
        setTimeout(() => {
          if (btn && btn.isConnected) {
            btn.innerHTML = COPY_ICON_SVG;
            btn.classList.remove('copied');
            btn.title = '复制结果';
          }
        }, 600);
      });
    });

    // 关闭按钮
    popupEl.querySelector('.ai-translator-close').addEventListener('click', () => {
      hidePopup(popupEl);
    });

    // 拖动功能
    const header = popupEl.querySelector('.ai-translator-header');
    header.addEventListener('mousedown', (e) => startDrag(e, popupEl));

    // 鼠标在弹窗内时，禁用外部网页页面滚动
    popupEl.addEventListener('wheel', (e) => {
      e.stopPropagation();

      let target = e.target;
      let scrollableContainer = null;

      while (target && target !== popupEl) {
        const overflowY = window.getComputedStyle(target).overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && target.scrollHeight > target.clientHeight) {
          scrollableContainer = target;
          break;
        }
        target = target.parentElement;
      }

      if (scrollableContainer) {
        const scrollTop = scrollableContainer.scrollTop;
        const scrollHeight = scrollableContainer.scrollHeight;
        const clientHeight = scrollableContainer.clientHeight;
        const delta = e.deltaY;

        // 在可滚动区域顶部向上滚、或底部向下滚时，阻止穿透滚动外部网页
        if ((delta < 0 && scrollTop <= 0) || (delta > 0 && scrollTop + clientHeight >= scrollHeight - 1)) {
          e.preventDefault();
        }
      } else {
        // 弹窗非滚动区，禁用网页默认滚动
        e.preventDefault();
      }
    }, { passive: false });

    return popupEl;
  }

  // 开始拖动
  function startDrag(e, popupEl) {
    if (e.target.closest('.ai-translator-btn')) return; // 点击按钮不触发拖动

    activeDragPopup = popupEl;
    popupEl.classList.add('ai-translator-dragging');
    popupEl.style.zIndex = ++maxZIndex;

    const rect = popupEl.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    dragOffsetX = e.clientX + scrollX - (rect.left + scrollX);
    dragOffsetY = e.clientY + scrollY - (rect.top + scrollY);

    e.preventDefault();
  }

  // 拖动中
  document.addEventListener('mousemove', (e) => {
    if (!activeDragPopup) return;

    activeDragPopup.dataset.isDragged = 'true';

    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    let newLeft = e.clientX + scrollX - dragOffsetX;
    let newTop = e.clientY + scrollY - dragOffsetY;

    // 边界限制
    const rect = activeDragPopup.getBoundingClientRect();
    const margin = 10;
    newLeft = Math.max(scrollX + margin, Math.min(newLeft, scrollX + window.innerWidth - rect.width - margin));
    newTop = Math.max(scrollY + margin, Math.min(newTop, scrollY + window.innerHeight - rect.height - margin));

    activeDragPopup.style.left = newLeft + 'px';
    activeDragPopup.style.top = newTop + 'px';
  });

  // 结束拖动
  document.addEventListener('mouseup', () => {
    if (activeDragPopup) {
      activeDragPopup.classList.remove('ai-translator-dragging');
      activeDragPopup = null;
    }
  });

  // 定位弹窗
  function positionPopup(popupEl, range) {
    if (!popupEl || !popupEl.isConnected) return;

    // 如果用户手动拖拽过该弹窗，保持用户拖拽后的位置，不再重置
    if (popupEl.dataset.isDragged === 'true') return;

    const targetRange = range || lastSelectionRange;
    if (!targetRange) return;

    const rect = targetRange.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    const margin = 12;
    const popupWidth = popupEl.offsetWidth || 380;
    const popupHeight = popupEl.offsetHeight || 250;

    // 默认优先定位在选区右侧（与选区顶部齐平）
    let left = rect.right + scrollX + 10;
    let top = rect.top + scrollY - 4;

    // 边界检测：如果选区右侧放置会超出屏幕右边缘
    if (left + popupWidth > scrollX + window.innerWidth - margin) {
      // 贴合屏幕右侧边距
      left = scrollX + window.innerWidth - popupWidth - margin;

      // 若选区较短（比如单词或短句）且选区左侧空间足够，则尝试放在选区左侧
      if (rect.left + scrollX > popupWidth + margin * 2 && (rect.right - rect.left) < 300) {
        left = rect.left + scrollX - popupWidth - 10;
      }
    }

    // 确保左侧不超出屏幕
    if (left < scrollX + margin) {
      left = scrollX + margin;
    }

    // 垂直边界检测：避免底部超出屏幕
    if (top + popupHeight > scrollY + window.innerHeight - margin) {
      top = scrollY + window.innerHeight - popupHeight - margin;
    }
    // 确保顶部不超出屏幕
    if (top < scrollY + margin) {
      top = scrollY + margin;
    }

    popupEl.style.left = Math.round(left) + 'px';
    popupEl.style.top = Math.round(top) + 'px';
  }

  // 隐藏指定弹窗
  function hidePopup(popupEl) {
    if (popupEl && popupEl.isConnected) {
      popupEl.classList.add('ai-translator-hiding');
      setTimeout(() => {
        if (popupEl && popupEl.isConnected) {
          popupEl.remove();
        }
      }, 200);
    }
  }

  // 单个英文单词检测（参照 saladict bing dict 适用场景）
  function isSingleEnglishWord(text) {
    const t = text.trim();
    if (!t) return false;
    if (t.length > 50) return false;
    // 单个词：仅字母、连字符、撇号
    return /^[a-zA-Z][a-zA-Z'-]*$/.test(t);
  }

  // 发送翻译请求（自动回退）
  function translate(text, popupEl, range) {
    // 单个英文单词优先走必应词典
    if (isSingleEnglishWord(text)) {
      translateWithBingDict(text, popupEl, range);
      return;
    }
    translateWithAI(text, popupEl, range);
  }

  function decodeHtmlEntities(str) {
    const ta = document.createElement('textarea');
    ta.innerHTML = str;
    return ta.value;
  }

  function stripTags(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return decodeHtmlEntities(doc.body.innerText || '').trim();
  }

  function parseBingDictHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const container = doc.getElementById('content_container');
    if (!container) return null;

    const name = container.getAttribute('name');
    const hdEl = doc.querySelector('.client_def_hd_hd');
    const word = hdEl ? hdEl.textContent.trim() : '';
    if (!word) return null;

    if (name === 'translateresult') {
      const mtEl = doc.querySelector('.client_trans_head, .client_mt');
      return { type: 'machine', title: word, mt: mtEl ? stripTags(mtEl.innerHTML) : word };
    }

    if (name === 'sentenceresult' || name === 'homepage') {
      return { type: 'related', title: word, defs: [] };
    }

    const BING_BASE = 'https://cn.bing.com';
    const toAbs = p => p && !p.startsWith('http') ? BING_BASE + p : p;
    const phsym = [];
    doc.querySelectorAll('.client_def_hd_pn').forEach(pn => {
      const audioEl = pn.parentElement ? pn.parentElement.querySelector('[data-pronunciation]') : null;
      const pron = audioEl ? toAbs(audioEl.getAttribute('data-pronunciation')) : '';
      const txt = pn.textContent.trim();
      const langM = txt.match(/^(?:美国|英国|美|英)/);
      const ipaM = txt.match(/(\[[^\]]+\])/);
      let lang = langM ? langM[0] : '';
      if (lang === '美国') lang = '美';
      if (lang === '英国') lang = '英';
      phsym.push({ lang, pron: ipaM ? ipaM[1] : '', audio: pron });
    });

    const cdefMap = {};
    doc.querySelectorAll('.client_def_bar').forEach(bar => {
      if (bar.closest('#clienthomoid, #clientcrossid, #clientwebtid')) return;
      if (bar.querySelector('.client_def_title_web')) return;
      const posEl = bar.querySelector('.client_def_title, .client_def_title_web');
      if (!posEl) return;
      const pos = posEl.textContent.trim();
      const contentEl = bar.querySelector('.client_def_list_word_content, .client_def_list_word_bar');
      if (!contentEl) return;
      let raw = contentEl.textContent.trim();
      raw = raw.replace(/；\s*$/, '').trim();
      const defs = raw.split(/；/).map(s => s.trim()).filter(Boolean);
      if (!cdefMap[pos]) cdefMap[pos] = [];
      cdefMap[pos].push(...defs);
    });
    const cdef = Object.entries(cdefMap).map(([pos, defs]) => ({ pos, def: defs.join('；') }));

    const edefList = [];
    const homoContainers = doc.querySelectorAll('#clienthomoid, #homoid, .client_def_homo');
    homoContainers.forEach(container => {
      const bars = container.querySelectorAll('.client_def_bar, .client_def_homo_bar');
      if (bars.length > 0) {
        bars.forEach(bar => {
          const posEl = bar.querySelector('.client_def_title, .client_def_title_web');
          const pos = posEl ? posEl.textContent.trim() : '';
          const rawItems = [];
          bar.querySelectorAll('.client_def_list_word_content, .client_def_list_word_bar, .client_def_homo_item').forEach(el => {
            let txt = stripTags(el.innerHTML).trim();
            if (txt) {
              txt = txt.replace(/；\s*$/, '').trim();
              rawItems.push(txt);
            }
          });
          if (rawItems.length === 0) {
            let txt = stripTags(bar.innerHTML).replace(pos, '').trim();
            if (txt) rawItems.push(txt);
          }
          const items = rawItems.map((item, idx) => {
            if (/^\d+[\.\s]/.test(item)) return item;
            return `${idx + 1}. ${item}`;
          });
          if (items.length > 0) {
            edefList.push({ pos, items });
          }
        });
      } else {
        const rawItems = [];
        container.querySelectorAll('.client_def_list_word_content, .client_def_list_word_bar').forEach(el => {
          let txt = stripTags(el.innerHTML).trim();
          if (txt) rawItems.push(txt);
        });
        const items = rawItems.map((item, idx) => {
          if (/^\d+[\.\s]/.test(item)) return item;
          return `${idx + 1}. ${item}`;
        });
        if (items.length > 0) {
          edefList.push({ pos: '', items });
        }
      }
    });
    const edef = edefList;

    const infs = [];
    doc.querySelectorAll('.client_word_change_word').forEach(el => {
      const label = (el.getAttribute('title') || '').trim();
      const form = el.textContent.trim();
      if (form && form !== word && label) infs.push({ label, form });
    });

    const sentences = [];
    doc.querySelectorAll('#sentenceSeg .client_sentence_list').forEach(item => {
      const enEl = item.querySelector('.client_sen_en');
      const cnEl = item.querySelector('.client_sen_cn');
      const audioEl = item.querySelector('[data-mp3link]');
      if (!enEl || !cnEl) return;
      const en = stripTags(enEl.innerHTML).replace(/^["\s]+|["\s]+$/g, '');
      const chs = stripTags(cnEl.innerHTML);
      const mp3 = audioEl ? toAbs(audioEl.getAttribute('data-mp3link')) : '';
      sentences.push({ en, chs, mp3 });
    });

    return { type: 'lex', title: word, phsym, cdef, edef, infs, sentences };
  }

  // 检查插件上下文是否有效
  function isExtensionValid() {
    try {
      return Boolean(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  function translateWithBingDict(text, popupEl, range) {
    showLoading('必应词典查询中...', popupEl);
    if (!isExtensionValid()) {
      showError('插件已被重载，请刷新当前网页以重新加载', popupEl);
      return;
    }
    try {
      chrome.runtime.sendMessage({
        type: 'bingDict',
        text: text
      }, (response) => {
        if (!popupEl || !popupEl.isConnected) return;
        let lastError = null;
        try {
          lastError = chrome.runtime?.lastError;
        } catch (e) {
          showError('插件上下文失效，请刷新当前网页', popupEl);
          return;
        }
        if (lastError) {
          showLoading('词典查询失败，切换 AI 翻译...', popupEl);
          translateWithAI(text, popupEl, range);
          return;
        }
        if (!response || !response.success || !response.html) {
          translateWithAI(text, popupEl, range);
          return;
        }
        const result = parseBingDictHtml(response.html);
        if (!result) {
          translateWithAI(text, popupEl, range);
          return;
        }
        showBingDictResult(result, text, popupEl, range);
      });
    } catch (e) {
      showError('插件上下文失效，请刷新当前网页以继续使用', popupEl);
    }
  }

  // 渲染必应词典结果
  function showBingDictResult(result, word, popupEl, range) {
    if (!popupEl || !popupEl.isConnected) return;
    const resultEl = popupEl.querySelector('.ai-translator-result');

    if (result.type === 'lex') {
      const speakerSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
      const phonetics = (result.phsym || []).map(p =>
        `<span class="bing-phon"><span class="bing-phon-lang">${escapeHtml(p.lang)} ${escapeHtml(p.pron)}</span>${p.audio ? ` <button class="bing-audio" data-url="${escapeHtml(p.audio)}" title="播放">${speakerSvg}</button>` : ''}</span>`
      ).join('');

      const hasEdef = result.edef && result.edef.length > 0;
      const cdefsHtml = (result.cdef || []).map(d =>
        `<div class="bing-def"><span class="bing-pos">${escapeHtml(d.pos)}</span><span class="bing-def-text">${escapeHtml(d.def)}</span></div>`
      ).join('') || '<div class="bing-no-def">暂无中释</div>';

      const edefsHtml = hasEdef
        ? (result.edef || []).map(d =>
            `<div class="bing-def bing-edef-group">
              ${d.pos ? `<span class="bing-pos">${escapeHtml(d.pos)}</span>` : ''}
              <div class="bing-edef-list">
                ${d.items.map(item => `<div class="bing-edef-item">${escapeHtml(item)}</div>`).join('')}
              </div>
            </div>`
          ).join('')
        : '<div class="bing-no-def">暂无英英释义</div>';

      const tabsHtml = `
        <div class="bing-tabs">
          <button class="bing-tab active" data-tab="cdef">简明中释</button>
          <button class="bing-tab" data-tab="edef">英英释义${hasEdef ? '' : ' (暂无)'}</button>
        </div>
      `;

      const infs = result.infs && result.infs.length
        ? `<div class="bing-infs"><span class="bing-infs-label">变形:</span> ${result.infs.map(i => `<span class="bing-inf">${escapeHtml(i.label)}: ${escapeHtml(i.form)}</span>`).join(' · ')}</div>`
        : '';
      const sentences = (result.sentences || []).map(s =>
        `<div class="bing-sentence">
          <div class="bing-sen-en">${escapeHtml(s.en)}${s.mp3 ? ` <button class="bing-audio" data-url="${escapeHtml(s.mp3)}" title="播放">${speakerSvg}</button>` : ''}</div>
          <div class="bing-sen-cn">${escapeHtml(s.chs)}</div>
        </div>`
      ).join('');

      resultEl.innerHTML = `
        <div class="bing-result">
          <div class="bing-head">
            <span class="bing-title">${escapeHtml(result.title || word)}</span>
            ${phonetics ? `<div class="bing-phonetics">${phonetics}</div>` : ''}
          </div>
          ${tabsHtml}
          <div class="bing-defs bing-tab-cdef">${cdefsHtml}</div>
          <div class="bing-defs bing-tab-edef" style="display:none;">${edefsHtml}</div>
          ${infs}
          ${sentences ? `<div class="bing-sentences">${sentences}</div>` : ''}
          <div class="bing-footer">
            <a href="https://cn.bing.com/dict/search?q=${encodeURIComponent(word)}" target="_blank" rel="noopener">必应词典 ↗</a>
            <button class="bing-ai-fallback">改用 AI 翻译</button>
          </div>
        </div>`;
    } else if (result.type === 'machine') {
      resultEl.innerHTML = `<div class="bing-result"><div class="bing-head"><span class="bing-title">${escapeHtml(result.title || word)}</span></div><div class="bing-mt">${escapeHtml(result.mt)}</div><div class="bing-footer"><a href="https://cn.bing.com/dict/search?q=${encodeURIComponent(word)}" target="_blank" rel="noopener">必应词典 ↗</a><button class="bing-ai-fallback">改用 AI 翻译</button></div></div>`;
    } else if (result.type === 'related') {
      const defs = (result.defs || []).map(g =>
        `<div class="bing-related-group"><div class="bing-related-title">${escapeHtml(g.title)}</div>${g.meanings.map(m => `<a class="bing-related-item" href="${escapeHtml(m.href)}" target="_blank" rel="noopener"><span class="bing-related-word">${escapeHtml(m.word)}</span><span class="bing-related-def">${escapeHtml(m.def)}</span></a>`).join('')}</div>`
      ).join('');
      resultEl.innerHTML = `<div class="bing-result"><div class="bing-head"><span class="bing-title">未找到「${escapeHtml(word)}」</span></div>${defs}<div class="bing-footer"><button class="bing-ai-fallback">改用 AI 翻译</button></div></div>`;
    }

    // 绑定选项卡切换
    resultEl.querySelectorAll('.bing-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        resultEl.querySelectorAll('.bing-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const cdefEl = resultEl.querySelector('.bing-tab-cdef');
        const edefEl = resultEl.querySelector('.bing-tab-edef');
        if (tab === 'cdef') {
          if (cdefEl) cdefEl.style.display = 'block';
          if (edefEl) edefEl.style.display = 'none';
        } else if (tab === 'edef') {
          if (cdefEl) cdefEl.style.display = 'none';
          if (edefEl) edefEl.style.display = 'block';
        }
        requestAnimationFrame(() => positionPopup(popupEl, range));
      });
    });

    // 绑定音频播放
    resultEl.querySelectorAll('.bing-audio').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-url');
        if (url) {
          const audio = new Audio(url);
          audio.play().catch(() => {});
        }
      });
    });
    // 绑定 AI 回退
    const aiBtn = resultEl.querySelector('.bing-ai-fallback');
    if (aiBtn) {
      aiBtn.addEventListener('click', () => {
        showLoading('AI 翻译中...', popupEl);
        translateWithAI(word, popupEl, range);
      });
    }

    // 内容渲染后重新计算位置以适配实际高度
    requestAnimationFrame(() => positionPopup(popupEl, range));
  }

  // AI 翻译请求（自动回退）
  function translateWithAI(text, popupEl, range) {
    if (!isExtensionValid()) {
      showError('插件已被重载，请刷新当前网页以重新加载', popupEl);
      return;
    }
    try {
      chrome.storage.local.get(['translatorConfigs', 'activeConfigId'], (result) => {
        if (!popupEl || !popupEl.isConnected) return;
        const configs = result ? (result.translatorConfigs || []) : [];
        const activeConfigId = result ? result.activeConfigId : null;

        if (configs.length === 0) {
          showError('没有可用的翻译配置', popupEl);
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

        // 过滤掉未配置好凭据的协议（系统内置配置或 Google 翻译不需要 API Key）
        const validConfigs = tryOrder.filter(c => c.isSystem || c.provider === 'google' || Boolean(c.apiKey));

        if (validConfigs.length === 0) {
          showError('请先在插件设置中配置有效的 API Key 或添加 Google 翻译协议', popupEl);
          return;
        }

        // 尝试请求，失败自动回退
        let attemptIndex = 0;
        const errors = [];

        function tryNext() {
          if (!popupEl || !popupEl.isConnected) return;
          if (attemptIndex >= validConfigs.length) {
            // 所有配置都失败，显示详细错误
            const detail = errors.map(e => `• ${e.name}: ${e.error}`).join('\n');
            showError(`所有配置请求失败\n${detail}`, popupEl);
            return;
          }

          const config = validConfigs[attemptIndex];
          const isFallback = attemptIndex > 0;

          if (isFallback) {
            showLoading(`「${validConfigs[attemptIndex - 1].name}」失败，正在尝试「${config.name}」...`, popupEl);
          }

          if (!isExtensionValid()) {
            showError('插件已被重载，请刷新当前网页以重新加载', popupEl);
            return;
          }

          try {
            chrome.runtime.sendMessage({
              type: 'translate',
              text: text,
              config: config
            }, (response) => {
              if (!popupEl || !popupEl.isConnected) return;
              let lastError = null;
              try {
                lastError = chrome.runtime?.lastError;
              } catch (e) {
                showError('插件上下文失效，请刷新当前网页', popupEl);
                return;
              }

              if (lastError) {
                // 网络错误，尝试下一个
                errors.push({ name: config.name, error: lastError.message || 'Extension Context Invalidated' });
                attemptIndex++;
                tryNext();
                return;
              }

              if (response && response.success) {
                showResult(response.result, isFallback ? config.name : null, popupEl, range);
              } else {
                // API 错误，尝试下一个
                errors.push({ name: config.name, error: response ? response.error : '请求失败' });
                attemptIndex++;
                tryNext();
              }
            });
          } catch (e) {
            showError('插件上下文失效，请刷新当前网页', popupEl);
          }
        }

        tryNext();
      });
    } catch (e) {
      showError('插件上下文失效，请刷新当前网页以继续使用', popupEl);
    }
  }

  // 显示翻译结果
  function showResult(result, fallbackName, popupEl, range) {
    if (!popupEl || !popupEl.isConnected) return;

    const resultEl = popupEl.querySelector('.ai-translator-result');
    const fallbackBadge = fallbackName
      ? `<div class="ai-translator-fallback-badge">由「${escapeHtml(fallbackName)}」翻译</div>`
      : '';
    resultEl.innerHTML = `${fallbackBadge}<div class="ai-translator-text">${escapeHtml(result)}</div>`;
    requestAnimationFrame(() => positionPopup(popupEl, range));
  }

  // 更新加载状态
  function showLoading(message, popupEl) {
    if (!popupEl || !popupEl.isConnected) return;
    const resultEl = popupEl.querySelector('.ai-translator-result');
    resultEl.innerHTML = `<div class="ai-translator-loading">
      <div class="ai-translator-spinner"></div>
      <span>${escapeHtml(message)}</span>
    </div>`;
  }

  // 显示错误
  function showError(message, popupEl) {
    if (!popupEl || !popupEl.isConnected) return;
    const resultEl = popupEl.querySelector('.ai-translator-result');
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
    // 点击触发按钮本身不处理
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
