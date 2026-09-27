/* ============================================================
   survey.js - 问卷互动系统（彻底修复版）
   ============================================================ */
(function() {
    'use strict';

    let surveyHistory = [];
    let surveySettings = { reactionMin: 3, reactionMax: 8 };

    function loadSurveyData() {
        if (typeof localforage === 'undefined') return;
        localforage.getItem('surveyHistory').then(h => { if (Array.isArray(h)) surveyHistory = h; });
        localforage.getItem('surveySettings').then(s => { if (s) Object.assign(surveySettings, s); });
    }

    function saveSurveyData() {
        if (typeof localforage === 'undefined') return;
        localforage.setItem('surveyHistory', surveyHistory);
        localforage.setItem('surveySettings', surveySettings);
    }

    // 安全地把消息塞进聊天记录里（直接操作原有的 messages 数组）
    function pushMessage(sender, text) {
        try {
            const msg = {
                id: Date.now() + Math.random(),
                sender: sender,
                text: text,
                timestamp: new Date(),
                type: 'normal',
                status: 'received'
            };
            if (typeof window.messages !== 'undefined' && Array.isArray(window.messages)) {
                window.messages.push(msg);
            } else if (typeof messages !== 'undefined' && Array.isArray(messages)) {
                messages.push(msg);
            } else {
                return;
            }
            if (typeof window.renderMessages === 'function') {
                window.renderMessages();
            } else if (typeof renderMessages === 'function') {
                renderMessages();
            }
            if (typeof window.throttledSaveData === 'function') window.throttledSaveData();
        } catch(e) { console.warn('问卷消息写入失败', e); }
    }

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

            pushMessage('user', `📄 [我发起了问卷] 问题：${q}`);
            surveyHistory.push(record);
            saveSurveyData();
            overlay.remove();

            setTimeout(() => {
                const answer = finalOptions[Math.floor(Math.random() * finalOptions.length)];
                record.answer = answer;
                saveSurveyData();
                if (answer === '字卡回复') {
                    pushMessage(settings.partnerName||'Ta', `📄 [Ta回答问卷] 选择了字卡回复`);
                    if (typeof window.simulateReply === 'function') window.simulateReply();
                } else {
                    pushMessage(settings.partnerName||'Ta', `📄 [Ta回答问卷] 选择了：${answer}`);
                }
          }, 180000);
        };
    };

    function renderHistory(container) {
        const mine = surveyHistory.filter(r => r.type === 'mine').reverse();
        const partner = surveyHistory.filter(r => r.type === 'partner').reverse();
        container.innerHTML = `
            <div style="margin-bottom:16px;">
                <div style="font-size:12px;font-weight:600;color:var(--accent-color);margin-bottom:8px;">📤 我问 Ta 的</div>
                ${mine.length ? mine.map(r => `
                    <div style="padding:10px;border:1px solid var(--border-color);border-radius:10px;margin-bottom:8px;background:var(--primary-bg);font-size:12px;">
                        <div style="font-weight:600;">${r.question}</div>
                        <div style="color:var(--text-secondary);margin-top:4px;">选项：${r.options.join(' / ')}</div>
                        ${r.answer ? `<div style="color:var(--accent-color);margin-top:4px;">答：${r.answer}</div>` : ''}
                    </div>
                `).join('') : '<div style="font-size:12px;color:var(--text-secondary);text-align:center;padding:10px;">暂无记录</div>'}
            </div>
            <div>
                <div style="font-size:12px;font-weight:600;color:var(--accent-color);margin-bottom:8px;">📥 Ta 问我的</div>
                ${partner.length ? partner.map(r => `
                    <div style="padding:10px;border:1px solid var(--border-color);border-radius:10px;margin-bottom:8px;background:var(--primary-bg);font-size:12px;">
                        <div style="font-weight:600;">${r.question}</div>
                        <div style="color:var(--text-secondary);margin-top:4px;">选项：${r.options.join(' / ')}</div>
                        ${r.answer ? `<div style="color:var(--accent-color);margin-top:4px;">我答：${r.answer}</div>` : ''}
                    </div>
                `).join('') : '<div style="font-size:12px;color:var(--text-secondary);text-align:center;padding:10px;">暂无记录</div>'}
            </div>
        `;
    }

    window.triggerPartnerSurvey = function() {
        const questions = ["今天想我了吗？", "今晚吃什么？", "周末去哪里玩？", "喜欢我吗？"];
        const optionsPool = [["想了", "没想", "字卡回复"], ["火锅", "烤肉", "随便", "字卡回复"], ["家里蹲", "出去玩", "字卡回复"], ["喜欢", "不喜欢", "字卡回复"]];
        const idx = Math.floor(Math.random() * questions.length);
        const q = questions[idx];
        const opts = optionsPool[idx];
        const record = { id: Date.now(), type: 'partner', question: q, options: opts, answer: null };

        pushMessage(settings.partnerName||'Ta', `📄 [Ta向你发起了问卷] 问题：${q}`);
        surveyHistory.push(record);
        saveSurveyData();

        const old = document.getElementById('survey-overlay');
        if (old) old.remove();
        const overlay = document.createElement('div');
        overlay.id = 'survey-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = `
            <div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:90%;max-width:400px;">
                <div style="font-size:16px;font-weight:700;margin-bottom:16px;">📄 Ta 问你：${q}</div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                    ${opts.map(opt => `<button class="partner-opt-btn" data-opt="${opt}" style="padding:12px;border:1.5px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:14px;cursor:pointer;">${opt}</button>`).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelectorAll('.partner-opt-btn').forEach(btn => {
            btn.onclick = () => {
                const answer = btn.getAttribute('data-opt');
                record.answer = answer;
                saveSurveyData();
                overlay.remove();
                if (answer === '字卡回复') {
                    pushMessage('user', `📄 [我回答问卷] 选择了字卡回复`);
                    if (typeof window.simulateReply === 'function') window.simulateReply();
                } else {
                    pushMessage('user', `📄 [我回答问卷] 选择了：${answer}`);
                }
            };
        });
    };

    window.initSurveyModule = loadSurveyData;

    setInterval(() => {
        if (Math.random() < 0.10) { // 10% 概率主动问你
            window.triggerPartnerSurvey();
        }
    }, 30 * 60 * 1000); // 每 30 分钟检查一次
})();