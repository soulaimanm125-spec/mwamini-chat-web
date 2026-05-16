document.addEventListener('DOMContentLoaded', () => {
    const chatInputForm = document.getElementById('chatInputForm');
    const messageInput = document.getElementById('messageInput');
    const messagesWindow = document.getElementById('messagesWindow');

    // Automatically snap scroll window container directly to latest payload
    const scrollToBottom = () => {
        messagesWindow.scrollTop = messagesWindow.scrollHeight;
    };
    scrollToBottom();

    // UI Interactive Event Handler logic
    if (chatInputForm) {
        chatInputForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const text = messageInput.value.trim();
            if (!text) return;

            // Generate outgoing sent message template node matching style specs
            const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            const messageNode = document.createElement('div');
            messageNode.className = 'message sent';
            messageNode.innerHTML = `
                <p>${escapeHTML(text)}</p>
                <span class="msg-time">${timeNow}</span>
            `;

            messagesWindow.appendChild(messageNode);
            messageInput.value = '';
            scrollToBottom();

            // Simulate simulated server automated loop logic response update
            setTimeout(() => {
                simulateIncomingResponse();
            }, 1200);
        });
    }

    // Defensive input parsing logic prevent security cross-script manipulation
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

    // Dynamic system response animation simulator
    function simulateIncomingResponse() {
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const targetNode = document.createElement('div');
        targetNode.className = 'message received';
        targetNode.innerHTML = `
            <span class="sender">Security Engine</span>
            <p>Data payload safely processed. MWAMINI secure database stream verified.</p>
            <span class="msg-time">${timeNow}</span>
        `;
        messagesWindow.appendChild(targetNode);
        scrollToBottom();
    }
});
