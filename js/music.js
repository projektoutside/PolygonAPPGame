/**
 * Background Music Manager
 * 
 * Handles playback of Main Menu music with smooth fade-out transitions
 * and mobile-friendly autoplay policy handling.
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
        let interactionListenersActive = false;
        
        const log = (msg, type = 'log') => {
            const prefix = '[Music]';
            console[type](`${prefix} ${msg}`);
        };
        
        /**
         * Initialize the Audio element
         */
        const initMusic = () => {
            if (music) return true;
            
            try {
                music = new Audio('Music/MainMenu.mp3');
                music.loop = true;
                music.volume = 1.0;
                music.preload = 'auto';
                
                // Handle successful play
                music.addEventListener('playing', () => {
                    isPlaying = true;
                    removeInteractionListeners();
                    log('Music is now playing');
                });
                
                // Handle pause/stop
                music.addEventListener('pause', () => {
                    isPlaying = false;
                });
                
                // Handle errors
                music.addEventListener('error', (e) => {
                    log(`Audio error: ${e.message || 'unknown'}`, 'warn');
                });
                
                log('Audio object created');
                return true;
            } catch (e) {
                log(`Failed to create audio: ${e.message}`, 'warn');
                return false;
            }
        };
        
        /**
         * Attempt to play music, using AudioUnlock if available
         */
        const attemptPlay = async () => {
            if (!initMusic()) return false;
            if (isPlaying) return true;
            
            try {
                // Use AudioUnlock if available (critical for iOS)
                if (window.AudioUnlock && !window.AudioUnlock.unlocked) {
                    await window.AudioUnlock.unlock();
                }
                
                await music.play();
                log('Background music started');
                return true;
            } catch (error) {
                log('Autoplay prevented. Waiting for user interaction.');
                setupInteractionListeners();
                return false;
            }
        };
        
        /**
         * Handler for user interaction to unlock audio
         */
        const handleInteraction = async () => {
            if (isPlaying) {
                removeInteractionListeners();
                return;
            }
            
            try {
                // Unlock AudioContext first
                if (window.AudioUnlock) {
                    await window.AudioUnlock.unlock();
                }
                
                // Try to play
                if (music && music.paused) {
                    await music.play();
                }
            } catch (e) {
                log(`Play on interaction failed: ${e.message}`, 'warn');
                // Don't remove listeners - try again on next interaction
            }
        };
        
        /**
         * Setup interaction listeners (persistent until music plays)
         */
        const setupInteractionListeners = () => {
            if (interactionListenersActive) return;
            interactionListenersActive = true;
            
            const events = ['pointerdown', 'touchstart', 'click', 'keydown'];
            events.forEach(evt => {
                document.addEventListener(evt, handleInteraction, { passive: true });
            });
            
            log('Interaction listeners active');
        };
        
        /**
         * Remove interaction listeners (called when music successfully plays)
         */
        const removeInteractionListeners = () => {
            if (!interactionListenersActive) return;
            
            const events = ['pointerdown', 'touchstart', 'click', 'keydown'];
            events.forEach(evt => {
                document.removeEventListener(evt, handleInteraction);
            });
            
            interactionListenersActive = false;
        };

        /**
         * Start or resume the background music at full volume
         */
        const playBackgroundMusic = async () => {
            if (!initMusic()) return;
            
            isFading = false;
            music.volume = 1.0;
            
            if (music.paused) {
                await attemptPlay();
            }
        };

        /**
         * Smoothly fade out the music volume and then pause
         */
        const fadeOutAndStop = () => {
            if (!music) return;
            if (isFading) return;
            
            // If not playing, just ensure it's stopped
            if (!isPlaying && music.paused) {
                return;
            }
            
            isFading = true;
            log('Fading out...');
            
            const duration = 1500;
            const interval = 50;
            const steps = duration / interval;
            const volStep = music.volume / steps;

            const fadeTimer = setInterval(() => {
                if (!music) {
                    clearInterval(fadeTimer);
                    isFading = false;
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
                    log('Fade complete, music stopped');
                }
            }, interval);
        };

        // Initialize immediately
        initMusic();
        
        // Try to autoplay (will likely fail on mobile, that's OK)
        attemptPlay();

        // Expose for external control
        window.stopBackgroundMusic = fadeOutAndStop;
        window.playBackgroundMusic = playBackgroundMusic;

        // Attach fade-out to Play Game button
        const btnFun = document.getElementById('btnFunMode');
        if (btnFun) {
            const addMobileHandler = (element, handler) => {
                let lastTime = 0;
                const wrappedHandler = () => {
                    const now = Date.now();
                    if (now - lastTime < 300) return;
                    lastTime = now;
                    handler();
                };
                
                if ('PointerEvent' in window) {
                    element.addEventListener('pointerup', wrappedHandler, { passive: true });
                } else {
                    element.addEventListener('touchend', wrappedHandler, { passive: true });
                    element.addEventListener('click', wrappedHandler);
                }
            };
            
            addMobileHandler(btnFun, fadeOutAndStop);
        }
        
        log('Manager initialized');
    });
})();
