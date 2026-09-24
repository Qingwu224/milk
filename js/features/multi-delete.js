/* ============================================================
   multi-delete.js - 独立的多选删除功能
   绝对不干扰原有代码，随时可以删掉这个文件
   ============================================================ */
(function() {
    'use strict';

    function initMultiDelete() {
        // 1. 强制清理所有旧按钮和旧底栏（防止出现两个按钮）
        document.querySelectorAll('#multi-delete-btn').forEach(el => el.remove());
        document.querySelectorAll('#multi-delete-bar').forEach(el => el.remove());

        // 2. 动态创建底部操作栏
        const bar = document.createElement('div');
        bar.id = 'multi-delete-bar';
        bar.style.cssText = 'position:fixed; bottom:0; left:0; right:0; z-index:99999; background:var(--secondary-bg); border-top:1px solid var(--border-color); display:none; justify-content:space-between; padding:12px 16px; box-shadow: 0 -2px 10px rgba(0,0,0,0.1); padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));';
        bar.innerHTML = `
            <button id="multi-delete-cancel" style="flex:1; margin-right:8px; padding:10px; border-radius:10px; border:1px solid var(--border-color); background:var(--primary-bg); color:var(--text-secondary); font-size:14px; cursor:pointer;">取消</button>
            <button id="multi-delete-confirm" style="flex:2; padding:10px; border-radius:10px; border:none; background:#ff4757; color:#fff; font-size:14px; font-weight:600; cursor:pointer;">删除选中 (0)</button>
        `;
        document.body.appendChild(bar);

        // 3. 注入需要的样式
        const style = document.createElement('style');
        style.textContent = `
            .message-wrapper.selected-for-delete {
                background: rgba(255, 71, 87, 0.15) !important;
                border-radius: 12px;
            }
            .message-wrapper.selected-for-delete::after {
                content: "✓";
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                color: #ff4757;
                font-size: 20px;
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);

        const headerActions = document.querySelector('.header-actions');
        const chatContainer = document.getElementById('chat-container');
        const cancelBtn = document.getElementById('multi-delete-cancel');
        const confirmBtn = document.getElementById('multi-delete-confirm');
        let isMultiMode = false;
        let selectedIds = new Set();

        if (!headerActions || !chatContainer) return;

        // 4. 在顶部注入唯一的多选按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.id = 'multi-delete-btn';
        deleteBtn.className = 'action-btn';
        deleteBtn.title = '多选删除';
        deleteBtn.innerHTML = '<i class="fas fa-check-square"></i>';
        headerActions.appendChild(deleteBtn);

        // 5. 多选按钮点击开关
        deleteBtn.addEventListener('click', function() {
            isMultiMode = !isMultiMode;
            selectedIds.clear();
            if (isMultiMode) {
                deleteBtn.classList.add('active');
                bar.style.display = 'flex';
                if (typeof showNotification === 'function') showNotification('多选删除模式已开启', 'info', 2000);
            } else {
                deleteBtn.classList.remove('active');
                bar.style.display = 'none';
                document.querySelectorAll('.message-wrapper').forEach(el => { el.classList.remove('selected-for-delete'); el.style.opacity = '1'; });
            }
            updateCount();
        });

        // 6. 点击消息勾选
        chatContainer.addEventListener('click', function(e) {
            if (!isMultiMode) return;
            const wrapper = e.target.closest('.message-wrapper');
            if (!wrapper) return;
            if (e.target.closest('button') || e.target.closest('.message-meta-actions')) return;
            const msgId = wrapper.dataset.id;
            if (selectedIds.has(msgId)) {
                selectedIds.delete(msgId);
                wrapper.classList.remove('selected-for-delete');
                wrapper.style.opacity = '1';
            } else {
                selectedIds.add(msgId);
                wrapper.classList.add('selected-for-delete');
                wrapper.style.opacity = '0.5';
            }
            updateCount();
        });

        function updateCount() {
            if (confirmBtn) confirmBtn.textContent = '删除选中 (' + selectedIds.size + ')';
        }

        // 7. 确认删除
        confirmBtn.addEventListener('click', function() {
            if (selectedIds.size === 0) { if (typeof showNotification === 'function') showNotification('请先选择要删除的消息', 'warning'); return; }
            if (!confirm('确定要删除选中的 ' + selectedIds.size + ' 条消息吗？')) return;
            if (typeof window.messages !== 'undefined' && Array.isArray(window.messages)) {
                window.messages = window.messages.filter(m => !selectedIds.has(String(m.id)));
            } else if (typeof messages !== 'undefined' && Array.isArray(messages)) {
                messages = messages.filter(m => !selectedIds.has(String(m.id)));
            }
            isMultiMode = false;
            deleteBtn.classList.remove('active');
            bar.style.display = 'none';
            document.querySelectorAll('.message-wrapper').forEach(el => { el.classList.remove('selected-for-delete'); el.style.opacity = '1'; });
            if (typeof window.renderMessages === 'function') window.renderMessages();
            else if (typeof renderMessages === 'function') renderMessages();
            if (typeof window.throttledSaveData === 'function') window.throttledSaveData();
            else if (typeof throttledSaveData === 'function') throttledSaveData();
            if (typeof showNotification === 'function') showNotification('已删除选中消息', 'success');
            selectedIds.clear();
        });

        // 8. 取消操作
        cancelBtn.addEventListener('click', function() {
            isMultiMode = false;
            deleteBtn.classList.remove('active');
            bar.style.display = 'none';
            document.querySelectorAll('.message-wrapper').forEach(el => { el.classList.remove('selected-for-delete'); el.style.opacity = '1'; });
            selectedIds.clear();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(initMultiDelete, 500));
    } else {
        setTimeout(initMultiDelete, 500);
    }
})();