/**
 * Modal System
 * 
 * Custom confirm/alert dialogs with mobile-friendly touch handling.
 */

class ModalSystem {
    constructor() {
        this.overlay = null;
        this.activeResolve = null;
        this.isClosing = false;
        this.initialized = false;
        this.openedAt = 0;
    }

    _log(msg) {
        console.log('[ModalSystem]', msg);
        if (window.MobileDebug && typeof window.MobileDebug.add === 'function') {
            window.MobileDebug.add(`Modal: ${msg}`, 'info');
        }
    }

    init() {
        // Remove any existing modal overlay first
        const existing = document.getElementById('customModalOverlay');
        if (existing) {
            existing.remove();
        }

        this._log('Initializing modal system');

        // Inject Styles
        if (!document.getElementById('customModalStyles')) {
            const style = document.createElement('style');
            style.id = 'customModalStyles';
            style.textContent = `
                #customModalOverlay {
                    position: fixed !important;
                    inset: 0 !important;
                    background: rgba(15, 23, 42, 0.75) !important;
                    backdrop-filter: blur(8px) !important;
                    z-index: 999999 !important;
                    display: none;
                    align-items: center !important;
                    justify-content: center !important;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    -webkit-overflow-scrolling: touch;
                    touch-action: manipulation;
                    pointer-events: auto !important;
                }
                #customModalOverlay.active {
                    opacity: 1 !important;
                    pointer-events: auto !important;
                }
                .custom-modal-card {
                    background: white !important;
                    width: 90%;
                    max-width: 420px;
                    border-radius: 20px;
                    padding: 28px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
                    transform: scale(0.95);
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    text-align: center;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    pointer-events: auto !important;
                    position: relative;
                    z-index: 1;
                }
                #customModalOverlay.active .custom-modal-card {
                    transform: scale(1) !important;
                    opacity: 1 !important;
                }
                .custom-modal-title {
                    font-family: 'Inter', system-ui, sans-serif;
                    font-size: 22px;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0;
                    line-height: 1.3;
                }
                .custom-modal-text {
                    font-family: 'Inter', system-ui, sans-serif;
                    font-size: 16px;
                    color: #64748b;
                    line-height: 1.6;
                    margin: 0;
                }
                .custom-modal-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                    margin-top: 8px;
                }
                .custom-modal-btn {
                    flex: 1;
                    padding: 14px 20px;
                    border-radius: 12px;
                    font-family: 'Inter', system-ui, sans-serif;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    border: none;
                    transition: transform 0.1s, background 0.2s;
                    min-height: 50px;
                    touch-action: manipulation;
                    -webkit-tap-highlight-color: transparent;
                    user-select: none;
                    pointer-events: auto !important;
                }
                .custom-modal-btn:hover {
                    transform: translateY(-1px);
                }
                .custom-modal-btn:active {
                    transform: translateY(0);
                }
                .custom-modal-cancel {
                    background: #f1f5f9;
                    color: #64748b;
                }
                .custom-modal-cancel:hover,
                .custom-modal-cancel:active {
                    background: #e2e8f0;
                    color: #475569;
                }
                .custom-modal-confirm {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }
                .custom-modal-confirm:hover,
                .custom-modal-confirm:active {
                    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
                    opacity: 0.95;
                }
                
                @media (max-width: 768px) {
                    .custom-modal-card {
                        width: 95%;
                        padding: 20px;
                        gap: 16px;
                    }
                    .custom-modal-title {
                        font-size: 20px;
                    }
                    .custom-modal-text {
                        font-size: 15px;
                    }
                    .custom-modal-actions {
                        flex-direction: column;
                    }
                    .custom-modal-btn {
                        min-height: 52px;
                        font-size: 16px;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Create DOM
        this.overlay = document.createElement('div');
        this.overlay.id = 'customModalOverlay';
        this.overlay.innerHTML = `
            <div class="custom-modal-card" id="customModalCard">
                <h3 class="custom-modal-title" id="customModalTitle">Title</h3>
                <p class="custom-modal-text" id="customModalText">Message</p>
                <div class="custom-modal-actions" id="customModalActions">
                    <!-- Buttons Injected Here -->
                </div>
            </div>
        `;
        
        // Always append to end of body to ensure it's on top
        document.body.appendChild(this.overlay);
        
        // Force high z-index via inline style as backup
        this.overlay.style.zIndex = '999999';
        
        // Prevent clicks on overlay background from propagating
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                // Prevent instant close from click-through right after opening.
                if (Date.now() - this.openedAt < 300) {
                    this._log('Backdrop click ignored during open cooldown');
                    return;
                }
                this._log('Backdrop clicked - closing');
                this.close(false);
            }
        });
        
        // Prevent touch events from passing through
        this.overlay.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        this.initialized = true;
        this._log('Modal system initialized');
    }
    
    /**
     * Ensure the modal is ready and at the end of body
     */
    _ensureReady() {
        if (!this.initialized || !this.overlay || !document.body.contains(this.overlay)) {
            this.init();
        }
        
        // Always move to end of body before showing
        if (this.overlay && this.overlay.parentNode) {
            document.body.appendChild(this.overlay);
        }
    }
    
    /**
     * Add mobile-friendly click handler to a button
     */
    _addMobileHandler(button, handler) {
        let lastTime = 0;
        const DEBOUNCE = 300;
        let isProcessing = false;
        
        const wrappedHandler = (e) => {
            if (isProcessing || this.isClosing) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const now = Date.now();
            if (now - lastTime < DEBOUNCE) return;
            lastTime = now;
            isProcessing = true;
            
            this._log('Button clicked');
            handler();
            
            setTimeout(() => {
                isProcessing = false;
            }, 100);
        };
        
        // Use both click and pointer events for maximum compatibility
        button.addEventListener('click', wrappedHandler);
        if ('PointerEvent' in window) {
            button.addEventListener('pointerup', wrappedHandler, { passive: false });
        } else {
            button.addEventListener('touchend', wrappedHandler, { passive: false });
        }
    }

    show(options) {
        this._log(`Showing modal: ${options.title}`);
        
        return new Promise((resolve) => {
            // Ensure modal is ready and at top of z-order
            this._ensureReady();
            
            this.activeResolve = resolve;
            this.isClosing = false;

            const titleEl = document.getElementById('customModalTitle');
            const textEl = document.getElementById('customModalText');
            const actionsEl = document.getElementById('customModalActions');

            if (titleEl) titleEl.textContent = options.title || 'Message';
            if (textEl) textEl.textContent = options.message || '';

            if (actionsEl) {
                actionsEl.innerHTML = '';

                if (options.type === 'confirm') {
                    // Cancel Button
                    const cancelBtn = document.createElement('button');
                    cancelBtn.className = 'custom-modal-btn custom-modal-cancel';
                    cancelBtn.textContent = options.cancelText || 'Cancel';
                    this._addMobileHandler(cancelBtn, () => this.close(false));
                    actionsEl.appendChild(cancelBtn);

                    // Confirm Button
                    const confirmBtn = document.createElement('button');
                    confirmBtn.className = 'custom-modal-btn custom-modal-confirm';
                    confirmBtn.textContent = options.confirmText || 'Confirm';
                    this._addMobileHandler(confirmBtn, () => this.close(true));
                    actionsEl.appendChild(confirmBtn);
                } else {
                    // Alert (OK only)
                    const okBtn = document.createElement('button');
                    okBtn.className = 'custom-modal-btn custom-modal-confirm';
                    okBtn.textContent = options.confirmText || 'OK';
                    this._addMobileHandler(okBtn, () => this.close(true));
                    actionsEl.appendChild(okBtn);
                }
            }

            // Force display and visibility
            this.overlay.style.display = 'flex';
            this.overlay.style.visibility = 'visible';
            this.overlay.style.zIndex = '999999';
            this.overlay.style.pointerEvents = 'auto';
            this.openedAt = Date.now();
            
            // Force reflow
            this.overlay.offsetHeight;
            
            // Add active class for animation
            requestAnimationFrame(() => {
                this.overlay.classList.add('active');
                this._log('Modal now visible');
            });
        });
    }

    close(result) {
        if (!this.overlay || this.isClosing) return;
        
        this._log(`Closing modal with result: ${result}`);
        this.isClosing = true;
        
        this.overlay.classList.remove('active');

        setTimeout(() => {
            if (this.overlay) {
                this.overlay.style.display = 'none';
                this.overlay.style.pointerEvents = 'none';
            }
            this.isClosing = false;
            
            if (this.activeResolve) {
                const resolveFunc = this.activeResolve;
                this.activeResolve = null;
                resolveFunc(result);
            }
        }, 300);
    }
}

// Global Instance - don't initialize until DOM is ready
let modalSystem = null;

const initModalSystem = () => {
    if (!modalSystem) {
        modalSystem = new ModalSystem();
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModalSystem);
} else {
    initModalSystem();
}

// Global API
window.appConfirm = async (message, options = {}) => {
    if (!modalSystem) {
        initModalSystem();
    }
    return modalSystem.show({
        type: 'confirm',
        message: message,
        title: options.title || 'Confirmation',
        confirmText: options.confirmText || 'Yes',
        cancelText: options.cancelText || 'Cancel'
    });
};

window.appAlert = async (message, options = {}) => {
    if (!modalSystem) {
        initModalSystem();
    }
    return modalSystem.show({
        type: 'alert',
        message: message,
        title: options.title || 'Alert'
    });
};
