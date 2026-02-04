(() => {
    const AudioUnlock = {
        unlocked: false,
        ctx: null,
        pendingPromise: null,
        async unlock() {
            if (this.unlocked) return true;
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext && !this.ctx) {
                    this.ctx = new AudioContext();
                }

                if (this.ctx && this.ctx.state === 'suspended') {
                    await this.ctx.resume();
                }

                this.unlocked = true;
                return true;
            } catch (error) {
                console.warn('Audio unlock failed:', error);
                return false;
            }
        },
        requestUnlock() {
            if (this.unlocked) {
                return Promise.resolve(true);
            }

            if (this.pendingPromise) {
                return this.pendingPromise;
            }

            this.pendingPromise = new Promise((resolve) => {
                const handler = async () => {
                    const ok = await this.unlock();
                    cleanup();
                    resolve(ok);
                };
                const cleanup = () => {
                    ['pointerdown', 'touchstart', 'click', 'keydown'].forEach((evt) => {
                        document.removeEventListener(evt, handler);
                    });
                    this.pendingPromise = null;
                };
                ['pointerdown', 'touchstart', 'click', 'keydown'].forEach((evt) => {
                    document.addEventListener(evt, handler, { once: true, passive: true });
                });
            });

            return this.pendingPromise;
        }
    };

    window.AudioUnlock = AudioUnlock;
    window.ensureAudioUnlocked = () => AudioUnlock.requestUnlock();
})();