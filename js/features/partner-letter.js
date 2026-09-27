/* ============================================================
   partner-letter.js - 梦角主动写信（独立安全版）
   功能：隔一段时间，Ta 会主动给你写一封信，内容从字卡库随机抽
   ============================================================ */
(function() {
    'use strict';

    const SETTINGS_KEY = 'partnerLetterSettings';

    let settings = {
        enabled: false,
        intervalMinutes: 1440, // 默认 1 天
        sentenceCount: 5,      // 默认写 5 句
        lastLetterTime: 0
    };

    function loadSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
            if (saved) Object.assign(settings, saved);
        } catch(e) {}
    }

    function saveSettings() {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    // 生成信件内容（从字卡库随机抽取拼接）
    function generateLetterContent() {
        const sourcePool = (typeof customReplies !== 'undefined' && Array.isArray(customReplies))
            ? customReplies.filter(function(r) { return r && String(r).trim(); }) : [];
        if (sourcePool.length === 0) return null;

        const target = parseInt(settings.sentenceCount) || 5;
        const count = Math.min(target, sourcePool.length);
        let content = '';
        for (let i = 0; i < count; i++) {
            const sentence = String(sourcePool[Math.floor(Math.random() * sourcePool.length)]).trim();
            const punctuation = Math.random() < 0.2 ? '！' : (Math.random() < 0.2 ? '……' : '。');
            content += sentence + punctuation;
        }
        return content;
    }

    async function sendPartnerLetter() {
        if (typeof localforage === 'undefined') return;
        if (!settings.enabled) return;

        const content = generateLetterContent();
        if (!content) {
            if (typeof showNotification === 'function') showNotification('字卡库为空，Ta 写不出信', 'warning');
            return;
        }

        try {
            const data = await localforage.getItem(getStorageKey('envelopeData'));
            const envelopeData = data || { outbox: [], inbox: [] };
            if (!Array.isArray(envelopeData.inbox)) envelopeData.inbox = [];

            const letter = {
                id: 'partner_letter_' + Date.now(),
                refId: null,
                originalContent: '',
                content: content,
                receivedTime: Date.now(),
                isNew: true,
                isPartnerInitiated: true
            };

            envelopeData.inbox.push(letter);
            await localforage.setItem(getStorageKey('envelopeData'), envelopeData);

            settings.lastLetterTime = Date.now();
            saveSettings();

            // 弹窗提示
            if (typeof window.showEnvelopeReplyPopup === 'function') {
                window.showEnvelopeReplyPopup(letter);
            } else if (typeof showNotification === 'function') {
                showNotification('Ta 给你写了一封信 💌，快去「信封投递」里看看吧', 'info', 5000);
            }

            // 聊天记录提示
            if (typeof window.addMessage === 'function') {
                window.addMessage({
                    id: Date.now(),
                    sender: (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : 'Ta',
                    text: '💌 给你写了一封信，去「信封投递」里看看吧',
                    timestamp: new Date(),
                    type: 'normal'
                });
            }
        } catch(e) {
            console.warn('[partner-letter] 写信失败', e);
        }
    }

    function checkAndSend() {
        if (!settings.enabled) return;
        const elapsed = Date.now() - settings.lastLetterTime;
        if (elapsed >= settings.intervalMinutes * 60 * 1000) {
            sendPartnerLetter();
        }
    }

    function injectSettingsUI() {
        const rhythmPanel = document.getElementById('cs-panel-rhythm');
        if (!rhythmPanel || document.getElementById('partner-letter-settings')) return;

        const card = document.createElement('div');
        card.id = 'partner-letter-settings';
        card.className = 'cs-card';
        card.style.marginTop = '16px';
        card.innerHTML = `
            <div class="setting-pill-row" id="partner-letter-toggle">
                <span class="setting-pill-icon"><i class="fas fa-envelope-open-text"></i></span>
                <span class="setting-pill-label">Ta 主动写信 <span style="font-size:11px;color:var(--text-secondary);font-weight:400;">开启后 Ta 会隔一段时间主动给你写信</span></span>
                <div class="setting-pill-switch"><div class="setting-pill-knob"></div></div>
            </div>
            <div id="partner-letter-control" style="display:none;padding:10px 14px;border-top:1px solid var(--border-color);">
                <div class="cs-slider-row" style="border-bottom:none;padding:4px 0;">
                    <span class="cs-slider-label" style="width:52px;font-size:12px;">间隔</span>
                    <input type="range" min="1440" max="7200" step="60" value="${settings.intervalMinutes}" class="font-size-slider" id="partner-letter-interval-slider" style="flex:1;margin:0 8px;">
                    <span class="cs-slider-val" id="partner-letter-interval-value" style="font-size:12px;">1.0天</span>
                </div>
                <div class="cs-slider-row" style="border-bottom:none;padding:4px 0;">
                    <span class="cs-slider-label" style="width:52px;font-size:12px;">句数</span>
                    <input type="range" min="2" max="20" step="1" value="${settings.sentenceCount}" class="font-size-slider" id="partner-letter-count-slider" style="flex:1;margin:0 8px;">
                    <span class="cs-slider-val" id="partner-letter-count-value" style="font-size:12px;">${settings.sentenceCount} 句</span>
                </div>
                <div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">✦ 信件内容会从你的字卡库里随机抽取拼接</div>
            </div>
        `;
        rhythmPanel.appendChild(card);

        updateUI();

        document.getElementById('partner-letter-toggle').addEventListener('click', function() {
            settings.enabled = !settings.enabled;
            if (settings.enabled && settings.lastLetterTime === 0) settings.lastLetterTime = Date.now();
            saveSettings();
            updateUI();
            if (typeof showNotification === 'function') {
                showNotification(settings.enabled ? '已开启 Ta 主动写信' : '已关闭 Ta 主动写信', 'success');
            }
        });

        document.getElementById('partner-letter-interval-slider').addEventListener('input', function(e) {
            settings.intervalMinutes = parseInt(e.target.value);
            saveSettings();
            const valEl = document.getElementById('partner-letter-interval-value');
            valEl.textContent = (settings.intervalMinutes / 1440).toFixed(1) + '天';
        });

        document.getElementById('partner-letter-count-slider').addEventListener('input', function(e) {
            settings.sentenceCount = parseInt(e.target.value);
            saveSettings();
            document.getElementById('partner-letter-count-value').textContent = settings.sentenceCount + ' 句';
        });
    }

    function updateUI() {
        const toggle = document.getElementById('partner-letter-toggle');
        const control = document.getElementById('partner-letter-control');
        if (toggle) toggle.classList.toggle('active', settings.enabled);
        if (control) control.style.display = settings.enabled ? 'block' : 'none';
        const intervalSlider = document.getElementById('partner-letter-interval-slider');
        if (intervalSlider) intervalSlider.value = settings.intervalMinutes;
        const valEl = document.getElementById('partner-letter-interval-value');
        if (valEl) valEl.textContent = (settings.intervalMinutes / 1440).toFixed(1) + '天';
        const countSlider = document.getElementById('partner-letter-count-slider');
        if (countSlider) countSlider.value = settings.sentenceCount;
        const countEl = document.getElementById('partner-letter-count-value');
        if (countEl) countEl.textContent = settings.sentenceCount + ' 句';
    }

    function init() {
        loadSettings();
        setTimeout(injectSettingsUI, 800);
        setInterval(checkAndSend, 60 * 1000); // 每分钟检查
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 500); });
    } else {
        setTimeout(init, 500);
    }
})();