document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. AUTHENTICATION CONTROLLER SYSTEM
    // ==========================================
    const loginForm = document.getElementById('loginForm');
    const googleAuthBtn = document.getElementById('googleAuthBtn');
    const authErrorMessage = document.getElementById('authErrorMessage');
    const logoutBtn = document.getElementById('logoutBtn');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value.trim();

            // Safe credential checks for local simulation
            if (email === "demo@mwamini.com" && password === "password123") {
                window.location.href = 'dashboard.html';
            } else {
                authErrorMessage.style.display = "block";
                authErrorMessage.textContent = "Invalid entry. Use 'demo@mwamini.com' and 'password123'.";
            }
        });
    }

    if (googleAuthBtn) {
        googleAuthBtn.addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    // ==========================================
    // 2. CHAT & FILE ATTACHMENT CONTROLLER
    // ==========================================
    const chatInputForm = document.getElementById('chatInputForm');
    const messageInput = document.getElementById('messageInput');
    const messagesWindow = document.getElementById('messagesWindow');
    const fileAttachment = document.getElementById('fileAttachment');
    const previewDrawer = document.getElementById('previewDrawer');
    const previewFileName = document.getElementById('previewFileName');
    const cancelPreviewBtn = document.getElementById('cancelPreviewBtn');

    let activeFilePayload = null;

    const scrollToBottom = () => {
        if (messagesWindow) messagesWindow.scrollTop = messagesWindow.scrollHeight;
    };
    scrollToBottom();

    if (fileAttachment) {
        fileAttachment.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            activeFilePayload = {
                name: file.name,
                size: (file.size / 1024).toFixed(1) + " KB",
                type: file.type
            };

            previewFileName.textContent = `📎 Staged: ${activeFilePayload.name} (${activeFilePayload.size})`;
            previewDrawer.style.display = 'flex';
        });
    }

    if (cancelPreviewBtn) {
        cancelPreviewBtn.addEventListener('click', () => {
            clearFilePayload();
        });
    }

    function clearFilePayload() {
        activeFilePayload = null;
        if (fileAttachment) fileAttachment.value = '';
        if (previewDrawer) previewDrawer.style.display = 'none';
    }

    if (chatInputForm) {
        chatInputForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const text = messageInput.value.trim();
            if (!text && !activeFilePayload) return;

            const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const messageNode = document.createElement('div');
            messageNode.className = 'message sent';

            let bubbleContent = '';

            if (activeFilePayload) {
                bubbleContent += `
                    <div class="file-attachment-bubble">
                        <span class="file-icon">📁</span>
                        <div>
                            <p style="font-weight:600; font-size:13px;">${escapeHTML(activeFilePayload.name)}</p>
                            <span style="font-size:10px; opacity:0.7;">${activeFilePayload.size}</span>
                        </div>
                    </div>
                `;
            }

            if (text) {
                bubbleContent += `<p style="margin-top: ${activeFilePayload ? '6px' : '0px'}">${escapeHTML(text)}</p>`;
            }

            bubbleContent += `<span class="msg-time">${timeNow}</span>`;
            messageNode.innerHTML = bubbleContent;

            messagesWindow.appendChild(messageNode);
            messageInput.value = '';
            clearFilePayload();
            scrollToBottom();

            setTimeout(() => {
                simulateIncomingResponse();
            }, 1200);
        });
    }

    // ==========================================
    // 3. STATUS UPDATES TRAY SYSTEM
    // ==========================================
    const addStatusBtn = document.getElementById('addStatusBtn');
    const statusModal = document.getElementById('statusModal');
    const closeStatusModal = document.getElementById('closeStatusModal');
    const submitStatusBtn = document.getElementById('submitStatusBtn');
    const statusTextInput = document.getElementById('statusTextInput');
    const statusTray = document.querySelector('.status-tray');

    if (addStatusBtn) {
        addStatusBtn.addEventListener('click', () => {
            statusModal.style.display = 'flex';
        });
    }

    if (closeStatusModal) {
        closeStatusModal.addEventListener('click', () => {
            statusModal.style.display = 'none';
            statusTextInput.value = '';
        });
    }

    if (submitStatusBtn) {
        submitStatusBtn.addEventListener('click', () => {
            const statusText = statusTextInput.value.trim();
            if (!statusText) return;

            const newStatusItem = document.createElement('div');
            newStatusItem.className = 'status-item active-status';
            newStatusItem.title = statusText;
            newStatusItem.innerHTML = `
                <div class="status-circle ring-gold" style="background:#004d40; color:#d4af37;">ME</div>
                <span>${escapeHTML(statusText)}</span>
            `;

            statusTray.appendChild(newStatusItem);
            statusModal.style.display = 'none';
            statusTextInput.value = '';
        });
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    function simulateIncomingResponse() {
        if (!messagesWindow) return;
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const targetNode = document.createElement('div');
        targetNode.className = 'message received';
        targetNode.innerHTML = `
            <span class="sender">System</span>
            <p>Message acknowledged and stored to session stream history.</p>
            <span class="msg-time">${timeNow}</span>
        `;
        messagesWindow.appendChild(targetNode);
        scrollToBottom();
    }
});
