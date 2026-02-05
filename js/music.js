/**
 * Background Music Manager
 * 
 * Handles playback of Main Menu music with smooth fade-out transitions.
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
        
        const log = (msg) => console.log(`[Music] ${msg}`);
        
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

        const playBackgroundMusic = () => {
            if (!initMusic()) return;
            isFading = false;
            music.volume = 1.0;
            if (music.paused) {
                music.play().catch(() => setupInteractionListener());
            }
        };

        const fadeOutAndStop = () => {
            if (!music || isFading || !isPlaying) return;
            
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

        // Initialize
        initMusic();
        attemptPlay();

        // Expose for external control
        window.stopBackgroundMusic = fadeOutAndStop;
        window.playBackgroundMusic = playBackgroundMusic;
        
        log('Manager initialized');
    });
})();
