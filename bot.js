// Arte Dental Chatbot Refactored (Bären Haus Pattern)

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    WORKERS_URL: 'https://shy-sea-f6b0.cogniqaiamruthap.workers.dev',

    BUSINESS_INFO: {
        name: 'Arte Dental',
        website: 'www.artedental.co.uk',
        location: '85 Bishop Street, Birmingham, B5 6EE, United Kingdom (Digbeth area, near Bull Ring & New Street Station)',
        phone: '+44 7398 243653',
        email: 'hello@artedental.co.uk',
        instagram: '@artedentaluk',
        facebook: 'https://www.facebook.com/p/Arte-Dental-61579272582519/',

        hours: {
            'Monday - Thursday': '9:00 AM – 6:30 PM',
            'Friday': '8:30 AM – 5:30 PM',
            'Saturday': '9:00 AM – 2:00 PM',
            'Sunday': 'Closed'
        },

        services: [
            'Composite Bonding (Precision-sculpted resin)',
            'Professional Teeth Whitening',
            'Smile Makeovers & Transformations',
            'General Dentistry in a luxury setting'
        ]
    }
};

// ============================================
// SYSTEM PROMPT FALLBACK
// ============================================

const SYSTEM_CONTEXT = `You are the Professional Senior Medical Receptionist for Arte Dental.
Tone: Strictly professional, clinical, and welcoming.
Business Info: ${JSON.stringify(CONFIG.BUSINESS_INFO)}
Only answer questions related to the clinic. Declining unrelated topics politely. No asterisks or emojis.`;

// ============================================
// STATE MANAGEMENT
// ============================================

let conversationHistory = [];
let isTyping = false;

// ============================================
// DOM ELEMENTS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    const chatWindow = document.getElementById('chat-window');
    const chatCloseBtn = document.getElementById('chat-close-btn');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatMessages = document.getElementById('chat-messages');

    // ============================================
    // EVENT LISTENERS
    // ============================================

    chatToggleBtn.addEventListener('click', toggleChat);
    chatCloseBtn.addEventListener('click', () => {
        chatWindow.classList.add('d-none');
    });
    chatSendBtn.addEventListener('click', handleSend);

    // Clear Chat
    const chatClearBtn = document.getElementById('chat-clear-btn');
    if (chatClearBtn) {
        chatClearBtn.addEventListener('click', () => {
            if (confirm('Clear your conversation history?')) {
                chatMessages.innerHTML = `
                    <div class="message bot-message">
                        Hello! Welcome to Arte Dental. I can help you with appointments, opening hours, or treatment info.
                        How can I assist you today?
                    </div>
                `;
                conversationHistory = [];
            }
        });
    }

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    // ============================================
    // CHATBOT FUNCTIONS
    // ============================================

    function toggleChat() {
        chatWindow.classList.toggle('d-none');
        if (!chatWindow.classList.contains('d-none')) {
            chatInput.focus();
        }
    }

    function addMessage(text, isBot = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(isBot ? 'bot-message' : 'user-message');

        // Use innerHTML to support local formatting (bullets/links)
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = text;
        messageDiv.appendChild(contentDiv);

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'bot-message');
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async function handleSend() {
        const text = chatInput.value.trim();
        if (!text || isTyping) return;

        addMessage(text, false); // User message
        chatInput.value = '';

        /* 
        // Local Response Bypass (Disabled to prioritize AI)
        const localResponse = getLocalResponse(text);
        if (localResponse) {
            setTimeout(() => {
                addMessage(localResponse, true);
                conversationHistory.push({ role: 'user', text: text });
                conversationHistory.push({ role: 'model', text: stripHTML(localResponse) });
            }, 300);
            return;
        }
        */

        // Show typing indicator
        isTyping = true;
        showTypingIndicator();

        try {
            const response = await fetch(CONFIG.WORKERS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    business: 'dental',
                    history: conversationHistory.slice(-5)
                })
            });

            const data = await response.json();
            hideTypingIndicator();

            if (data.success) {
                let reply = data.reply;
                // Cleanup
                reply = reply.replace(/\*/g, '');
                reply = reply.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

                addMessage(reply.trim(), true);
                conversationHistory.push({ role: 'user', text: text });
                conversationHistory.push({ role: 'model', text: reply.trim() });
            } else {
                const errorMsg = data.error || "I'm having trouble processing your request.";
                addMessage(`<strong>System Error:</strong> ${errorMsg}<br><br>Please call us at ${CONFIG.BUSINESS_INFO.phone}`, true);
                console.error('Worker Error:', data);
            }
        } catch (error) {
            hideTypingIndicator();
            addMessage("I'm sorry, I'm having trouble connecting right now. Please call us at " + CONFIG.BUSINESS_INFO.phone, true);
            console.error('Connection Error:', error);
        } finally {
            isTyping = false;
        }
    }

    function getLocalResponse(message) {
        const lower = message.toLowerCase();

        if (lower.includes('hour') || lower.includes('open') || lower.includes('close') || lower.includes('time')) {
            let hoursHtml = '<strong>Our Opening Hours:</strong><br><ul>';
            for (const [days, times] of Object.entries(CONFIG.BUSINESS_INFO.hours)) {
                hoursHtml += `<li>${days}: ${times}</li>`;
            }
            hoursHtml += '</ul>';
            return hoursHtml;
        }

        if (lower.includes('location') || lower.includes('address') || lower.includes('where') || lower.includes('find us') || lower.includes('visit')) {
            return `<strong>Find Us:</strong><br>${CONFIG.BUSINESS_INFO.location}<br><br>We are in the heart of the Digbeth area, near Bull Ring and New Street Station.`;
        }

        if (lower.includes('business') || lower.includes('info') || lower.includes('details') || lower.includes('about')) {
            return `<strong>Arte Dental - Business Details:</strong><br>
                    Arte Dental is a luxury cosmetic dental clinic in Birmingham, specialising in composite bonding, whitening, and smile makeovers. <br><br>
                    <strong>Address:</strong> 85 Bishop Street, Birmingham, B5 6EE<br>
                    <strong>Phone:</strong> ${CONFIG.BUSINESS_INFO.phone}<br>
                    <strong>Email:</strong> ${CONFIG.BUSINESS_INFO.email}`;
        }

        if (lower.includes('contact') || lower.includes('phone') || lower.includes('email') || lower.includes('call') || lower.includes('book')) {
            return `<strong>Get in Touch:</strong><br>Phone: ${CONFIG.BUSINESS_INFO.phone}<br>Email: <a href="mailto:${CONFIG.BUSINESS_INFO.email}">${CONFIG.BUSINESS_INFO.email}</a><br>Instagram: ${CONFIG.BUSINESS_INFO.instagram}`;
        }

        if (lower.includes('website') || lower.includes('online')) {
            return `Visit us online at <a href="https://${CONFIG.BUSINESS_INFO.website}" target="_blank">${CONFIG.BUSINESS_INFO.website}</a>`;
        }

        return null;
    }

    function stripHTML(html) {
        let doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    }
});
