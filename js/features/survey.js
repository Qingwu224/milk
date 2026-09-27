/* ============================================================
   survey.js - 问卷互动系统
   ============================================================ */
(function() {
    'use strict';

    // 存储数据
    let surveyHistory = [];
    let surveySettings = { reactionMin: 3, reactionMax: 8 };

    // 加载数据
    function loadSurveyData() {
        if (typeof localforage === 'undefined') return;
        localforage.getItem('surveyHistory').then(h => { if (Array.isArray(h)) surveyHistory = h; });
        localforage.getItem('surveySettings').then(s => { if (s) Object.assign(surveySettings, s); });
    }

    // 保存数据
    function saveSurveyData() {
        if (typeof localforage === 'undefined') return;
        localforage.setItem('surveyHistory', surveyHistory);
        localforage.setItem('surveySettings', surveySettings);
    }

    // 打开问卷弹窗
    window.openSurveyForPartner = function() {
        const old = document.getElementById('survey-overlay');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'survey-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;';

        overlay.innerHTML = `
            <div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:90%;max-width:400px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,0.3);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <div style="font-size:16px;font-weight:700;color:var(--text-primary);">📄 问卷互动</div>
                    <button id="survey-close" style="background:none;border:none;font-size:20px;color:var(--text-secondary);cursor:pointer;">×</button>
                </div>
                <div style="display:flex;gap:8px;margin-bottom:16px;">
                    <button id="tab-ask" class="survey-tab" style="flex:1;padding:8px;border-radius:10px;border:1.5px solid var(--accent-color);background:var(--accent-color);color:#fff;font-size:13px;cursor:pointer;">我问 Ta</button>
                    <button id="tab-history" class="survey-tab" style="flex:1;padding:8px;border-radius:10px;border:1.5px solid var(--border-color);background:var(--primary-bg);color:var(--text-secondary);font-size:13px;cursor:pointer;">历史记录</button>
                </div>
                <div id="panel-ask" style="flex:1;overflow-y:auto;min-height:0;">
                    <input id="survey-q" type="text" placeholder="输入你想问的问题..." style="width:100%;box-sizing:border-box;padding:10px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);margin-bottom:10px;outline:none;">
                    <textarea id="survey-options" rows="3" placeholder="选项（每行一个，至少两项）" style="width:100%;box-sizing:border-box;padding:10px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);margin-bottom:8px;resize:none;outline:none;"></textarea>
                    <div style="font-size:11px;color:var(--accent-color);margin-bottom:16px;">✦ 自动追加「字卡回复」选项</div>
                    <button id="survey-send" style="width:100%;padding:12px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:14px;font-weight:600;cursor:pointer;">发送问卷</button>
                </div>
                <div id="panel-history" style="display:none;flex:1;overflow-y:auto;min-height:0;"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('#survey-close').onclick = () => overlay.remove();
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

        const tabAsk = overlay.querySelector('#tab-ask');
        const tabHis = overlay.querySelector('#tab-history');
        const panelAsk = overlay.querySelector('#panel-ask');
        const panelHis = overlay.querySelector('#panel-history');

        tabAsk.onclick = () => { tabAsk.style.background='var(--accent-color)'; tabAsk.style.color='#fff'; tabHis.style.background='var(--primary-bg)'; tabHis.style.color='var(--text-secondary)'; panelAsk.style.display='block'; panelHis.style.display='none'; };
        tabHis.onclick = () => { tabHis.style.background='var(--accent-color)'; tabHis.style.color='#fff'; tabAsk.style.background='var(--primary-bg)'; tabAsk.style.color='var(--text-secondary)'; panelAsk.style.display='none'; panelHis.style.display='block'; renderHistory(panelHis); };

        overlay.querySelector('#survey-send').onclick = () => {
            const q = overlay.querySelector('#survey-q').value.trim();
            const opts = overlay.querySelector('#survey-options').value.split('\n').map(s=>s.trim()).filter(Boolean);
            if (!q || opts.length < 2) return alert('请输入问题和至少两个选项');
            
            const finalOptions = [...opts, '字卡回复'];
            const record = { id: Date.now(), type: 'mine', question: q, options: finalOptions, answer: null };

            // 同步到聊天
            if (typeof window.addMessage === 'function') {
                window.addMessage({ id: Date.now(), sender: 'system', text: `📄 我问了 Ta 一个问题：<b>${q}</b>`, timestamp: new Date(), type: 'system' });
            }
            surveyHistory.push(record);
            saveSurveyData();
            overlay.remove();

            // 模拟对方回答
            setTimeout(() => {
                const answer = finalOptions[Math.floor(Math.random() * finalOptions.length)];
                record.answer = answer;
                saveSurveyData();
                if (typeof window.addMessage === 'function') {
                    if (answer === '字卡回复') {
                        window.addMessage({ id: Date.now(), sender: settings.partnerName||'Ta', text: '【字卡回复】', timestamp: new Date(), type: 'normal' });
                        if (typeof window.simulateReply === 'function') window.simulateReply();
                    } else {
                        window.addMessage({ id: Date.now(), sender: settings.partnerName||'Ta', text: `选择了：<b>${answer}</b>`, timestamp: new Date(), type: 'normal' });
                    }
                }
            }, (surveySettings.reactionMin + Math.random() * (surveySettings.reactionMax - surveySettings.reactionMin)) * 1000);
        };
    };

    function renderHistory(container) {
        const mine = surveyHistory.filter(r => r.type === 'mine').reverse();
        container.innerHTML = `
            <div style="font-size:12px;font-weight:600;color:var(--accent-color);margin-bottom:8px;">📤 我问 Ta 的</div>
            ${mine.length ? mine.map(r => `
                <div style="padding:10px;border:1px solid var(--border-color);border-radius:10px;margin-bottom:8px;background:var(--primary-bg);font-size:12px;">
                    <div style="font-weight:600;">${r.question}</div>
                    <div style="color:var(--text-secondary);margin-top:4px;">选项：${r.options.join(' / ')}</div>
                    ${r.answer ? `<div style="color:var(--accent-color);margin-top:4px;">答：${r.answer}</div>` : ''}
                </div>
            `).join('') : '<div style="font-size:12px;color:var(--text-secondary);text-align:center;padding:20px;">暂无记录</div>'}
        `;
    }

    window.initSurveyModule = loadSurveyData;
})();