class ModalSystem {
    constructor() {
        this.overlay = null;
        this.activeResolve = null;
        this.init();
    }

    init() {
        if (document.getElementById('customModalOverlay')) return;

        // Inject Styles
        const style = document.createElement('style');
        style.textContent = `
            .custom-modal-overlay {
                position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6);
                backdrop-filter: blur(8px); z-index: 10000;
                display: none; align-items: center; justify-content: center;
                opacity: 0; transition: opacity 0.3s ease;
            }
            .custom-modal-overlay.active {
                opacity: 1;
            }
            .custom-modal-card {
                background: white; width: 90%; max-width: 420px;
                border-radius: 20px; padding: 28px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                transform: scale(0.95); opacity: 0;
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                display: flex; flex-direction: column; gap: 20px;
                text-align: center; border: 1px solid rgba(255, 255, 255, 0.1);
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
            }
            .custom-modal-btn:hover { transform: translateY(-1px); }
            .custom-modal-btn:active { transform: translateY(0); }
            
            .custom-modal-cancel {
                background: #f1f5f9; color: #64748b;
            }
            .custom-modal-cancel:hover { background: #e2e8f0; color: #475569; }
            
            .custom-modal-confirm {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }
            .custom-modal-confirm:hover { 
                box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4); 
                opacity: 0.95;
            }
            .custom-modal-alert {
                background: #3b82f6; color: white;
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
    }

    show(options) {
        return new Promise((resolve) => {
            this.activeResolve = resolve;

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
                    cancelBtn.onclick = () => this.close(false);
                    actionsEl.appendChild(cancelBtn);

                    // Confirm Button
                    const confirmBtn = document.createElement('button');
                    confirmBtn.className = 'custom-modal-btn custom-modal-confirm';
                    confirmBtn.textContent = options.confirmText || 'Confirm';
                    confirmBtn.onclick = () => this.close(true);
                    actionsEl.appendChild(confirmBtn);
                } else {
                    // Alert (OK only)
                    const okBtn = document.createElement('button');
                    okBtn.className = 'custom-modal-btn custom-modal-confirm';
                    okBtn.textContent = options.confirmText || 'OK';
                    okBtn.onclick = () => this.close(true);
                    actionsEl.appendChild(okBtn);
                }
            }

            this.overlay.style.display = 'flex';
            // Slight delay active class for animation
            requestAnimationFrame(() => {
                this.overlay.classList.add('active');
            });
        });
    }

    close(animateResult) {
        if (!this.overlay) return;
        this.overlay.classList.remove('active');

        setTimeout(() => {
            this.overlay.style.display = 'none';
            if (this.activeResolve) {
                this.activeResolve(animateResult);
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
