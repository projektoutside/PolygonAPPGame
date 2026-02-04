/**
 * Background Music Manager
 * Handles playback of Main Menu music with fade-out transitions.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Audio
    const music = new Audio('Music/MainMenu.mp3');
    music.loop = true;
    music.volume = 1.0;

    // Track state to prevent multiple actions
    let isFading = false;
    let hasInteracted = false;

    /**
     * Attempts to play music, handling browser autoplay policies.
     */
    const attemptPlay = () => {
        if (typeof window.ensureAudioUnlocked === 'function') {
            window.ensureAudioUnlocked();
        }
        music.play().then(() => {
            console.log('Background music started');
        }).catch(error => {
            console.log('Autoplay prevented by browser. Waiting for user interaction.');
            // Add a one-time listener to the whole document to start music on first click
            document.addEventListener('click', () => {
                if (!hasInteracted && music.paused) {
                    music.play().catch(e => console.error('Play failed:', e));
                    hasInteracted = true;
                }
            }, { once: true });
        });
    };

    /**
     * Starts (or resumes) the background music at full volume.
     */
    const playBackgroundMusic = () => {
        isFading = false;
        hasInteracted = true;
        music.volume = 1.0;
        if (typeof window.ensureAudioUnlocked === 'function') {
            window.ensureAudioUnlocked();
        }
        if (music.paused) {
            music.play().catch(error => {
                console.log('Play prevented by browser. Waiting for user interaction.');
                document.addEventListener('click', () => {
                    if (music.paused) {
                        music.play().catch(e => console.error('Play failed:', e));
                    }
                }, { once: true });
            });
        }
    };

    /**
     * Smoothly fades out the music volume and then pauses it.
     */
    const fadeOutAndStop = () => {
        if (isFading) return;
        isFading = true;

        const duration = 1500; // 1.5 seconds fade out
        const interval = 50; // Update every 50ms
        const steps = duration / interval;
        const volStep = music.volume / steps;

        const fadeTimer = setInterval(() => {
            if (music.volume > volStep) {
                music.volume = Math.max(0, music.volume - volStep);
            } else {
                music.volume = 0;
                music.pause();
                music.currentTime = 0; // Reset for next time
                clearInterval(fadeTimer);
                isFading = false; // Reset flag in case we want to play again later
            }
        }, interval);
    };

    // Start trying to play immediately
    attemptPlay();

    // Expose for external control (menu-fix.js)
    window.stopBackgroundMusic = fadeOutAndStop;
    window.playBackgroundMusic = playBackgroundMusic;

    // Attach listeners to the specific buttons requested
    const btnFun = document.getElementById('btnFunMode');
    const btnLearn = document.getElementById('btnLearnMode');

    if (btnFun) {
        btnFun.addEventListener('click', () => {
            hasInteracted = true; // Ensure we don't try to auto-play after this
            fadeOutAndStop();
        });
    }

    if (btnLearn) {
        btnLearn.addEventListener('click', () => {
            hasInteracted = true;
            fadeOutAndStop();
        });
    }
});
