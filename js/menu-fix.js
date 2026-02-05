/**
 * Menu Fix V5 - Mobile-first event handling for Polygon Fun Game
 * 
 * FIXES:
 * 1. DOMContentLoaded race condition - uses IIFE with readyState check
 * 2. Touch/click event reliability - uses pointer events with fallback
 * 3. Mobile debug overlay for diagnosing issues
 */

(function() {
    'use strict';

    // ========================================================================
    // MOBILE DEBUG INSTRUMENTATION
    // ========================================================================
    const DEBUG_MODE = false; // Set to true to enable debug overlay on mobile
    
    const MobileDebug = {
        overlay: null,
        log: [],
        maxLogs: 15,

        init() {
            if (!DEBUG_MODE) return;
            
            // Create debug overlay
            const overlay = document.createElement('div');
            overlay.id = 'mobileDebugOverlay';
            overlay.style.cssText = `
                position: fixed;
                bottom: 10px;
                left: 10px;
                right: 10px;
                max-height: 200px;
                background: rgba(0, 0, 0, 0.85);
                color: #00ff00;
                font-family: monospace;
                font-size: 11px;
                padding: 8px;
                border-radius: 8px;
                z-index: 99999;
                overflow-y: auto;
                pointer-events: none;
                border: 1px solid #00ff00;
            `;
            overlay.innerHTML = '<div id="mobileDebugLog"></div>';
            document.body.appendChild(overlay);
            this.overlay = overlay;
        },

        add(msg, type = 'info') {
            const timestamp = new Date().toISOString().substr(11, 12);
            const colors = { info: '#00ff00', warn: '#ffff00', error: '#ff4444', event: '#00ffff' };
            const entry = { timestamp, msg, type, color: colors[type] || colors.info };
            
            this.log.push(entry);
            if (this.log.length > this.maxLogs) this.log.shift();
            
            console.log(`[MenuFix ${type.toUpperCase()}] ${msg}`);
            
            if (DEBUG_MODE && this.overlay) {
                const logDiv = document.getElementById('mobileDebugLog');
                if (logDiv) {
                    logDiv.innerHTML = this.log.map(e => 
                        `<div style="color:${e.color}">[${e.timestamp}] ${e.msg}</div>`
                    ).join('');
                    logDiv.scrollTop = logDiv.scrollHeight;
                }
            }
        },

        logPanelState(panelId) {
            const panel = document.getElementById(panelId);
            if (!panel) {
                this.add(`Panel #${panelId}: NOT FOUND`, 'error');
                return;
            }
            const styles = window.getComputedStyle(panel);
            const rect = panel.getBoundingClientRect();
            this.add(`Panel #${panelId}:`, 'info');
            this.add(`  display=${styles.display}, visibility=${styles.visibility}`, 'info');
            this.add(`  opacity=${styles.opacity}, z-index=${styles.zIndex}`, 'info');
            this.add(`  rect: x=${rect.x.toFixed(0)}, y=${rect.y.toFixed(0)}, w=${rect.width.toFixed(0)}, h=${rect.height.toFixed(0)}`, 'info');
        }
    };

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================
    const hideElement = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
            el.classList.remove('active');
        }
    };

    const stopMusic = () => {
        if (window.stopBackgroundMusic) {
            window.stopBackgroundMusic();
        } else {
            MobileDebug.add('stopBackgroundMusic not found', 'warn');
        }
    };

    const runTransitionOverlay = (callback) => {
        const overlay = document.getElementById('funTransitionOverlay');
        if (!overlay) {
            if (callback) callback();
            return;
        }

        overlay.classList.remove('exit');
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');

        setTimeout(() => {
            if (callback) callback();
            overlay.classList.add('exit');

            setTimeout(() => {
                overlay.classList.remove('active', 'exit');
                overlay.setAttribute('aria-hidden', 'true');
            }, 850);
        }, 500);
    };

    // ========================================================================
    // SAVE SLOT UTILITIES
    // ========================================================================
    const getActiveFunSlot = (maxSlots = 3) => {
        const stored = parseInt(localStorage.getItem('polygonFunActiveSlot'), 10);
        if (!Number.isFinite(stored) || stored < 1 || stored > maxSlots) {
            return 1;
        }
        return stored;
    };

    const getFunSlotData = (slot) => {
        const key = `polygonFunSaveSlot${slot}`;
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (error) {
            MobileDebug.add('Failed to parse fun game slot data', 'warn');
            return null;
        }
    };

    const getFunSlotSummary = (slot, slotData) => {
        if (!slotData || !slotData.appState) {
            return `Active Slot ${slot}: Empty. Start a new run to create a save.`;
        }
        const savedAt = slotData.savedAt ? new Date(slotData.savedAt) : null;
        const levelIndex = Number.isFinite(slotData.levelIndex)
            ? slotData.levelIndex + 1
            : null;
        const timeText = savedAt ? savedAt.toLocaleString() : 'Unknown time';
        const levelText = levelIndex ? `Level ${levelIndex}` : 'Unknown level';
        return `Active Slot ${slot}: Saved • ${levelText} • ${timeText}`;
    };

    const getFunSaveStatus = (slotCount = 3) => {
        const activeSlot = getActiveFunSlot(slotCount);
        let hasAnySave = false;
        for (let slot = 1; slot <= slotCount; slot++) {
            const slotData = getFunSlotData(slot);
            if (slotData && slotData.appState) {
                hasAnySave = true;
                break;
            }
        }
        const activeSlotData = getFunSlotData(activeSlot);
        const activeHasSave = !!(activeSlotData && activeSlotData.appState);
        return {
            activeSlot,
            activeSlotData,
            activeHasSave,
            hasAnySave
        };
    };

    const formatSlotStatus = (slot, slotData, isActive) => {
        if (!slotData || !slotData.appState) {
            return {
                label: 'Empty',
                detail: 'Start a new run to create a save in this slot.'
            };
        }
        const savedAt = slotData.savedAt ? new Date(slotData.savedAt) : null;
        const levelIndex = Number.isFinite(slotData.levelIndex) ? slotData.levelIndex + 1 : null;
        const timeText = savedAt ? savedAt.toLocaleString() : 'Unknown time';
        const levelText = levelIndex ? `Level ${levelIndex}` : 'Unknown level';
        return {
            label: isActive ? 'Active' : 'Saved',
            detail: `${levelText} • ${timeText}`
        };
    };

    // ========================================================================
    // FUN GAME PANEL MANAGEMENT
    // ========================================================================
    let funOverlay, mainMenuOverlay, funMeta, funSlots;

    const hideMainMenuOverlay = () => {
        if (!mainMenuOverlay) return;
        mainMenuOverlay.classList.add('hidden');
        mainMenuOverlay.style.display = 'flex';
    };

    const showMainMenuOverlay = () => {
        if (!mainMenuOverlay) return;
        mainMenuOverlay.classList.remove('hidden');
        mainMenuOverlay.style.display = 'flex';
    };

    const updateFunPanelMeta = () => {
        if (!funMeta) return;
        const status = getFunSaveStatus();
        funMeta.textContent = status.hasAnySave
            ? getFunSlotSummary(status.activeSlot, status.activeSlotData)
            : 'No saved games yet. Start a new run to begin tracking progress.';
    };

    const startFunModeFromSlot = (slot, slotData) => {
        closeFunPanel();

        runTransitionOverlay(() => {
            hideElement('mainMenuOverlay');
            hideElement('learnPage');
            hideElement('gameTutorialPage');

            if (window.game) {
                window.game.startMode('beginner');
                if (window.game.currentMode) {
                    window.game.currentMode.setActiveSaveSlot(slot);
                    if (slotData && slotData.appState) {
                        window.game.currentMode.loadSlot(slot);
                    } else {
                        window.game.currentMode.openBoxScore();
                    }
                }
            } else {
                MobileDebug.add('Game instance not found', 'error');
            }
        });
    };

    const renderFunSlots = () => {
        if (!funSlots) return;
        const maxSlots = 3;
        const status = getFunSaveStatus(maxSlots);
        funSlots.innerHTML = '';

        for (let slot = 1; slot <= maxSlots; slot++) {
            const slotData = getFunSlotData(slot);
            const isActive = slot === status.activeSlot;
            const slotStatus = formatSlotStatus(slot, slotData, isActive);

            const card = document.createElement('div');
            card.className = `fun-game-start-slot${isActive ? ' active' : ''}`;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.dataset.slot = `${slot}`;
            card.innerHTML = `
                <div class="fun-game-start-slot-header">
                    <span>Slot ${slot}</span>
                    <span class="fun-game-start-slot-status">${slotStatus.label}</span>
                </div>
                <div class="fun-game-start-slot-detail">${slotStatus.detail}</div>
                <button class="fun-game-start-slot-action" ${slotData && slotData.appState ? '' : 'disabled'}>
                    Load Slot ${slot}
                </button>
            `;

            const handleLoad = () => {
                if (!slotData || !slotData.appState) {
                    updateFunPanelMeta();
                    return;
                }
                localStorage.setItem('polygonFunActiveSlot', `${slot}`);
                startFunModeFromSlot(slot, slotData);
            };

            const actionBtn = card.querySelector('.fun-game-start-slot-action');
            if (actionBtn) {
                addUniversalClickHandler(actionBtn, (event) => {
                    event.stopPropagation();
                    handleLoad();
                });
            }

            addUniversalClickHandler(card, () => {
                localStorage.setItem('polygonFunActiveSlot', `${slot}`);
                renderFunSlots();
                updateFunPanelMeta();
            });

            card.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    localStorage.setItem('polygonFunActiveSlot', `${slot}`);
                    renderFunSlots();
                    updateFunPanelMeta();
                }
            });

            funSlots.appendChild(card);
        }
    };

    /**
     * SINGLE SOURCE OF TRUTH: Opens the Fun Game Start Panel
     * This is the ONLY function that should show the popup.
     */
    const openFunPanel = () => {
        MobileDebug.add('openFunPanel() called', 'event');
        
        if (!funOverlay) {
            funOverlay = document.getElementById('funGameStartOverlay');
            MobileDebug.add(`funOverlay found: ${!!funOverlay}`, 'info');
        }
        
        if (!funOverlay) {
            MobileDebug.add('CRITICAL: funGameStartOverlay not found!', 'error');
            return;
        }
        
        hideMainMenuOverlay();
        updateFunPanelMeta();
        renderFunSlots();
        
        // Force display with multiple properties for maximum compatibility
        funOverlay.style.display = 'flex';
        funOverlay.style.visibility = 'visible';
        funOverlay.style.opacity = '1';
        funOverlay.setAttribute('aria-hidden', 'false');
        
        MobileDebug.add('Panel opened successfully', 'info');
        MobileDebug.logPanelState('funGameStartOverlay');
    };

    const closeFunPanel = () => {
        MobileDebug.add('closeFunPanel() called', 'event');
        
        if (!funOverlay) return;
        funOverlay.style.display = 'none';
        funOverlay.setAttribute('aria-hidden', 'true');
        showMainMenuOverlay();
    };

    // ========================================================================
    // CROSS-PLATFORM EVENT HANDLING
    // ========================================================================
    
    /**
     * Adds a universal click handler that works on both mobile and desktop.
     * Uses a combination of click and touchend for maximum compatibility.
     * Prevents ghost clicks and double-firing.
     */
    const addUniversalClickHandler = (element, handler, options = {}) => {
        if (!element) return;
        
        let lastTouchTime = 0;
        const TOUCH_THRESHOLD = 300; // ms to prevent ghost clicks
        
        // Touch handler - fires first on mobile
        element.addEventListener('touchend', (event) => {
            // Only handle single touch
            if (event.changedTouches.length !== 1) return;
            
            // Check if touch is within element bounds (prevents swipe-off triggers)
            const touch = event.changedTouches[0];
            const rect = element.getBoundingClientRect();
            if (touch.clientX < rect.left || touch.clientX > rect.right ||
                touch.clientY < rect.top || touch.clientY > rect.bottom) {
                return;
            }
            
            lastTouchTime = Date.now();
            MobileDebug.add(`Touch event on ${element.id || element.className}`, 'event');
            
            // Prevent default to stop click event from also firing
            event.preventDefault();
            handler(event);
        }, { passive: false });
        
        // Click handler - fires on desktop, also fallback for some mobile cases
        element.addEventListener('click', (event) => {
            // Skip if this was already handled by touch
            if (Date.now() - lastTouchTime < TOUCH_THRESHOLD) {
                MobileDebug.add('Click suppressed (recent touch)', 'info');
                return;
            }
            
            MobileDebug.add(`Click event on ${element.id || element.className}`, 'event');
            handler(event);
        });
    };

    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    const initMenuFix = () => {
        MobileDebug.add('Menu Fix V5 initializing...', 'info');
        MobileDebug.add(`Document readyState: ${document.readyState}`, 'info');

        // Cache DOM references
        funOverlay = document.getElementById('funGameStartOverlay');
        mainMenuOverlay = document.getElementById('mainMenuOverlay');
        funMeta = document.getElementById('funGameStartMeta');
        funSlots = document.getElementById('funGameStartSlots');
        
        MobileDebug.add(`Found funOverlay: ${!!funOverlay}`, 'info');
        MobileDebug.add(`Found mainMenuOverlay: ${!!mainMenuOverlay}`, 'info');

        const ensureDefaultTriangle = () => {
            if (window.app) {
                if (window.app.polygons.length === 0) {
                    MobileDebug.add('Creating default triangle for sandbox mode', 'info');
                    const triangleOption = document.querySelector('[data-shape="triangle"]');
                    if (triangleOption) {
                        window.app.selectShape(triangleOption);
                    }
                }
            }
        };

        // ====================================================================
        // 1. FIX "Learn Polygon Playground" Button
        // ====================================================================
        const learnBtn = document.getElementById('btnLearnMode');
        if (learnBtn) {
            const newBtn = learnBtn.cloneNode(true);
            learnBtn.parentNode.replaceChild(newBtn, learnBtn);

            addUniversalClickHandler(newBtn, () => {
                MobileDebug.add('Learn Mode button pressed', 'event');
                stopMusic();
                hideElement('mainMenuOverlay');
                hideElement('learnPage');
                hideElement('gameTutorialPage');

                if (window.game) {
                    window.game.stop();
                }

                setTimeout(ensureDefaultTriangle, 100);
            });
        }

        // ====================================================================
        // 2. FIX "Polygon Fun Game" Button - CRITICAL FOR MOBILE
        // ====================================================================
        const funBtn = document.getElementById('btnFunMode');
        if (funBtn) {
            MobileDebug.add('Found btnFunMode, replacing with fixed version', 'info');
            
            const newFunBtn = funBtn.cloneNode(true);
            funBtn.parentNode.replaceChild(newFunBtn, funBtn);

            addUniversalClickHandler(newFunBtn, () => {
                MobileDebug.add('Fun Mode button pressed - opening panel', 'event');
                stopMusic();
                hideElement('learnPage');
                hideElement('gameTutorialPage');
                openFunPanel();
            });
            
            MobileDebug.add('btnFunMode handler attached', 'info');
        } else {
            MobileDebug.add('CRITICAL: btnFunMode not found!', 'error');
        }

        // ====================================================================
        // 3. FIX Fun Panel Close Button
        // ====================================================================
        const funCloseBtn = document.getElementById('funGameStartClose');
        if (funCloseBtn && funOverlay) {
            const newCloseBtn = funCloseBtn.cloneNode(true);
            funCloseBtn.parentNode.replaceChild(newCloseBtn, funCloseBtn);
            
            addUniversalClickHandler(newCloseBtn, () => {
                closeFunPanel();
            });
        }

        // ====================================================================
        // 4. FIX Fun Panel Backdrop Click
        // ====================================================================
        if (funOverlay) {
            addUniversalClickHandler(funOverlay, (event) => {
                if (event.target === funOverlay) {
                    closeFunPanel();
                }
            });
        }

        // ====================================================================
        // 5. FIX "New Game" Button
        // ====================================================================
        const funNewBtn = document.getElementById('funGameStartNew');
        if (funNewBtn) {
            const newBtn = funNewBtn.cloneNode(true);
            funNewBtn.parentNode.replaceChild(newBtn, funNewBtn);
            
            addUniversalClickHandler(newBtn, async () => {
                MobileDebug.add('New Game button pressed', 'event');
                
                const status = getFunSaveStatus();
                if (status.activeHasSave) {
                    let confirmNew = false;
                    if (window.appConfirm) {
                        confirmNew = await window.appConfirm(
                            `Start a new game in Slot ${status.activeSlot}? This will overwrite the current save.`,
                            {
                                title: 'Overwrite Save?',
                                confirmText: 'Yes, Overwrite',
                                cancelText: 'Cancel'
                            }
                        );
                    } else {
                        confirmNew = confirm(`Start a new game in Slot ${status.activeSlot}? This will overwrite the current save.`);
                    }

                    if (!confirmNew) {
                        return;
                    }
                }
                
                // Clear save data and tutorial_seen flag for fresh start
                localStorage.setItem('polygonFunActiveSlot', `${status.activeSlot}`);
                localStorage.removeItem(`polygonFunSaveSlot${status.activeSlot}`);
                localStorage.removeItem(`polygonFunStarsSlot${status.activeSlot}`);
                localStorage.removeItem('tutorial_seen'); // Force tutorial to show for new game
                
                closeFunPanel();

                runTransitionOverlay(() => {
                    // Ensure all overlays are hidden
                    hideElement('mainMenuOverlay');
                    hideElement('learnPage');
                    hideElement('gameTutorialPage');
                    
                    // Double-ensure learnPage is hidden (belt and suspenders)
                    const learnPageEl = document.getElementById('learnPage');
                    if (learnPageEl) {
                        learnPageEl.style.display = 'none';
                        learnPageEl.classList.remove('active');
                    }

                    if (window.game) {
                        MobileDebug.add('Starting beginner mode...', 'info');
                        window.game.startMode('beginner');
                        
                        if (window.game.currentMode) {
                            window.game.currentMode.setActiveSaveSlot(status.activeSlot);
                            window.game.currentMode.loadLevel(0);
                        }

                        // Show tutorial after game initializes
                        // Use longer delay to ensure game mode is fully set up
                        setTimeout(() => {
                            MobileDebug.add('Attempting to show tutorial...', 'info');
                            if (window.tutorial) {
                                try {
                                    window.tutorial.show();
                                    MobileDebug.add('Tutorial show() called successfully', 'info');
                                } catch (err) {
                                    MobileDebug.add(`Tutorial error: ${err.message}`, 'error');
                                    console.error('Tutorial show error:', err);
                                }
                            } else {
                                MobileDebug.add('Tutorial instance not found!', 'error');
                            }
                        }, 200);
                    } else {
                        MobileDebug.add('Game instance not found', 'error');
                    }
                });
            });
        }

        // ====================================================================
        // 6. Initial Render of Save Slots
        // ====================================================================
        if (funSlots) {
            renderFunSlots();
        }

        // ====================================================================
        // 7. FIX Top Bar "Learn Polygons" Button
        // ====================================================================
        const topLearnBtn = document.getElementById('openLearnPageBtn');
        if (topLearnBtn) {
            const newTopBtn = topLearnBtn.cloneNode(true);
            topLearnBtn.parentNode.replaceChild(newTopBtn, topLearnBtn);

            addUniversalClickHandler(newTopBtn, () => {
                const learnPage = document.getElementById('learnPage');
                if (learnPage) {
                    learnPage.style.display = 'flex';
                    learnPage.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            });
        }

        // ====================================================================
        // 8. FIX Close Button on Learn Page
        // ====================================================================
        const closeLearnBtn = document.getElementById('closeLearnPageBtn');
        if (closeLearnBtn) {
            const newCloseBtn = closeLearnBtn.cloneNode(true);
            closeLearnBtn.parentNode.replaceChild(newCloseBtn, closeLearnBtn);

            addUniversalClickHandler(newCloseBtn, () => {
                hideElement('learnPage');
                document.body.style.overflow = '';
            });
        }

        MobileDebug.add('Menu Fix V5 initialization complete', 'info');
    };

    // ========================================================================
    // ROBUST DOM READY HANDLING
    // Fixes the race condition where DOMContentLoaded may have already fired
    // ========================================================================
    const onDOMReady = (callback) => {
        if (document.readyState === 'loading') {
            // DOM not ready yet, wait for event
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            // DOM already ready, call immediately
            // Use setTimeout to ensure call stack is clear
            setTimeout(callback, 0);
        }
    };

    // Start initialization with debug overlay
    onDOMReady(() => {
        MobileDebug.init();
        initMenuFix();
    });

    // Export openFunPanel for potential external use
    window.openFunGamePanel = openFunPanel;

})();
