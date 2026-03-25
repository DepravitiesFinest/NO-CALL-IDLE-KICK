/**
 * @name PreventIdleTimer
 * @author Nyxthal - Hyper
 * @description Prevents the creation of Discord's call idle timer completely
 * @version 1.3.0
 */

module.exports = class PreventIdleTimer {
    constructor() {
        this.originalSetTimeout = null;
        this.prevented = 0;
        this.indicator = null;
        this.voiceObserver = null;
        this.initialized = false;
        this._observerDebounce = null;
        this._sessionStart = null;
    }

    start() {
        if (this.initialized) return;
        this.initialized = true;
        this._sessionStart = Date.now();

        // Nuke any stale indicator from a dirty reload
        document.querySelectorAll("[data-prevent-idle-indicator]").forEach(el => el.remove());

        this.originalSetTimeout = window.setTimeout;
        this.patchSetTimeout();
        this.setupVoiceDetection();
        this.createIndicator();

        console.log("[PreventIdleTimer] Plugin initialized");
        BdApi.UI.showToast("Idle Timer Prevention Active", { type: "success" });
    }

    patchSetTimeout() {
        const self = this;
        window.setTimeout = function patchedSetTimeout(callback, delay, ...args) {
            if (delay === 180000 && typeof callback === "function") {
                try {
                    const cbStr = callback.toString();
                    const looksLikeIdleTimer =
                        cbStr.includes("_ref") ||
                        cbStr.includes("idle") ||
                        cbStr.includes("disconnect") ||
                        cbStr.includes("kick");

                    if (looksLikeIdleTimer) {
                        const stack = new Error().stack || "";
                        const fromVoiceContext =
                            stack.includes("start") ||
                            stack.includes("voice") ||
                            stack.includes("Voice") ||
                            stack.includes("RTC") ||
                            stack.includes("VOICE_STATE") ||
                            stack.includes("call");

                        if (fromVoiceContext) {
                            self.prevented++;
                            self.updateIndicator();
                            self.showIndicator();
                            console.log(`[PreventIdleTimer] Blocked idle timer #${self.prevented}`);
                            return 0;
                        }
                    }
                } catch (e) {
                    console.warn("[PreventIdleTimer] Patch error, falling through:", e);
                }
            }
            return self.originalSetTimeout.call(window, callback, delay, ...args);
        };
        console.log("[PreventIdleTimer] setTimeout patched");
    }

    setupVoiceDetection() {
        const checkVoice = () => {
            const inCall =
                document.querySelector('[class*="voiceCallWrapper"]') !== null ||
                document.querySelector('[class*="videoWrapper"]') !== null ||
                document.querySelector('[class*="callContainer"]') !== null ||
                document.querySelector('[class*="joinedVoiceChannel"]') !== null;
            inCall ? this.showIndicator() : this.hideIndicator();
        };

        this.voiceObserver = new MutationObserver(() => {
            if (this._observerDebounce) return;
            this._observerDebounce = this.originalSetTimeout.call(window, () => {
                this._observerDebounce = null;
                checkVoice();
            }, 500);
        });

        this.voiceObserver.observe(document.body, { childList: true, subtree: true });
        checkVoice();
    }

    createIndicator() {
        this.indicator = document.createElement("div");
        this.indicator.setAttribute("data-prevent-idle-indicator", "1");
        Object.assign(this.indicator.style, {
            position: "fixed",
            bottom: "10px",
            right: "10px",
            backgroundColor: "rgba(14,14,16,0.92)",
            color: "#E63946",
            padding: "5px 10px",
            borderRadius: "4px",
            fontSize: "11px",
            fontFamily: "Consolas, monospace",
            fontWeight: "bold",
            zIndex: "9999",
            pointerEvents: "none",
            display: "none",
            userSelect: "none",
            letterSpacing: "0.5px",
            border: "1px solid rgba(230, 57, 70, 0.35)",
            boxShadow: "0 0 10px rgba(230, 57, 70, 0.2)",
        });
        this.updateIndicator();
        document.body.appendChild(this.indicator);
    }

    showIndicator() {
        if (this.indicator) this.indicator.style.display = "block";
    }

    hideIndicator() {
        if (this.indicator) this.indicator.style.display = "none";
    }

    updateIndicator() {
        if (!this.indicator) return;
        this.indicator.textContent = `[IDLE] BLOCKED ×${this.prevented}`;
    }

    stop() {
        if (this.originalSetTimeout) {
            window.setTimeout = this.originalSetTimeout;
            this.originalSetTimeout = null;
        }
        if (this._observerDebounce) {
            clearTimeout(this._observerDebounce);
            this._observerDebounce = null;
        }
        if (this.voiceObserver) {
            this.voiceObserver.disconnect();
            this.voiceObserver = null;
        }
        if (this.indicator?.parentNode) {
            this.indicator.parentNode.removeChild(this.indicator);
            this.indicator = null;
        }
        this.initialized = false;
        this.prevented = 0;
        console.log("[PreventIdleTimer] Plugin disabled");
    }

    getSettingsPanel() {
        const sessionTime = this._sessionStart
            ? Math.floor((Date.now() - this._sessionStart) / 60000)
            : 0;

        const panel = document.createElement("div");
        panel.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=DM+Sans:wght@400;500;600&display=swap');

                .nyx-idle-root {
                    --red: #E63946;
                    --red-dim: rgba(230, 57, 70, 0.12);
                    --red-glow: rgba(230, 57, 70, 0.3);
                    --bg: #0e0e10;
                    --bg-2: #131315;
                    --bg-3: #1a1a1d;
                    --border: rgba(255,255,255,0.06);
                    --border-red: rgba(230, 57, 70, 0.28);
                    --text: #e2e2e8;
                    --text-dim: #5a5a66;
                    --mono: 'Share Tech Mono', 'Consolas', monospace;
                    --sans: 'DM Sans', sans-serif;

                    font-family: var(--sans);
                    background: var(--bg);
                    color: var(--text);
                    padding: 22px;
                    border-radius: 10px;
                    max-width: 460px;
                    margin: 0 auto;
                    box-sizing: border-box;
                    border: 1px solid var(--border);
                }

                .nyx-idle-root * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }

                /* Header */
                .nyx-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 20px;
                    padding-bottom: 18px;
                    border-bottom: 1px solid var(--border);
                }

                .nyx-logo {
                    width: 34px;
                    height: 34px;
                    background: var(--red-dim);
                    border: 1px solid var(--border-red);
                    border-radius: 7px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    box-shadow: 0 0 12px var(--red-glow);
                }

                .nyx-logo svg {
                    width: 16px;
                    height: 16px;
                    color: var(--red);
                }

                .nyx-title-block { flex: 1; }

                .nyx-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text);
                    letter-spacing: 0.2px;
                    line-height: 1;
                }

                .nyx-subtitle {
                    font-family: var(--mono);
                    font-size: 10px;
                    color: var(--text-dim);
                    margin-top: 4px;
                    letter-spacing: 0.5px;
                }

                .nyx-badge {
                    font-family: var(--mono);
                    font-size: 10px;
                    padding: 3px 8px;
                    border-radius: 4px;
                    letter-spacing: 0.8px;
                }

                .nyx-badge.active {
                    background: var(--red-dim);
                    color: var(--red);
                    border: 1px solid var(--border-red);
                }

                .nyx-badge.inactive {
                    background: rgba(255,255,255,0.03);
                    color: var(--text-dim);
                    border: 1px solid var(--border);
                }

                /* Stats */
                .nyx-stats {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                    margin-bottom: 12px;
                }

                .nyx-stat {
                    background: var(--bg-2);
                    border: 1px solid var(--border);
                    border-radius: 7px;
                    padding: 13px 14px;
                    position: relative;
                    overflow: hidden;
                }

                .nyx-stat:first-child {
                    border-top: 2px solid var(--red);
                }

                .nyx-stat-value {
                    font-family: var(--mono);
                    font-size: 20px;
                    color: var(--red);
                    line-height: 1;
                    margin-bottom: 5px;
                }

                .nyx-stat-label {
                    font-size: 11px;
                    color: var(--text-dim);
                }

                /* Shared card */
                .nyx-card {
                    background: var(--bg-2);
                    border: 1px solid var(--border);
                    border-radius: 7px;
                    padding: 13px 14px;
                    margin-bottom: 10px;
                }

                .nyx-card-label {
                    font-family: var(--mono);
                    font-size: 9px;
                    color: var(--text-dim);
                    letter-spacing: 1.2px;
                    text-transform: uppercase;
                    margin-bottom: 10px;
                }

                /* Info */
                .nyx-info p {
                    font-size: 12px;
                    color: #7a7a8a;
                    line-height: 1.65;
                }

                .nyx-info p + p { margin-top: 7px; }

                .nyx-tag {
                    font-family: var(--mono);
                    font-size: 11px;
                    color: var(--red);
                    background: var(--red-dim);
                    padding: 1px 5px;
                    border-radius: 3px;
                }

                /* Footer */
                .nyx-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-top: 14px;
                    padding-top: 14px;
                    border-top: 1px solid var(--border);
                }

                .nyx-version {
                    font-family: var(--mono);
                    font-size: 10px;
                    color: var(--text-dim);
                    letter-spacing: 0.5px;
                }

                .nyx-gh-link {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-family: var(--mono);
                    font-size: 10px;
                    color: var(--text-dim);
                    text-decoration: none;
                    letter-spacing: 0.5px;
                    padding: 5px 10px;
                    border-radius: 5px;
                    border: 1px solid var(--border);
                    background: var(--bg-3);
                    transition: color 0.15s, border-color 0.15s, box-shadow 0.15s;
                }

                .nyx-gh-link:hover {
                    color: var(--red);
                    border-color: var(--border-red);
                    box-shadow: 0 0 8px var(--red-glow);
                }

                .nyx-gh-link svg {
                    width: 12px;
                    height: 12px;
                }
            </style>

            <div class="nyx-idle-root">

                <div class="nyx-header">
                    <div class="nyx-logo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                    </div>
                    <div class="nyx-title-block">
                        <div class="nyx-title">PreventIdleTimer</div>
                        <div class="nyx-subtitle">by Nyxthal</div>
                    </div>
                    <div class="nyx-badge ${this.initialized ? 'active' : 'inactive'}">
                        ${this.initialized ? 'ACTIVE' : 'INACTIVE'}
                    </div>
                </div>

                <div class="nyx-stats">
                    <div class="nyx-stat">
                        <div class="nyx-stat-value">${this.prevented}</div>
                        <div class="nyx-stat-label">timers blocked</div>
                    </div>
                    <div class="nyx-stat">
                        <div class="nyx-stat-value">${sessionTime}m</div>
                        <div class="nyx-stat-label">session uptime</div>
                    </div>
                </div>

                <div class="nyx-card nyx-info">
                    <div class="nyx-card-label">About</div>
                    <p>Patches <span class="nyx-tag">window.setTimeout</span> globally to intercept and drop Discord's 3-minute voice inactivity timer before it can fire.</p>
                    <p>A small indicator appears bottom-right when you're in a call confirming the plugin is running.</p>
                </div>

                <div class="nyx-footer">
                    <span class="nyx-version">v1.3.0</span>
                    <a href="https://github.com/DepravitiesFinest/NO-CALL-IDLE-KICK" class="nyx-gh-link" target="_blank">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                        </svg>
                        GitHub
                    </a>
                </div>

            </div>
        `;
        return panel;
    }
};
