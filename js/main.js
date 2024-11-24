// XAI API Configuration
const API_CONFIG = {
    baseUrl: 'https://api.x.ai/v1',
    model: localStorage.getItem('xai_model') || 'grok-beta',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('xai_api_key') || ''}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    }
};
    
    // State Management
    const state = {
        theme: localStorage.getItem('theme') || 'light',
        fontSize: localStorage.getItem('fontSize') || 'medium',
        bubbleStyle: localStorage.getItem('bubbleStyle') || 'round',
        aiStyle: localStorage.getItem('aiStyle') || 'professional',
        screenReader: localStorage.getItem('screenReader') === 'true',
        messages: [],
        isProcessing: false,
        apiKeySet: !!localStorage.getItem('xai_api_key'),
        currentImage: null,
        chatHistory: JSON.parse(localStorage.getItem('chatHistory') || '[]'),
        currentChatId: null,
        titleGenerating: false
    };
    
    // DOM Elements
    const elements = {
        chatMessages: document.getElementById('chatMessages'),
        messageInput: document.getElementById('messageInput'),
        sendButton: document.getElementById('sendButton'),
        themeToggle: document.getElementById('themeToggle'),
        settingsBtn: document.getElementById('settingsBtn'),
        settingsPanel: document.getElementById('settingsPanel'),
        closeSettings: document.getElementById('closeSettings'),
        voiceInputBtn: document.getElementById('voiceInputBtn'),
        newChatBtn: document.getElementById('newChat'),
        scrollTopBtn: document.getElementById('scrollTopBtn'),
        toastContainer: document.getElementById('toastContainer'),
        apiKeyInput: document.getElementById('apiKey'),
        toggleApiKey: document.getElementById('toggleApiKey'),
        modelSelect: document.getElementById('modelSelect'),
        imageInput: document.getElementById('imageInput'),
        imageUploadBtn: document.getElementById('imageUploadBtn'),
        imagePreview: document.getElementById('imagePreview'),
        previewImg: document.getElementById('previewImg'),
        removeImage: document.getElementById('removeImage')
    };
    
    // Initialize App
    function initializeApp() {
        loadSettings();
        setupEventListeners();
        setupMarkdown();
        setupAccessibility();
        setupScrollHandler();
        setupAPISettings();
        setupImageUpload();
        updateUIState();
        setupScrollOptimization();
        setupVoiceInput(); // 添加这一行
        
        // 如果有历史对话，加载最近的对话
        if (state.chatHistory.length > 0) {
            loadChat(state.chatHistory[0].id);
        } else {
            startNewChat();
        }
        
        // 更新聊天列表
        updateChatList();
        
        // 初始化 AI 风格
        const savedStyle = localStorage.getItem('aiStyle');
        if (savedStyle && AI_STYLE_PROMPTS[savedStyle]) {
            state.aiStyle = savedStyle;
            const aiStyleSelect = document.getElementById('aiStyle');
            if (aiStyleSelect) {
                aiStyleSelect.value = savedStyle;
            }
        }
        statusBar.init();
    }
    
    // Image Upload Handling
    function setupImageUpload() {
        elements.imageUploadBtn.addEventListener('click', () => {
            elements.imageInput.click();
        });
    
        elements.imageInput.addEventListener('change', handleImageSelect);
        elements.removeImage.addEventListener('click', removeSelectedImage);
    }
    
    async function handleImageSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
    
        if (!file.type.startsWith('image/')) {
            showToast('请选择图片文件', 'error');
            return;
        }
    
        try {
            const base64Image = await encodeImageToBase64(file);
            state.currentImage = {
                data: base64Image,
                type: file.type
            };
    
            // Show preview
            elements.previewImg.src = URL.createObjectURL(file);
            elements.imagePreview.classList.remove('hidden');
            
            // Switch to vision model
            elements.modelSelect.value = 'grok-vision-beta';
            API_CONFIG.model = 'grok-vision-beta';
            
            showToast('图片已上传，可以开始分析', 'success');
        } catch (error) {
            console.error('Image processing error:', error);
            showToast('图片处理失败', 'error');
        }
    }
    
    function removeSelectedImage() {
        state.currentImage = null;
        elements.imageInput.value = '';
        elements.imagePreview.classList.add('hidden');
        elements.previewImg.src = '';
    }
    
    function encodeImageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
    
    // Settings Management
    function loadSettings() {
        document.documentElement.setAttribute('data-theme', state.theme);
        document.documentElement.style.setProperty('--font-size-base', getFontSizeValue(state.fontSize));
        document.body.classList.toggle('screen-reader-optimized', state.screenReader);
        
        // Load API settings
        if (state.apiKeySet) {
            elements.apiKeyInput.value = '••••••••••••••••';
        }
        elements.modelSelect.value = API_CONFIG.model;
    }
    
    function getFontSizeValue(size) {
        const sizes = {
            small: '14px',
            medium: '16px',
            large: '18px'
        };
        return sizes[size] || sizes.medium;
    }
    
    // API Settings
    function setupAPISettings() {
        // API Key Toggle - 修改这部分
        const toggleApiKeyBtn = elements.toggleApiKey;
        const apiKeyInput = elements.apiKeyInput;
        const icon = toggleApiKeyBtn.querySelector('.material-icons');
        
        toggleApiKeyBtn.addEventListener('click', () => {
            if (apiKeyInput.type === 'password') {
                apiKeyInput.type = 'text';
                icon.textContent = 'visibility';
            } else {
                apiKeyInput.type = 'password';
                icon.textContent = 'visibility_off';
            }
        }, false);  // 添加 false 确保事件不会被阻止
    
        // API Key Input
        elements.apiKeyInput.addEventListener('change', async (e) => {
            const apiKey = e.target.value.trim();
            
            if (!apiKey) {
                localStorage.removeItem('xai_api_key');
                state.apiKeySet = false;
                updateUIState();
                return;
            }
        
            showToast('正在验证 API 密钥...', 'info');
            
            try {
                const isValid = await validateApiKey(apiKey);
                if (isValid) {
                    localStorage.setItem('xai_api_key', apiKey);
                    API_CONFIG.headers.Authorization = `Bearer ${apiKey}`;
                    state.apiKeySet = true;
                    showToast('API 密钥验证成功', 'success');
                    updateUIState();
                } else {
                    elements.apiKeyInput.value = '';
                    showToast('API 密钥验证失败', 'error');
                }
            } catch (error) {
                console.error('API key validation error:', error);
                elements.apiKeyInput.value = '';
                showToast(error.message || 'API 密钥验证失败', 'error');
                state.apiKeySet = false;
                updateUIState();
            }
        });
    
        // Model Selection
        elements.modelSelect.addEventListener('change', (e) => {
            const model = e.target.value;
            localStorage.setItem('xai_model', model);
            API_CONFIG.model = model;
            statusBar.state.currentModel = model;
            statusBar.updateModelStatus();
            showToast(`已切换到 ${model} 模型`, 'success');
        });
        
        // AI Style Selection
        const aiStyleSelect = document.getElementById('aiStyle');
        if (aiStyleSelect) {
            aiStyleSelect.addEventListener('change', (e) => {
                const style = e.target.value;
                state.aiStyle = style;
                localStorage.setItem('aiStyle', style);
                showToast(`已切换到${getStyleName(style)}回答风格`, 'success');
            });
        }
    }
    
    // 添加 API 密钥验证函数
    async function validateApiKey(apiKey) {
        try {
            // 更新请求头中的认证信息
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };

            const response = await fetch('https://api.x.ai/v1/chat/completions', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    messages: [
                        {
                            role: "system",
                            content: "You are a test assistant."
                        },
                        {
                            role: "user",
                            content: "Test connection."
                        }
                    ],
                    model: "grok-beta",
                    temperature: 0
                })
            });

            // 检查响应状态
            if (response.ok) {
                return true;
            }
            
            // 处理特定状态码
            if (response.status === 401) {
                showToast('API 密钥无效', 'error');
                return false;
            }
            
            if (response.status === 400) {
                showToast('API 请求格式错误', 'error');
                return false;
            }
            
            // 其他错误情况
            const errorData = await response.json();
            throw new Error(errorData.error?.message || '验证失败');

        } catch (error) {
            console.error('API validation error:', error);
            
            // 网络错误处理
            if (error.name === 'TypeError' && !navigator.onLine) {
                throw new Error('网络连接已断开');
            }
            
            if (error.name === 'TypeError') {
                throw new Error('API 服务器无响应');
            }
            
            throw error;
        }
    }
    
    function updateUIState() {
        // 确保在更新 UI 状态时重新检查 API 密钥
        const apiKey = localStorage.getItem('xai_api_key');
        state.apiKeySet = !!apiKey;
        
        // Update input and send button state
        elements.messageInput.disabled = !state.apiKeySet;
        elements.sendButton.disabled = !state.apiKeySet;
        elements.voiceInputBtn.disabled = !state.apiKeySet;
        elements.imageUploadBtn.disabled = !state.apiKeySet;
    
        // Update placeholder text
        elements.messageInput.placeholder = state.apiKeySet 
            ? "输入消息... (按Enter发送，ShiftEnter换行)"
            : "请先在设置中配置API密钥";
    
        // Show/hide API key notice
        const setupNotice = document.querySelector('.setup-notice');
        if (setupNotice) {
            setupNotice.style.display = state.apiKeySet ? 'none' : 'block';
        }
    }
    
    // 添加 lastTouchTime 变量声明
    let lastTouchTime = 0;

    // Event Listeners
    function setupEventListeners() {
        // Message Input Handling
        elements.messageInput.addEventListener('keydown', handleMessageInputKeydown);
        elements.sendButton.addEventListener('click', handleSendMessage);
        elements.messageInput.addEventListener('input', autoResizeTextarea);
    
        // Theme Toggle
        elements.themeToggle.addEventListener('click', toggleTheme);
    
        // Settings Panel
        elements.settingsBtn.addEventListener('click', () => elements.settingsPanel.classList.remove('hidden'));
        elements.closeSettings.addEventListener('click', () => elements.settingsPanel.classList.add('hidden'));
    
        // Voice Input
        elements.voiceInputBtn.addEventListener('click', toggleVoiceInput);
    
        // New Chat
        elements.newChatBtn.addEventListener('click', startNewChat);
    
        // Scroll Top Button - 修复这里
        if (elements.scrollTopBtn) {
            elements.scrollTopBtn.addEventListener('click', () => {
                elements.chatMessages.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
    
        // Mobile Sidebar Toggle
        setupMobileSidebar();
    
        // Click outside settings panel to close
        document.addEventListener('click', (e) => {
            if (!elements.settingsPanel.classList.contains('hidden') &&
                !elements.settingsPanel.contains(e.target) &&
                !elements.settingsBtn.contains(e.target)) {
                elements.settingsPanel.classList.add('hidden');
            }
        });

        // 移动端触摸事件优化
        document.addEventListener('touchmove', (e) => {
            if (e.target.closest('.chat-messages')) return;
            e.preventDefault();
        }, { passive: false });

        // 禁用双击缩放
        document.addEventListener('touchstart', (e) => {
            const now = Date.now();
            if (now - lastTouchTime < 300) {
                e.preventDefault();
            }
            lastTouchTime = now;
        }, { passive: false });

        // 移动端键盘弹出处理
        window.addEventListener('resize', () => {
            if (document.activeElement.tagName === 'TEXTAREA') {
                setTimeout(() => {
                    document.activeElement.scrollIntoView({ behavior: 'smooth' });
                }, 300);
            }
        });

        // 处理软键盘收起时的滚动问题
        window.visualViewport.addEventListener('resize', () => {
            const chatInput = document.querySelector('.chat-input-container');
            chatInput.style.bottom = `${window.innerHeight - window.visualViewport.height}px`;
        });
    }
    
    // Message Handling
    async function handleSendMessage() {
        const message = elements.messageInput.value.trim();
        if ((!message && !state.currentImage) || state.isProcessing || !state.apiKeySet) return;
        
        // 防止重复发送
        elements.sendButton.disabled = true;
        elements.messageInput.disabled = true;
        state.isProcessing = true;
        const messageId = Date.now().toString();
        
        try {
            const startTime = Date.now();
            // Add user message with image if present
            const userContent = state.currentImage 
                ? `${message}\n\n![Uploaded Image](${state.currentImage.data})`
                : message;
            
            appendMessage('user', userContent, { id: messageId });
            elements.messageInput.value = '';
            autoResizeTextarea();
            updateMessageStatus(messageId, 'sending');
            scrollToBottom(true); // 强制滚动
    
            // Show typing indicator
            showTypingIndicator();
    
            // Send to XAI API
            const response = await sendToXAI(message);
            const endTime = Date.now();
            statusBar.updateResponseTime(endTime - startTime);
            updateMessageStatus(messageId, 'sent');
    
            // Hide typing indicator and handle response
            hideTypingIndicator();
            handleXAIResponse(response);
            
            // Clear image after sending
            if (state.currentImage) {
                removeSelectedImage();
            }
    
            scrollToBottom(true); // 再次强制滚动
        } catch (error) {
            statusBar.updateApiStatus('异常');
            console.error('Error:', error);
            showToast(error.message || '发送消息时出错，请重试。', 'error');
            hideTypingIndicator();
            updateMessageStatus(messageId, 'error');
        } finally {
            state.isProcessing = false;
            elements.sendButton.disabled = false;
            elements.messageInput.disabled = false;
            elements.messageInput.focus();
        }
    }
    
    function handleMessageInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }
    
    // XAI Integration
    async function sendToXAI(message) {
        if (!state.apiKeySet) {
            throw new Error('请先配置API密钥');
        }
    
        try {
            let requestBody;
            const styleConfig = AI_STYLE_PROMPTS[state.aiStyle];
            
            if (state.currentImage) {
                // Format for vision model request
                requestBody = {
                    model: "grok-vision-beta",
                    messages: [
                        {
                            role: "system",
                            content: styleConfig.prompt
                        },
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: message || "请分析这张图片"
                                },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: state.currentImage.data,
                                        detail: "high"
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens: 2048,
                    temperature: styleConfig.temperature
                };
            } else {
                // Format for text-only request
                requestBody = {
                    model: API_CONFIG.model,
                    messages: [
                        {
                            role: "system",
                            content: styleConfig.prompt
                        },
                        {
                            role: "user",
                            content: message
                        }
                    ],
                    temperature: styleConfig.temperature,
                    stream: false
                };
            }
    
            console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
            const response = await fetch(API_CONFIG.baseUrl + '/chat/completions', {
                method: 'POST',
                headers: API_CONFIG.headers,
                body: JSON.stringify(requestBody)
            });
    
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('API密钥无效，请检查设置');
                }
                const errorData = await response.json();
                throw new Error(`API请求失败: ${response.status} - ${errorData.error?.message || '未知错误'}`);
            }
    
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    function handleXAIResponse(response) {
        const aiMessage = response.choices[0].message;
        const thoughtProcess = extractThoughtProcess(aiMessage.content);
        const confidenceScore = response.choices[0].confidence || 0.95;
        
        appendMessage('ai', aiMessage.content, {
            thoughtProcess,
            confidenceScore,
            sources: response.sources || []
        });
    }
    
    // UI Components
    async function appendMessage(role, content, metadata = {}) {
        const messageElement = createMessageElement(role, content, metadata);
        elements.chatMessages.appendChild(messageElement);
        scrollToBottom();
        
        // Add to state
        state.messages.push({
            role,
            content,
            metadata,
            timestamp: new Date()
        });
        
        // 保存消息到当前对话
        if (state.currentChatId) {
            const currentChat = state.chatHistory.find(c => c.id === state.currentChatId);
            if (currentChat) {
                const message = {
                    role,
                    content,
                    metadata,
                    timestamp: new Date().toISOString()
                };
                
                currentChat.messages.push(message);
                currentChat.preview = content.substring(0, 50) + (content.length > 50 ? '...' : '');
                
                // 如果是第一条用户消息，生成标题
                if (role === 'user' && currentChat.messages.filter(m => m.role === 'user').length === 1) {
                    await generateChatTitle(currentChat, content);
                }
                
                saveChatHistory();
                updateChatList();
            }
        }
    }
    
    function createMessageElement(role, content, metadata) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        if (metadata.id) {
            messageDiv.setAttribute('data-message-id', metadata.id);
        }
    
        // Main content with markdown support
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = marked.parse(content);
    
        // Add syntax highlighting to code blocks
        contentDiv.querySelectorAll('pre code').forEach(block => {
            Prism.highlightElement(block);
            addCopyButton(block);
        });
    
        messageDiv.appendChild(contentDiv);
    
        // Add metadata elements
        if (role === 'ai') {
            appendMetadata(messageDiv, metadata);
        }
    
        // Timestamp and status
        const infoDiv = document.createElement('div');
        infoDiv.className = 'message-info';
        
        const timestamp = document.createElement('span');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();
        infoDiv.appendChild(timestamp);
    
        if (role === 'user') {
            const status = document.createElement('span');
            status.className = 'message-status';
            status.innerHTML = '<span class="material-icons">schedule</span>';
            infoDiv.appendChild(status);
        }
    
        messageDiv.appendChild(infoDiv);
    
        return messageDiv;
    }
    
    function appendMetadata(messageDiv, metadata) {
        if (metadata.thoughtProcess) {
            const thoughtDiv = document.createElement('details');
            thoughtDiv.className = 'thought-process';
            thoughtDiv.innerHTML = `
                <summary>
                    <span class="material-icons">psychology</span>
                    思考过程
                </summary>
                ${marked.parse(metadata.thoughtProcess)}
            `;
            messageDiv.appendChild(thoughtDiv);
        }
    
        if (metadata.confidenceScore) {
            const scoreDiv = document.createElement('div');
            scoreDiv.className = 'confidence-score';
            const score = Math.round(metadata.confidenceScore * 100);
            scoreDiv.innerHTML = `
                <span class="material-icons">analytics</span>
                      置信度: ${score}%
                <div class="score-bar">
                    <div class="score-fill" style="width: ${score}%"></div>
                </div>
            `;
            messageDiv.appendChild(scoreDiv);
        }
    
        if (metadata.sources && metadata.sources.length > 0) {
            const sourcesDiv = document.createElement('details');
            sourcesDiv.className = 'sources';
            const sourcesList = metadata.sources.map(source => `
                <li>
                    <a href="${source.url}" target="_blank" rel="noopener noreferrer">
                        <span class="material-icons">link</span>
                        ${source.title}
                    </a>
                </li>
            `).join('');
            
            sourcesDiv.innerHTML = `
                <summary>
                    <span class="material-icons">source</span>
                    参考来源
                </summary>
                <ul>${sourcesList}</ul>
            `;
            messageDiv.appendChild(sourcesDiv);
        }
    }
    
    // Typing Indicator
    function showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'message ai-message typing-indicator';
        indicator.innerHTML = `
            <span></span>
            <span></span>
            <span></span>
        `;
        elements.chatMessages.appendChild(indicator);
        scrollToBottom();
    }
    
    function hideTypingIndicator() {
        const indicator = elements.chatMessages.querySelector('.typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    // Utility Functions
    function scrollToBottom(force = false) {
        const container = elements.chatMessages;
        if (!container) return;
    
        const scrollHeight = container.scrollHeight;
        const currentScroll = container.scrollTop + container.clientHeight;
        const threshold = 100;
    
        // 强制滚动或用户在底部附近时才自动滚动
        if (force || scrollHeight - currentScroll < threshold) {
            setTimeout(() => {
                container.scrollTo({
                    top: scrollHeight,
                    behavior: force ? 'auto' : 'smooth'
                });
            }, 0);
        }
    }
    
    function autoResizeTextarea() {
        const textarea = elements.messageInput;
        
        // 重置高度以获取正确的scrollHeight
        textarea.style.height = 'auto';
        
        // 计算新高度，设置最小和最大限制
        const newHeight = Math.min(
            Math.max(44, textarea.scrollHeight), // 最小高度44px
            window.innerHeight * 0.4 // 最大高度为视口高度的40%
        );
        
        // 应用新高度
        textarea.style.height = `${newHeight}px`;
        
        // 在移动端时调整输入容器的位置
        if (window.innerWidth <= 768) {
            const container = document.querySelector('.chat-input-container');
            // 确保输入框始终可见
            const bottomOffset = window.innerHeight - window.visualViewport.height;
            container.style.bottom = `${bottomOffset}px`;
        }
    }
    
    function updateMessageStatus(messageId, status) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageElement) return;
    
        const statusElement = messageElement.querySelector('.message-status');
        if (!statusElement) return;
    
        const statusIcons = {
            sending: 'schedule',
            sent: 'done',
            delivered: 'done_all',
            read: 'done_all',
            error: 'error_outline'
        };
    
        statusElement.innerHTML = `<span class="material-icons">${statusIcons[status]}</span>`;
        
        if (status === 'error') {
            statusElement.classList.add('error');
        } else {
            statusElement.classList.remove('error');
        }
    }
    
    // Theme Management
    function toggleTheme() {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', state.theme);
        localStorage.setItem('theme', state.theme);
    }
    
    // Voice Input
    function setupVoiceInput() {
        // 检查浏览器是否支持语音识别
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            // 如果不支持，隐藏语音输入按钮
            elements.voiceInputBtn.style.display = 'none';
            return;
        }
    
        // 创建语音识别实例
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
    
        // 配置语音识别
        recognition.continuous = false; // 只识别一次
        recognition.interimResults = true; // 允许临时结果
        recognition.lang = 'zh-CN'; // 设置语言为中文
    
        let isRecording = false;
        let timeoutId = null;
    
        // 开始录音
        function startRecording() {
            try {
                recognition.start();
                isRecording = true;
                elements.voiceInputBtn.classList.add('recording');
                elements.voiceInputBtn.innerHTML = '<span class="material-icons">mic</span>';
                
                // 添加动画效果
                elements.voiceInputBtn.style.animation = 'pulse 1.5s infinite';
                
                showToast('开始语音输入...', 'info');
                
                // 设置超时
                timeoutId = setTimeout(() => {
                    stopRecording();
                }, 10000); // 10秒后自动停止
            } catch (error) {
                console.error('语音识别启动失败:', error);
                showToast('语音识别启动失败', 'error');
                stopRecording();
            }
        }
    
        // 停止录音
        function stopRecording() {
            if (isRecording) {
                recognition.stop();
                isRecording = false;
                elements.voiceInputBtn.classList.remove('recording');
                elements.voiceInputBtn.innerHTML = '<span class="material-icons">mic_none</span>';
                elements.voiceInputBtn.style.animation = '';
                
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
            }
        }
    
        // 监听临时结果
        recognition.onresult = (event) => {
            const result = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            
            // 更新输入框内容
            elements.messageInput.value = result;
            autoResizeTextarea();
        };
    
        // 监听语音识别结束
        recognition.onend = () => {
            stopRecording();
            if (elements.messageInput.value) {
                showToast('语音输入完成', 'success');
            }
        };
    
        // 监听错误
        recognition.onerror = (event) => {
            console.error('语音识别错误:', event.error);
            let errorMessage = '语音识别失败';
            
            switch (event.error) {
                case 'not-allowed':
                    errorMessage = '请允许使用麦克风';
                    break;
                case 'no-speech':
                    errorMessage = '未检测到语音';
                    break;
                case 'network':
                    errorMessage = '网络连接错误';
                    break;
                case 'aborted':
                    errorMessage = '语音识别已取消';
                    break;
            }
            
            showToast(errorMessage, 'error');
            stopRecording();
        };
    
        // 点击按钮切换语音识别状态
        elements.voiceInputBtn.addEventListener('click', () => {
            if (!isRecording) {
                startRecording();
            } else {
                stopRecording();
            }
        });
    }
    
    // Toast Notifications
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="material-icons">${getToastIcon(type)}</span>
            <span>${message}</span>
        `;
        
        elements.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    function getToastIcon(type) {
        const icons = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };
        return icons[type] || icons.info;
    }
    
    // Markdown Setup
    function setupMarkdown() {
        marked.setOptions({
            renderer: new marked.Renderer(),
            highlight: function(code, lang) {
                if (Prism.languages[lang]) {
                    return Prism.highlight(code, Prism.languages[lang], lang);
                }
                return code;
            },
            pedantic: false,
            gfm: true,
            breaks: true,
            sanitize: false,
            smartypants: false,
            xhtml: false
        });
    }
    
    // Accessibility
    function setupAccessibility() {
        if (state.screenReader) {
            document.body.classList.add('screen-reader-optimized');
        }
    }
    
    // Mobile Sidebar
    function setupMobileSidebar() {
        // 创建移动端菜单按钮
        if (!document.querySelector('.mobile-menu-btn')) {
            const hamburgerBtn = document.createElement('button');
            hamburgerBtn.className = 'mobile-menu-btn';
            hamburgerBtn.setAttribute('aria-label', '菜单');
            hamburgerBtn.innerHTML = '<span class="material-icons">menu</span>';
            
            const chatContainer = document.querySelector('.chat-container');
            chatContainer.insertBefore(hamburgerBtn, chatContainer.firstChild);
            
            // 添加触摸事件处理
            let startX = 0;
            let currentX = 0;
            const sidebar = document.querySelector('.sidebar');
            
            // 处理触摸开始
            document.addEventListener('touchstart', (e) => {
                if (e.touches[0].clientX < 30 || sidebar.classList.contains('open')) {
                    startX = e.touches[0].clientX;
                    currentX = startX;
                    sidebar.style.transition = 'none';
                }
            }, { passive: true });

            // 处理触摸移动
            document.addEventListener('touchmove', (e) => {
                if (startX > 0) {
                    currentX = e.touches[0].clientX;
                    const diff = currentX - startX;
                    
                    if (sidebar.classList.contains('open')) {
                        const translate = Math.min(0, diff);
                        sidebar.style.transform = `translateX(${translate}px)`;
                    } else {
                        const translate = Math.max(-280, Math.min(0, diff - 280));
                        sidebar.style.transform = `translateX(${translate}px)`;
                    }
                }
            }, { passive: true });

            // 处理触摸结束
            document.addEventListener('touchend', () => {
                if (startX > 0) {
                    sidebar.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                    const diff = currentX - startX;
                    
                    if (sidebar.classList.contains('open')) {
                        if (diff < -50) {
                            sidebar.classList.remove('open');
                        }
                        sidebar.style.transform = '';
                    } else {
                        if (diff > 50) {
                            sidebar.classList.add('open');
                        }
                        sidebar.style.transform = '';
                    }
                    
                    startX = 0;
                    currentX = 0;
                }
            });

            // 点击菜单按钮
            hamburgerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                sidebar.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                sidebar.classList.toggle('open');
            });
        }
    }
    
    // Scroll Handling
    function setupScrollHandler() {
        const container = elements.chatMessages;
        let touchStartY = 0;
        let lastScrollTop = 0;
    
        // 禁止默认的触摸行为，改为自定义处理
        container.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
    
        container.addEventListener('touchmove', (e) => {
            const touchCurrentY = e.touches[0].clientY;
            const deltaY = touchCurrentY - touchStartY;
            const scrollTop = container.scrollTop;
    
            // 允许自然滚动
            if ((scrollTop <= 0 && deltaY > 0) || 
                (scrollTop + container.clientHeight >= container.scrollHeight && deltaY < 0)) {
                e.preventDefault();
            }
        }, { passive: false });
    
        // 滚动事件
        container.addEventListener('scroll', () => {
            const scrollTop = container.scrollTop;
            const isScrollingDown = scrollTop > lastScrollTop;
            lastScrollTop = scrollTop;
    
            // 更新滚动按钮显示状态
            elements.scrollTopBtn.classList.toggle('hidden', scrollTop < 300);
    
            // 记录滚动方向用于自动滚动控制
            container.dataset.scrollDirection = isScrollingDown ? 'down' : 'up';
        }, { passive: true });
    
        // 添加鼠标滚轮事件支持
        container.addEventListener('wheel', (e) => {
            const delta = e.deltaY;
            const scrollTop = container.scrollTop;
            
            if ((scrollTop <= 0 && delta < 0) || 
                (scrollTop + container.clientHeight >= container.scrollHeight && delta > 0)) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    // Extract thought process from message content
    function extractThoughtProcess(content) {
        const thoughtMatch = content.match(/思考过程：([\s\S]*?)(?=\n\n|$)/);
        return thoughtMatch ? thoughtMatch[1].trim() : null;
    }
    
    // Add copy button to code blocks
    function addCopyButton(block) {
        const button = document.createElement('button');
        button.className = 'copy-button';
        button.textContent = '复制';
        
        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(block.textContent);
                button.textContent = '已复制';
                setTimeout(() => button.textContent = '复制', 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
                showToast('复制失败', 'error');
            }
        });
        
        block.parentNode.appendChild(button);
    }
    
    // Chat Management
    function startNewChat() {
        const chatId = Date.now().toString();
        const newChat = {
            id: chatId,
            title: '新对话',
            preview: '',
            messages: [],
            createdAt: new Date().toISOString()
        };
    
        state.chatHistory.unshift(newChat);
        state.currentChatId = chatId;
        state.messages = [];
        
        // 保存到 localStorage
        saveChatHistory();
        
        // 更新UI
        elements.chatMessages.innerHTML = '';
        updateChatList();
        
        // 添加欢迎消息
        appendMessage('ai', `# 欢迎使用 XAI 智能对话系统 👋
        
        我是您的AI助手，具备以下特点：
        
        * 💡 清晰的思考过程展示
        * 📊 置信度评分可视化
        * 🔍 关键信息智能高亮
        * 📚 引用来源实时展示
        * 🎯 个性化交互体验
        * 🖼️ 图像理解与分析
        
        您可以输入任何问题或上传图片，我会尽力提供专业、准确的回答。${!state.apiKeySet ? '\n\n⚠️ 请先在设置中配置您的API密钥才能开始对话。' : ''}`);
    }
    
    // 保存聊天历史
    function saveChatHistory() {
        localStorage.setItem('chatHistory', JSON.stringify(state.chatHistory));
    }
    
    // 更新聊天列表UI
    function updateChatList() {
        const chatHistoryElement = document.getElementById('chatHistory');
        if (!chatHistoryElement) return;
        
        chatHistoryElement.innerHTML = '';
        
        state.chatHistory.forEach(chat => {
            const chatElement = document.createElement('div');
            chatElement.className = `chat-item ${chat.id === state.currentChatId ? 'active' : ''}`;
            
            // 添加日期显示
            const date = new Date(chat.createdAt);
            const dateStr = date.toLocaleDateString();
            
            chatElement.innerHTML = `
                <div class="chat-item-content">
                    <div class="chat-item-title">
                        ${chat.title || '新对话'}
                        <span class="chat-item-date">${dateStr}</span>
                    </div>
                    <div class="chat-item-preview">${chat.preview || '空对话'}</div>
                </div>
                <div class="chat-item-actions">
                    <button class="chat-item-btn rename-chat" title="重命名">
                        <span class="material-icons">edit</span>
                    </button>
                    <button class="chat-item-btn delete-chat" title="删除">
                        <span class="material-icons">delete</span>
                    </button>
                </div>
            `;
            
            // 添加事件监听器
            const contentArea = chatElement.querySelector('.chat-item-content');
            contentArea.addEventListener('click', () => loadChat(chat.id));
            
            // 绑定重命名按钮事件
            const renameBtn = chatElement.querySelector('.rename-chat');
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showRenameChatDialog(chat.id);
            });
            
            // 绑定删除按钮事件
            const deleteBtn = chatElement.querySelector('.delete-chat');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteChat(chat.id);
            });
            
            chatHistoryElement.appendChild(chatElement);
        });
        
        // 移除旧的事件监听器绑定代码
        // document.querySelectorAll('.delete-chat').forEach...
        // document.querySelectorAll('.rename-chat').forEach...
    }
    
    // 删除对话
    function deleteChat(chatId) {
        if (!confirm('确认删除此对话？')) return;
        
        try {
            // 从历史记录中删除
            state.chatHistory = state.chatHistory.filter(c => c.id !== chatId);
            
            // 保存更改
            saveChatHistory();
            
            // 如果删除的是当前对话，加载新的对话
            if (state.currentChatId === chatId) {
                if (state.chatHistory.length > 0) {
                    loadChat(state.chatHistory[0].id);
                } else {
                    startNewChat();
                }
            } else {
                // 否则只更新列表
                updateChatList();
            }
            
            // 显示成功提示
            showToast('对话已删除', 'success');
        } catch (error) {
            console.error('删除对话失败:', error);
            showToast('删除对话失败', 'error');
        }
    }
    
    // 添加生成对话标题的函数
    async function generateChatTitle(chat, userMessage) {
        if (state.titleGenerating || !state.apiKeySet) return;
        
        state.titleGenerating = true;
        
        try {
            const titlePrompt = `请为以下对话生成一个简短的标题（不超过20个字）：\n"${userMessage}"`;
            
            const response = await sendToXAI(titlePrompt);
            if (response && response.choices && response.choices[0]) {
                const title = response.choices[0].message.content.trim();
                chat.title = title.replace(/["']/g, '').substring(0, 20);
                saveChatHistory();
                updateChatList();
            }
        } catch (error) {
            console.error('生成标题失败:', error);
            chat.title = userMessage.substring(0, 20) + (userMessage.length > 20 ? '...' : '');
        } finally {
            state.titleGenerating = false;
        }
    }
    
    // 添加初始化发送栏的函数
    function initializeInputArea() {
        setupInputEvents();
        autoResizeTextarea();
    }
    
    // 添加重命名对话的功能
    function showRenameChatDialog(chatId) {
        const chat = state.chatHistory.find(c => c.id === chatId);
        if (!chat) return;
        
        const newTitle = prompt('请输��新的对话标题', chat.title);
        if (newTitle !== null &&新Title.trim() !== '') {
            chat.title = newTitle.trim();
            saveChatHistory();
            updateChatList();
        }
    }
    
    // 添加 AI 风格提示词配置
    const AI_STYLE_PROMPTS = {
        professional: {
            prompt: "请以专业、正式的口吻回答，使用准确的专业术语，并提供详细的分析和见解。",
            temperature: 0.7
        },
        friendly: {
            prompt: "请以友好、轻松��口吻回答，使用日常用语，让内容更容易理解，并适当加入一些趣味性的表达。",
            temperature: 0.8
        },
        concise: {
            prompt: "请以简洁、直接的方式回答，直击要点，避免不必要的���饰，用最少的文字表达核心内容。",
            temperature: 0.5
        }
    };
    
    // 添加风格名称转换函数
    function getStyleName(style) {
        const styleNames = {
            professional: '专业',
            friendly: '友好',
            concise: '简洁'
        };
        return styleNames[style] || '默认';
    }
    
    // 添加移动端滚动优化
    function setupScrollOptimization() {
        let touchStartY = 0;
        const chatMessages = elements.chatMessages;
    
        chatMessages.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].pageY;
        }, { passive: true });
    
        chatMessages.addEventListener('touchmove', (e) => {
            const touchY = e.touches[0].pageY;
            const scrollTop = chatMessages.scrollTop;
            const scrollHeight = chatMessages.scrollHeight;
            const clientHeight = chatMessages.clientHeight;
    
            // 到达顶部或底部时阻��默认滚动
            if ((scrollTop <= 0 && touchY > touchStartY) ||
                (scrollTop + clientHeight >= scrollHeight && touchY < touchStartY)) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    // 修改状态栏管理对象
    const statusBar = {
        state: {
            connected: true,
            currentModel: localStorage.getItem('xai_model') || 'grok-beta',
            apiStatus: '正常',
            responseTime: 0,
            lastUpdateTime: null
        },
        
        elements: {
            wifiStatus: document.querySelector('.status-item:nth-child(1) .status-text'),
            modelStatus: document.getElementById('currentModel'),
            apiStatus: document.getElementById('apiStatus'),
            responseTime: document.getElementById('responseTime')
        },
        
        init() {
            this.updateAll();
            this.startMonitoring();
        },
        
        updateAll() {
            this.updateConnectionStatus();
            this.updateModelStatus();
            this.updateApiStatus();
            this.updateResponseTime();
        },
        
        updateConnectionStatus() {
            if (navigator.onLine) {
                this.state.connected = true;
                this.elements.wifiStatus.textContent = '已连接';
                this.elements.wifiStatus.parentElement.classList.remove('status-error');
            } else {
                this.state.connected = false;
                this.elements.wifiStatus.textContent = '未连接';
                this.elements.wifiStatus.parentElement.classList.add('status-error');
            }
        },
        
        updateModelStatus() {
            this.elements.modelStatus.textContent = this.state.currentModel;
        },
        
        updateApiStatus(status = '正常') {
            this.state.apiStatus = status;
            this.elements.apiStatus.textContent = status;
            this.elements.apiStatus.parentElement.classList.toggle('status-error', status !== '正常');
        },
        
        updateResponseTime(time = 0) {
            this.state.responseTime = time;
            this.elements.responseTime.textContent = `响应时间: ${time}ms`;
        },
        
        startMonitoring() {
            // 监听网络状态变化
            window.addEventListener('online', () => this.updateConnectionStatus());
            window.addEventListener('offline', () => this.updateConnectionStatus());
            
            // 定期检查 API 状态 - 改用轻量级检查方法
            setInterval(() => this.checkApiStatus(), 30000);
        },
        
        // 修改 API 状态检查方法
        async checkApiStatus() {
            // 如果没有设置 API key，则显示未配置状态
            if (!state.apiKeySet) {
                this.updateApiStatus('未配置');
                return;
            }

            // 使用一个轻量级的 API 调用来测试连接
            try {
                const testMessage = {
                    model: this.state.currentModel,
                    messages: [
                        {
                            role: "system",
                            content: "ping"
                        }
                    ],
                    max_tokens: 1
                };

                const startTime = Date.now();
                
                const response = await fetch(API_CONFIG.baseUrl + '/chat/completions', {
                    method: 'POST',
                    headers: API_CONFIG.headers,
                    body: JSON.stringify(testMessage)
                });
                
                const endTime = Date.now();
                this.updateResponseTime(endTime - startTime);
                
                if (response.ok) {
                    this.updateApiStatus('正常');
                } else {
                    // 401 表示 API 密钥无效
                    if (response.status === 401) {
                        this.updateApiStatus('密钥无效');
                    } else {
                        this.updateApiStatus('异常');
                    }
                }
            } catch (error) {
                console.error('API状态检查失败:', error);
                this.updateApiStatus('连接失败');
            }
        }
    };
    
    // 加载指定的聊天记录
    async function loadChat(chatId) {
        const chat = state.chatHistory.find(c => c.id === chatId);
        if (!chat) return;
    
        // 更新当前聊天 ID
        state.currentChatId = chatId;
    
        // 清空当前消息列表
        elements.chatMessages.innerHTML = '';
        state.messages = [];
    
        // 加载聊天记录
        if (chat.messages && chat.messages.length > 0) {
            chat.messages.forEach(message => {
                appendMessage(message.role, message.content, message.metadata);
            });
            // 滚动到底部
            scrollToBottom(true);
        } else {
            // 如果是空对话，显示欢迎消息
            appendMessage('ai', `# 开始新对话 👋
            
    你可以输入任何问题，我会尽力提供专业、准确的回答。${!state.apiKeySet ? '\n\n⚠️ 请先在设置中配置您的API密钥才能开始对话。' : ''}`);
        }
    
        // 更新 UI
        updateChatList();
        initializeInputArea();
    
        // 在移动设备上加载聊天后关闭侧边栏
        if (window.innerWidth <= 768) {
            document.querySelector('.sidebar').classList.remove('open');
        }
    }
    
    // 监听输入框事件
    function setupInputEvents() {
        const textarea = elements.messageInput;
        const container = document.querySelector('.chat-input-container');
        
        // 输入框大小变化
        textarea.addEventListener('input', () => {
            requestAnimationFrame(autoResizeTextarea);
        });
    
        // 处理键盘显示/隐藏
        window.visualViewport.addEventListener('resize', () => {
            if (window.innerWidth <= 768) {
                const offsetBottom = window.innerHeight - window.visualViewport.height;
                container.style.transform = `translateY(-${offsetBottom}px)`;
            }
        });
    
        // 处理页面滚动
        window.visualViewport.addEventListener('scroll', () => {
            if (window.innerWidth <= 768) {
                container.style.transform = `translateY(-${window.visualViewport.offsetTop}px)`;
            }
        });
    }
    
    // 添加 CSS 动画
    const style = document.createElement('style');
    style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
    
    .recording {
        color: var(--error-color) !important;
        background-color: var(--bg-secondary) !important;
    }
    `;
    document.head.appendChild(style);
    
    // 在 setupVoiceInput 函数之前添加 toggleVoiceInput 函数
    function toggleVoiceInput() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            showToast('您的浏览器不支持语音输入功能', 'error');
            return;
        }

        const voiceButton = elements.voiceInputBtn;
        const isRecording = voiceButton.classList.contains('recording');

        if (isRecording) {
            // 如果正在录音，停止录音
            if (window.recognition) {
                window.recognition.stop();
            }
            voiceButton.classList.remove('recording');
            voiceButton.innerHTML = '<span class="material-icons">mic_none</span>';
        } else {
            // 开始录音
            try {
                if (!window.recognition) {
                    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                    window.recognition = new SpeechRecognition();
                    
                    // 配置语音识别
                    window.recognition.continuous = false;
                    window.recognition.interimResults = true;
                    window.recognition.lang = 'zh-CN';

                    // 处理结果
                    window.recognition.onresult = (event) => {
                        const transcript = Array.from(event.results)
                            .map(result => result[0].transcript)
                            .join('');
                        
                        elements.messageInput.value = transcript;
                        autoResizeTextarea();
                    };

                    // 处理结束
                    window.recognition.onend = () => {
                        voiceButton.classList.remove('recording');
                        voiceButton.innerHTML = '<span class="material-icons">mic_none</span>';
                    };

                    // 处理错误
                    window.recognition.onerror = (event) => {
                        console.error('语音识别错误:', event.error);
                        let errorMessage = '语音识别失败';
                        
                        switch (event.error) {
                            case 'not-allowed':
                                errorMessage = '请允许使用麦克风';
                                break;
                            case 'no-speech':
                                errorMessage = '未检测到语音';
                                break;
                            case 'network':
                                errorMessage = '网络连接错误';
                                break;
                        }
                        
                        showToast(errorMessage, 'error');
                        voiceButton.classList.remove('recording');
                        voiceButton.innerHTML = '<span class="material-icons">mic_none</span>';
                    };
                }

                window.recognition.start();
                voiceButton.classList.add('recording');
                voiceButton.innerHTML = '<span class="material-icons">mic</span>';
                showToast('开始语音输入...', 'info');
            } catch (error) {
                console.error('语音识别启动失败:', error);
                showToast('语音识别启动失败', 'error');
                voiceButton.classList.remove('recording');
                voiceButton.innerHTML = '<span class="material-icons">mic_none</span>';
            }
        }
    }

    // Initialize the app
    document.addEventListener('DOMContentLoaded', initializeApp);