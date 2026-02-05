/**
 * Background Music Manager V2 - Mobile-Robust Version
 * Handles playback of Main Menu music with fade-out transitions.
 */
(function() {
    'use strict';
    
    // Wait for DOM
    const onReady = (callback) => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            setTimeout(callback, 0);
        }
    };
    
    onReady(() => {
        // Initialize Audio
        let music = null;
        let isFading = false;
        let hasInteracted = false;
        let musicInitialized = false;
        
        const initMusic = () => {
            if (musicInitialized) return;
            try {
                music = new Audio('Music/MainMenu.mp3');
                music.loop = true;
                music.volume = 1.0;
                musicInitialized = true;
                console.log('[Music] Audio object created');
            } catch (e) {
                console.warn('[Music] Failed to create audio:', e);
            }
        };
        
        // Initialize immediately
        initMusic();

        /**
         * Attempts to play music, handling browser autoplay policies.
         */
        const attemptPlay = () => {
            if (!music) {
                initMusic();
                if (!music) return;
            }
            
            music.play().then(() => {
                console.log('[Music] Background music started');
                hasInteracted = true;
            }).catch(error => {
                console.log('[Music] Autoplay prevented. Waiting for user interaction.');
                // Set up one-time interaction listener
                setupInteractionListener();
            });
        };
        
        const setupInteractionListener = () => {
            const handler = () => {
                if (!hasInteracted && music && music.paused) {
                    music.play().catch(e => console.warn('[Music] Play failed:', e));
                    hasInteracted = true;
                }
                cleanup();
            };
            
            const cleanup = () => {
                ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(evt => {
                    document.removeEventListener(evt, handler);
                });
            };
            
            ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(evt => {
                document.addEventListener(evt, handler, { once: true, passive: true });
            });
        };

        /**
         * Starts (or resumes) the background music at full volume.
         */
        const playBackgroundMusic = () => {
            if (!music) {
                initMusic();
                if (!music) return;
            }
            
            isFading = false;
            hasInteracted = true;
            music.volume = 1.0;
            
            if (music.paused) {
                music.play().catch(error => {
                    console.log('[Music] Play prevented. Waiting for interaction.');
                    setupInteractionListener();
                });
            }
        };

        /**
         * Smoothly fades out the music volume and then pauses it.
         */
        const fadeOutAndStop = () => {
            if (!music) return;
            if (isFading) return;
            isFading = true;

            console.log('[Music] Fading out...');
            
            const duration = 1500; // 1.5 seconds fade out
            const interval = 50; // Update every 50ms
            const steps = duration / interval;
            const volStep = music.volume / steps;

            const fadeTimer = setInterval(() => {
                if (!music) {
                    clearInterval(fadeTimer);
                    return;
                }
                
                if (music.volume > volStep) {
                    music.volume = Math.max(0, music.volume - volStep);
                } else {
                    music.volume = 0;
                    music.pause();
                    music.currentTime = 0;
                    clearInterval(fadeTimer);
                    isFading = false;
                    console.log('[Music] Fade complete, music stopped');
                }
            }, interval);
        };

        // Start trying to play immediately
        attemptPlay();

        // Expose for external control
        window.stopBackgroundMusic = fadeOutAndStop;
        window.playBackgroundMusic = playBackgroundMusic;

        // Attach listeners to the specific buttons
        // Use mobile-friendly event handling
        const addMobileHandler = (element, handler) => {
            if (!element) return;
            
            let lastTime = 0;
            const wrappedHandler = () => {
                const now = Date.now();
                if (now - lastTime < 300) return;
                lastTime = now;
                hasInteracted = true;
                handler();
            };
            
            if ('PointerEvent' in window) {
                element.addEventListener('pointerup', wrappedHandler, { passive: true });
            } else {
                element.addEventListener('touchend', wrappedHandler, { passive: true });
                element.addEventListener('click', wrappedHandler);
            }
        };
        
        const btnFun = document.getElementById('btnFunMode');
        const btnLearn = document.getElementById('btnLearnMode');

        addMobileHandler(btnFun, fadeOutAndStop);
        addMobileHandler(btnLearn, fadeOutAndStop);
        
        console.log('[Music] Manager initialized');
    });
})();
