/**
 * Audio Unlock Utility
 * 
 * Handles iOS/Safari AudioContext unlocking on first user interaction.
 */
(() => {
    const AudioUnlock = {
        unlocked: false,
        ctx: null,
        
        unlock() {
            if (this.unlocked) return Promise.resolve(true);
            
            return new Promise((resolve) => {
                try {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    if (AudioContext && !this.ctx) {
                        this.ctx = new AudioContext();
                    }

                    if (this.ctx && this.ctx.state === 'suspended') {
                        this.ctx.resume()
                            .then(() => {
                                this.unlocked = true;
                                resolve(true);
                            })
                            .catch(() => resolve(false));
                    } else {
                        this.unlocked = true;
                        resolve(true);
                    }
                } catch (error) {
                    console.warn('[AudioUnlock] Failed:', error);
                    resolve(false);
                }
            });
        },
        
        requestUnlock() {
            if (this.unlocked) return;

            const handler = () => {
                this.unlock();
                cleanup();
            };
            
            const cleanup = () => {
                ['click', 'touchend', 'keydown'].forEach((evt) => {
                    document.removeEventListener(evt, handler);
                });
            };
            
            ['click', 'touchend', 'keydown'].forEach((evt) => {
                document.addEventListener(evt, handler, { once: true, passive: true });
            });
        }
    };

    window.AudioUnlock = AudioUnlock;
    
    // Auto-setup on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AudioUnlock.requestUnlock());
    } else {
        AudioUnlock.requestUnlock();
    }
})();
