/**
 * Background Music Manager
 * 
 * Handles playback of Main Menu music with smooth fade-out transitions.
 * Provides Promise-based fade functions for precise audio coordination.
 */
(function() {
    'use strict';
    
    const onReady = (callback) => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            setTimeout(callback, 0);
        }
    };
    
    onReady(() => {
        let music = null;
        let isFading = false;
        let isPlaying = false;
        let fadeResolve = null; // Store resolve function for current fade
        
        const log = (msg) => {
            console.log(`[Music] ${msg}`);
            if (window.MobileDebug && typeof window.MobileDebug.add === 'function') {
                window.MobileDebug.add(`Music: ${msg}`, 'info');
            }
        };
        
        const initMusic = () => {
            if (music) return true;
            
            try {
                music = new Audio('Music/MainMenu.mp3');
                music.loop = true;
                music.volume = 1.0;
                music.preload = 'auto';
                
                music.addEventListener('playing', () => {
                    isPlaying = true;
                    log('Music is now playing');
                });
                
                music.addEventListener('pause', () => {
                    isPlaying = false;
                });
                
                log('Audio object created');
                return true;
            } catch (e) {
                console.warn('[Music] Failed to create audio:', e);
                return false;
            }
        };
        
        const attemptPlay = () => {
            if (!initMusic()) return;
            if (isPlaying) return;
            
            music.play()
                .then(() => log('Background music started'))
                .catch(() => {
                    log('Autoplay prevented. Will play on first interaction.');
                    setupInteractionListener();
                });
        };
        
        const setupInteractionListener = () => {
            const handler = () => {
                if (music && music.paused && !isPlaying) {
                    music.play().catch(() => {});
                }
            };
            
            // One-time listeners that clean themselves up
            const events = ['click', 'touchend', 'keydown'];
            events.forEach(evt => {
                document.addEventListener(evt, handler, { once: true, passive: true });
            });
        };

        /**
         * Start or resume background music
         */
        const playBackgroundMusic = () => {
            if (!initMusic()) return;
            isFading = false;
            music.volume = 1.0;
            if (music.paused) {
                music.play().catch(() => setupInteractionListener());
            }
        };

        /**
         * Restart background music from the beginning
         */
        const restartBackgroundMusic = () => {
            if (!initMusic()) return;
            isFading = false;

            try {
                music.pause();
            } catch (_) {}

            music.currentTime = 0;
            music.volume = 1.0;
            music.play().catch(() => setupInteractionListener());
            log('Background music restarted from beginning');
        };

        /**
         * Immediately stop music without fade
         */
        const stopBackgroundMusicImmediate = () => {
            if (!music) return;
            
            isFading = false;
            music.volume = 0;
            music.pause();
            music.currentTime = 0;
            log('Music stopped immediately');
            
            // Resolve any pending fade promise
            if (fadeResolve) {
                fadeResolve();
                fadeResolve = null;
            }
        };

        /**
         * Fade out and stop music (legacy non-Promise version)
         * For backwards compatibility
         */
        const fadeOutAndStop = () => {
            fadeOutMusic(1500);
        };

        /**
         * Fade out music with configurable duration
         * Returns a Promise that resolves when fade is complete
         * 
         * @param {number} duration - Fade duration in milliseconds (default 1500)
         * @returns {Promise} Resolves when fade is complete
         */
        const fadeOutMusic = (duration = 1500) => {
            return new Promise((resolve) => {
                // If no music or already fading, resolve immediately
                if (!music) {
                    log('No music to fade');
                    resolve();
                    return;
                }
                
                // If music is not playing, just stop and resolve
                if (!isPlaying || music.paused) {
                    log('Music not playing, stopping immediately');
                    stopBackgroundMusicImmediate();
                    resolve();
                    return;
                }
                
                // If already fading, wait for existing fade
                if (isFading) {
                    log('Already fading, waiting for completion');
                    // Store the new resolve to be called when fade completes
                    const existingResolve = fadeResolve;
                    fadeResolve = () => {
                        if (existingResolve) existingResolve();
                        resolve();
                    };
                    return;
                }
                
                isFading = true;
                fadeResolve = resolve;
                
                log(`Starting smooth fade out (${duration}ms)...`);
                
                const startVolume = music.volume;
                const interval = 30; // Smooth 30ms intervals (~33fps)
                const steps = duration / interval;
                const volStep = startVolume / steps;
                let currentStep = 0;

                const fadeTimer = setInterval(() => {
                    if (!music) {
                        clearInterval(fadeTimer);
                        isFading = false;
                        if (fadeResolve) {
                            fadeResolve();
                            fadeResolve = null;
                        }
                        return;
                    }
                    
                    currentStep++;
                    const newVolume = Math.max(0, startVolume - (volStep * currentStep));
                    music.volume = newVolume;
                    
                    // Log progress at 25%, 50%, 75%
                    if (currentStep === Math.floor(steps * 0.5)) {
                        log(`Fade: 50% (volume: ${newVolume.toFixed(2)})`);
                    }
                    
                    if (newVolume <= 0 || currentStep >= steps) {
                        // Fade complete
                        music.volume = 0;
                        music.pause();
                        music.currentTime = 0;
                        clearInterval(fadeTimer);
                        isFading = false;
                        
                        log('Fade complete, music stopped');
                        
                        // Resolve the promise
                        if (fadeResolve) {
                            fadeResolve();
                            fadeResolve = null;
                        }
                    }
                }, interval);
            });
        };

        /**
         * Check if music is currently playing
         * @returns {boolean}
         */
        const isMusicPlaying = () => {
            return isPlaying && music && !music.paused;
        };

        /**
         * Check if music is currently fading
         * @returns {boolean}
         */
        const isMusicFading = () => {
            return isFading;
        };

        // Initialize
        initMusic();
        attemptPlay();

        // Expose for external control
        window.stopBackgroundMusic = fadeOutAndStop;          // Legacy (fire-and-forget)
        window.fadeOutBackgroundMusic = fadeOutMusic;         // Promise-based fade
        window.playBackgroundMusic = playBackgroundMusic;     // Resume/start music
        window.restartBackgroundMusic = restartBackgroundMusic; // Restart from beginning
        window.stopMusicImmediate = stopBackgroundMusicImmediate; // Instant stop
        window.isMusicPlaying = isMusicPlaying;               // Check playing state
        window.isMusicFading = isMusicFading;                 // Check fading state
        
        log('Manager initialized with smooth fade support');
    });
})();
