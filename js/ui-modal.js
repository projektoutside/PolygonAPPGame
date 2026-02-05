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
        this.init();
    }

    init() {
        if (document.getElementById('customModalOverlay')) return;

        // Inject Styles
        const style = document.createElement('style');
        style.textContent = `
            .custom-modal-overlay {
                position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6);
                backdrop-filter: blur(8px); z-index: 100000;
                display: none; align-items: center; justify-content: center;
                opacity: 0; transition: opacity 0.3s ease;
                /* Mobile fixes */
                -webkit-overflow-scrolling: touch;
                touch-action: manipulation;
                pointer-events: auto;
            }
            .custom-modal-overlay.active {
                opacity: 1;
                pointer-events: auto;
            }
            .custom-modal-card {
                background: white; width: 90%; max-width: 420px;
                border-radius: 20px; padding: 28px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                transform: scale(0.95); opacity: 0;
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                display: flex; flex-direction: column; gap: 20px;
                text-align: center; border: 1px solid rgba(255, 255, 255, 0.1);
                pointer-events: auto;
                position: relative;
                z-index: 1;
            }
            .custom-modal-overlay.active .custom-modal-card {
                transform: scale(1); opacity: 1;
            }
            .custom-modal-title {
                font-family: 'Inter', system-ui, sans-serif;
                font-size: 22px; font-weight: 700; color: #1e293b;
                margin: 0; line-height: 1.3;
            }
            .custom-modal-text {
                font-family: 'Inter', system-ui, sans-serif;
                font-size: 16px; color: #64748b; line-height: 1.6;
                margin: 0;
            }
            .custom-modal-actions {
                display: flex; gap: 12px; justify-content: center; margin-top: 8px;
            }
            .custom-modal-btn {
                flex: 1; padding: 12px 20px; border-radius: 12px;
                font-family: 'Inter', system-ui, sans-serif;
                font-size: 15px; font-weight: 600; cursor: pointer;
                border: none; transition: transform 0.1s, background 0.2s;
                /* Mobile touch targets */
                min-height: 48px;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
                user-select: none;
                pointer-events: auto;
            }
            .custom-modal-btn:hover { transform: translateY(-1px); }
            .custom-modal-btn:active { transform: translateY(0); }
            
            .custom-modal-cancel {
                background: #f1f5f9; color: #64748b;
            }
            .custom-modal-cancel:hover, .custom-modal-cancel:active { 
                background: #e2e8f0; color: #475569; 
            }
            
            .custom-modal-confirm {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }
            .custom-modal-confirm:hover, .custom-modal-confirm:active { 
                box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4); 
                opacity: 0.95;
            }
            .custom-modal-alert {
                background: #3b82f6; color: white;
            }
            
            /* Mobile adjustments */
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

        // Create DOM
        this.overlay = document.createElement('div');
        this.overlay.className = 'custom-modal-overlay';
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
        document.body.appendChild(this.overlay);
        
        // Prevent clicks on overlay background from propagating
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                // Close on backdrop click (cancel behavior)
                this.close(false);
            }
        });
        
        // Prevent touch events from passing through
        this.overlay.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
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
            
            handler();
            
            setTimeout(() => {
                isProcessing = false;
            }, 100);
        };
        
        // Use pointer events if available (works on both touch and mouse)
        if ('PointerEvent' in window) {
            button.addEventListener('pointerup', wrappedHandler, { passive: false });
        } else {
            // Fallback for older browsers
            button.addEventListener('touchend', wrappedHandler, { passive: false });
            button.addEventListener('click', wrappedHandler);
        }
    }

    show(options) {
        return new Promise((resolve) => {
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

            this.overlay.style.display = 'flex';
            // Force visibility
            this.overlay.style.visibility = 'visible';
            this.overlay.style.opacity = '0';
            this.overlay.style.pointerEvents = 'auto';
            
            // Slight delay for animation
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.overlay.classList.add('active');
                });
            });
        });
    }

    close(result) {
        if (!this.overlay || this.isClosing) return;
        this.isClosing = true;
        
        this.overlay.classList.remove('active');

        setTimeout(() => {
            this.overlay.style.display = 'none';
            this.overlay.style.pointerEvents = 'none';
            this.isClosing = false;
            
            if (this.activeResolve) {
                this.activeResolve(result);
                this.activeResolve = null;
            }
        }, 300);
    }
}

// Global Instance
const modalSystem = new ModalSystem();

// Global API
window.appConfirm = async (message, options = {}) => {
    return modalSystem.show({
        type: 'confirm',
        message: message,
        title: options.title || 'Confirmation',
        confirmText: options.confirmText || 'Yes',
        cancelText: options.cancelText || 'Cancel'
    });
};

window.appAlert = async (message, options = {}) => {
    return modalSystem.show({
        type: 'alert',
        message: message,
        title: options.title || 'Alert'
    });
};
