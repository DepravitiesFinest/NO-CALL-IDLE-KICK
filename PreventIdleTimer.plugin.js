/**
 * @name PreventIdleTimer
 * @author Nyxthal
 * @description Prevents the creation of Discord's call idle timer completely
 * @version 1.1.0
 */


module.exports = class PreventIdleTimer {
    constructor() {
        this.originalSetTimeout = window.setTimeout;
        this.prevented = 0;
        this.indicator = null;
        this.patching = false;
        this.initialized = false;
        
        this.patchInfo = {
            startFunctionPatched: false,
            timeoutPatched: false
        };
    }

    start() {
        if (this.initialized) return;
        this.initialized = true;
        
        this.patchSetTimeout();
        
        this.setupVoiceDetection();
        
        this.createIndicator();
        
        console.log("[PreventIdleTimer] Plugin initialized");
        BdApi.UI.showToast("Idle Timer Prevention Active", {type: "success"});
    }
    
    patchSetTimeout() {
        window.setTimeout = (callback, delay, ...args) => {
            if (delay === 180000) {
                const callbackStr = callback.toString();
                
                if (callbackStr.includes('_ref') || callbackStr.includes('idle')) {
                    const stack = new Error().stack || '';
                    
                    if (stack.includes('start') || 
                        stack.includes('voice') || 
                        stack.includes('dispatch_VOICE_STATE_UPDATES') ||
                        stack.includes('RTC')) {
                        
                        this.prevented++;
                        this.patchInfo.timeoutPatched = true;
                        this.updateIndicator();
                        
                        console.log(`[PreventIdleTimer] Prevented idle timer creation #${this.prevented}`);
                        console.log('Callback:', callbackStr);
                        console.log('Stack:', stack);
                        
                        this.showIndicator();
                        
                        return -987654321;
                    }
                }
            }
            
            return this.originalSetTimeout.call(window, callback, delay, ...args);
        };
        
        console.log("[PreventIdleTimer] Successfully patched setTimeout");
    }
    
    setupVoiceDetection() {
        this.voiceObserver = new MutationObserver((mutations) => {
            const inVoiceChannel = document.querySelector('[class*="voiceCallWrapper"]') !== null || 
                                   document.querySelector('[class*="videoWrapper"]') !== null ||
                                   document.querySelector('[class*="callContainer"]') !== null;
            
            if (inVoiceChannel) {
                this.showIndicator();
            } else {
                this.hideIndicator();
            }
        });
        
        this.voiceObserver.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
    }
    
    createIndicator() {
        this.indicator = document.createElement("div");
        this.indicator.style.position = "fixed";
        this.indicator.style.bottom = "10px";
        this.indicator.style.right = "10px";
        this.indicator.style.backgroundColor = "rgba(0, 255, 0, 0.7)";
        this.indicator.style.color = "white";
        this.indicator.style.padding = "5px 10px";
        this.indicator.style.borderRadius = "5px";
        this.indicator.style.fontSize = "12px";
        this.indicator.style.fontWeight = "bold";
        this.indicator.style.zIndex = "9999";
        this.indicator.style.pointerEvents = "none";
        this.indicator.style.display = "none";
        this.indicator.textContent = "Idle Timer: Disabled (0)";
        
        document.body.appendChild(this.indicator);
    }
    
    showIndicator() {
        if (this.indicator) {
            this.indicator.style.display = "block";
            this.updateIndicator();
        }
    }
    
    hideIndicator() {
        if (this.indicator) {
            this.indicator.style.display = "none";
        }
    }
    
    updateIndicator() {
        if (this.indicator) {
            this.indicator.textContent = `Idle Timer: Disabled (${this.prevented})`;
            
            if (this.prevented > 0) {
                this.indicator.style.backgroundColor = "rgba(0, 255, 0, 0.7)";
            } else {
                this.indicator.style.backgroundColor = "rgba(255, 165, 0, 0.7)";
            }
        }
    }
    
    stop() {
        if (this.originalSetTimeout) {
            window.setTimeout = this.originalSetTimeout;
            this.originalSetTimeout = null;
        }
        
        if (this.voiceObserver) {
            this.voiceObserver.disconnect();
            this.voiceObserver = null;
        }
        
        if (this.indicator && this.indicator.parentNode) {
            this.indicator.parentNode.removeChild(this.indicator);
            this.indicator = null;
        }
        
        this.initialized = false;
        console.log("[PreventIdleTimer] Plugin disabled");
    }
    
    getSettingsPanel() {
        const panel = document.createElement("div");
        panel.innerHTML = `
            <style>
                .prevent-idle-settings {
                    color: white;
                    font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
                    padding: 20px;
                    background: linear-gradient(135deg, #36393f 0%, #2f3136 100%);
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
                    max-width: 500px;
                    margin: 0 auto;
                }
                .prevent-idle-settings h3 {
                    color: #fff;
                    font-size: 24px;
                    font-weight: 700;
                    margin: 0 0 24px 0;
                    text-align: center;
                    letter-spacing: 0.5px;
                }
                .prevent-idle-settings .status-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 24px;
                }
                .prevent-idle-settings .status-dot {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    margin-right: 8px;
                    background-color: #43b581;
                    box-shadow: 0 0 10px #43b581;
                    animation: pulse 2s infinite;
                }
                .prevent-idle-settings .status-dot.inactive {
                    background-color: #f04747;
                    box-shadow: 0 0 10px #f04747;
                }
                @keyframes pulse {
                    0% {
                        box-shadow: 0 0 0 0 rgba(67, 181, 129, 0.7);
                    }
                    70% {
                        box-shadow: 0 0 0 6px rgba(67, 181, 129, 0);
                    }
                    100% {
                        box-shadow: 0 0 0 0 rgba(67, 181, 129, 0);
                    }
                }
                .prevent-idle-settings .status-text {
                    font-size: 16px;
                    font-weight: 600;
                }
                .prevent-idle-settings .description {
                    background-color: rgba(32, 34, 37, 0.6);
                    backdrop-filter: blur(5px);
                    padding: 16px;
                    border-radius: 8px;
                    margin: 0 0 24px 0;
                    line-height: 1.6;
                    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
                }
                .prevent-idle-settings .github-link {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #5865F2 0%, #4752c4 100%);
                    color: white;
                    text-decoration: none;
                    padding: 14px;
                    border-radius: 8px;
                    margin: 0 auto 16px auto;
                    font-weight: 600;
                    transition: all 0.2s ease;
                    max-width: 80%;
                    box-shadow: 0 4px 12px rgba(88, 101, 242, 0.5);
                }
                .prevent-idle-settings .github-link:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 16px rgba(88, 101, 242, 0.6);
                }
                .prevent-idle-settings .github-icon {
                    width: 20px;
                    height: 20px;
                    margin-right: 8px;
                }
                .prevent-idle-settings .footer {
                    font-size: 13px;
                    color: #b9bbbe;
                    text-align: center;
                    margin-top: 8px;
                    opacity: 0.8;
                }
            </style>
            <div class="prevent-idle-settings">
                <h3>Prevent Idle Timer</h3>
                
                <div class="status-container">
                    <div class="status-dot ${this.initialized ? 'active' : 'inactive'}"></div>
                    <div class="status-text">${this.initialized ? 'Plugin Active' : 'Plugin Inactive'}</div>
                </div>
                
                <div class="description">
                    <p>This plugin prevents Discord from automatically disconnecting you from voice calls due to inactivity. Stay connected in voice chats indefinitely without being kicked for idling.</p>
                    <p>A green indicator appears in the bottom-right corner of Discord when you're in a voice call to show the plugin is working.</p>
                </div>
                
                <a href="https://github.com/DepravitiesFinest/NO-CALL-IDLE-KICK" class="github-link" target="_blank">
                    <svg class="github-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                    </svg>
                    View on GitHub
                </a>
                
                <div class="footer">
                    Version 1.1.0
                </div>
            </div>
        `;
        
        return panel;
    }
};