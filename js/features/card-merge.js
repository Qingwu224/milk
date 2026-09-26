/* ============================================================
   card-merge.js - 拼字卡（独立安全版，支持符号多选与随机拼接）
   ============================================================ */
(function() {
    'use strict';

    // 1. 读取设置
    let isEnabled = localStorage.getItem('cardMergeEnabled') === 'true';
    let count = parseInt(localStorage.getItem('cardMergeCount') || '2');
    let symbolList = [];
    try { symbolList = JSON.parse(localStorage.getItem('cardMergeSymbolList') || '[]'); } catch(e) {}
    if (symbolList.length === 0) symbolList = ['，']; // 默认中文逗号

    // 2. 注入设置面板
    function injectMergeSettings() {
        const chatPanel = document.getElementById('cs-panel-chat');
        if (!chatPanel || document.getElementById('card-merge-settings')) return;

        const card = document.createElement('div');
        card.id = 'card-merge-settings';
        card.className = 'cs-card';
        card.style.marginTop = '16px';

        const symbolsConfig = [
            { val: '，', label: '，' }, { val: '。', label: '。' }, { val: '、', label: '、' },
            { val: '；', label: '；' }, { val: '：', label: '：' }, { val: '？', label: '？' },
            { val: '！', label: '！' }, { val: '……', label: '……' }, { val: '—', label: '—' },
            { val: ' ', label: '空格' }, { val: '~', label: '~' }, { val: '\n', label: '换行' }
        ];

        let symbolsHtml = '';
        symbolsConfig.forEach(function(item) {
            const isActive = symbolList.includes(item.val);
            symbolsHtml += `<button class="modal-btn merge-sym-btn ${isActive ? 'modal-btn-primary' : 'modal-btn-secondary'}" data-sym="${item.val}" style="padding:4px 10px;font-size:12px;margin-bottom:4px;">${item.label}</button>`;
        });

        card.innerHTML = `
            <p class="cs-group-label" style="margin-top:16px;">拼字卡设置</p>
            <div class="setting-pill-row" id="card-merge-toggle">
                <span class="setting-pill-icon"><i class="fas fa-layer-group"></i></span>
                <span class="setting-pill-label">启用拼字卡 <span style="font-size:11px;color:var(--text-secondary);font-weight:400;">开启后概率 15%，多条字卡拼接发送</span></span>
                <div class="setting-pill-switch"><div class="setting-pill-knob"></div></div>
            </div>
            <div id="card-merge-control" style="display:none;padding:10px 14px;border-top:1px solid var(--border-color);">
                <div class="cs-slider-row" style="border-bottom:none;padding:4px 0;">
                    <span class="cs-slider-label" style="width:52px;font-size:12px;">条数</span>
                    <input type="range" min="2" max="5" step="1" value="${count}" class="font-size-slider" id="card-merge-count-slider" style="flex:1;margin:0 8px;">
                    <span class="cs-slider-val" id="card-merge-count-value" style="font-size:12px;">${count} 条</span>
                </div>
                <div class="cs-slider-row" style="border-bottom:none;padding:4px 0;">
                    <span class="cs-slider-label" style="width:52px;font-size:12px;">符号</span>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;flex:1;" id="card-merge-symbol-group">
                        ${symbolsHtml}
                    </div>
                </div>
                <div style="font-size:11px;color:var(--accent-color);margin-top:4px;">✦ 点击可多选，拼卡时随机抽取其中一个符号</div>
            </div>
        `;
        chatPanel.appendChild(card);

        updateUI();

        // 开关
        document.getElementById('card-merge-toggle').addEventListener('click', function() {
            isEnabled = !isEnabled;
            localStorage.setItem('cardMergeEnabled', isEnabled);
            updateUI();
            if (typeof showNotification === 'function') {
                showNotification(isEnabled ? '已开启拼字卡（15%概率）' : '已关闭拼字卡', 'success');
            }
        });

        // 滑块
        document.getElementById('card-merge-count-slider').addEventListener('input', function(e) {
            count = parseInt(e.target.value);
            localStorage.setItem('cardMergeCount', count);
            document.getElementById('card-merge-count-value').textContent = count + ' 条';
        });

        // 符号多选逻辑
        card.querySelectorAll('.merge-sym-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const sym = this.dataset.sym;
                const idx = symbolList.indexOf(sym);
                if (idx > -1) {
                    if (symbolList.length <= 1) {
                        if (typeof showNotification === 'function') showNotification('至少保留一个符号', 'warning');
                        return;
                    }
                    symbolList.splice(idx, 1); // 取消选中
                } else {
                    symbolList.push(sym); // 选中
                }
                localStorage.setItem('cardMergeSymbolList', JSON.stringify(symbolList));
                updateUI();
            });
        });
    }

    function updateUI() {
        const toggle = document.getElementById('card-merge-toggle');
        const control = document.getElementById('card-merge-control');
        const slider = document.getElementById('card-merge-count-slider');
        const valueEl = document.getElementById('card-merge-count-value');

        if (toggle) toggle.classList.toggle('active', isEnabled);
        if (control) control.style.display = isEnabled ? 'block' : 'none';
        if (slider) slider.value = count;
        if (valueEl) valueEl.textContent = count + ' 条';

        document.querySelectorAll('.merge-sym-btn').forEach(function(btn) {
            const isActive = symbolList.includes(btn.dataset.sym);
            btn.classList.toggle('modal-btn-primary', isActive);
            btn.classList.toggle('modal-btn-secondary', !isActive);
        });
    }

    // 3. 拦截 simulateReply
    function wrapSimulateReply() {
        if (typeof window.simulateReply !== 'function' || window._mergeWrapped) return;
        window._mergeWrapped = true;

        const originalSimulateReply = window.simulateReply;
        window.simulateReply = function() {
            if (isEnabled && Math.random() < 0.15) {
                const replyPool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
                    ? customReplies.filter(function(r) { return r && String(r).trim(); }) : [];
                if (replyPool.length >= 2) {
                    const total = Math.min(count, replyPool.length);
                    const merged = [];
                    const used = new Set();
                    while (merged.length < total) {
                        const idx = Math.floor(Math.random() * replyPool.length);
                        if (!used.has(idx)) { used.add(idx); merged.push(String(replyPool[idx]).trim()); }
                    }
                    
                    // 从多选符号里随机选一个
                    let randomSymbol = '，';
                    if (symbolList.length > 0) {
                        randomSymbol = symbolList[Math.floor(Math.random() * symbolList.length)];
                    }
                    // 如果是换行符，特殊处理
                    if (randomSymbol === '\n') randomSymbol = '<br>';

                    const finalText = merged.join(randomSymbol);
                    if (typeof window.addMessage === 'function') {
                        window.addMessage({
                            id: Date.now(),
                            sender: (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : 'Ta',
                            text: finalText,
                            timestamp: new Date(),
                            type: 'normal'
                        });
                    }
                    if (typeof playSound === 'function') playSound('message');
                    return;
                }
            }
            return originalSimulateReply.apply(this, arguments);
        };
    }

    // 4. 初始化
    function init() {
        injectMergeSettings();
        setTimeout(wrapSimulateReply, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 500); });
    } else {
        setTimeout(init, 500);
    }
})();