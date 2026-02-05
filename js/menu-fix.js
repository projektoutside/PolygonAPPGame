/**
 * Menu Fix V6 - Robust Mobile Tutorial Fix
 * 
 * FIXES APPLIED:
 * 1. Race condition in tutorial loading - uses Promises and proper sequencing
 * 2. Touch/click event reliability - improved universal handler
 * 3. Tutorial initialization guard - ensures clean state
 * 4. Mobile debug overlay - toggleable for diagnostics
 * 5. Proper async/await flow for game initialization
 * 6. Service worker cache busting via versioning
 */

(function() {
    'use strict';

    // ========================================================================
    // MOBILE DEBUG INSTRUMENTATION
    // Toggle via: localStorage.setItem('POLYGON_DEBUG', 'true'); location.reload();
    // ========================================================================
    const DEBUG_MODE = localStorage.getItem('POLYGON_DEBUG') === 'true';
    
    const MobileDebug = {
        overlay: null,
        log: [],
        maxLogs: 20,
        startTime: Date.now(),

        init() {
            // Create debug overlay (always, but hidden by default)
            const overlay = document.createElement('div');
            overlay.id = 'mobileDebugOverlay';
            overlay.style.cssText = `
                position: fixed;
                bottom: 10px;
                left: 10px;
                right: 10px;
                max-height: 250px;
                background: rgba(0, 0, 0, 0.92);
                color: #00ff00;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 11px;
                padding: 10px;
                border-radius: 10px;
                z-index: 999999;
                overflow-y: auto;
                pointer-events: auto;
                border: 2px solid #00ff00;
                display: ${DEBUG_MODE ? 'block' : 'none'};
                -webkit-overflow-scrolling: touch;
            `;
            overlay.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;border-bottom:1px solid #00ff00;padding-bottom:6px;">
                    <span style="font-weight:bold;">🔧 POLYGON DEBUG CONSOLE</span>
                    <button id="debugClearBtn" style="background:#333;color:#0f0;border:1px solid #0f0;padding:2px 8px;cursor:pointer;font-size:10px;">Clear</button>
                </div>
                <div id="mobileDebugLog"></div>
            `;
            document.body.appendChild(overlay);
            this.overlay = overlay;
            
            // Clear button
            const clearBtn = document.getElementById('debugClearBtn');
            if (clearBtn) {
                clearBtn.onclick = () => {
                    this.log = [];
                    this.render();
                };
            }
            
            // Add keyboard shortcut to toggle (Ctrl+Shift+D)
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                    this.toggle();
                }
            });
            
            // Triple-tap to toggle on mobile
            let tapCount = 0;
            let lastTap = 0;
            document.addEventListener('touchend', () => {
                const now = Date.now();
                if (now - lastTap < 300) {
                    tapCount++;
                    if (tapCount >= 3) {
                        this.toggle();
                        tapCount = 0;
                    }
                } else {
                    tapCount = 1;
                }
                lastTap = now;
            }, { passive: true });
        },
        
        toggle() {
            if (this.overlay) {
                const isVisible = this.overlay.style.display !== 'none';
                this.overlay.style.display = isVisible ? 'none' : 'block';
                localStorage.setItem('POLYGON_DEBUG', isVisible ? 'false' : 'true');
            }
        },

        add(msg, type = 'info') {
            const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
            const colors = { 
                info: '#00ff00', 
                warn: '#ffff00', 
                error: '#ff4444', 
                event: '#00ffff',
                success: '#44ff44'
            };
            const icons = {
                info: 'ℹ️',
                warn: '⚠️',
                error: '❌',
                event: '👆',
                success: '✅'
            };
            const entry = { 
                elapsed, 
                msg, 
                type, 
                color: colors[type] || colors.info,
                icon: icons[type] || icons.info
            };
            
            this.log.push(entry);
            if (this.log.length > this.maxLogs) this.log.shift();
            
            // Always log to console
            const consoleMethod = type === 'error' ? 'error' : type === 'warn' ? 'warn' : 'log';
            console[consoleMethod](`[MenuFix +${elapsed}s] ${msg}`);
            
            this.render();
        },
        
        render() {
            if (!this.overlay) return;
            const logDiv = document.getElementById('mobileDebugLog');
            if (logDiv) {
                logDiv.innerHTML = this.log.map(e => 
                    `<div style="color:${e.color};margin:2px 0;word-break:break-word;">${e.icon} [+${e.elapsed}s] ${e.msg}</div>`
                ).join('');
                logDiv.scrollTop = logDiv.scrollHeight;
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
            this.add(`Panel #${panelId}: display=${styles.display}, visible=${styles.visibility}, z=${styles.zIndex}`, 'info');
        },
        
        logGlobalState() {
            this.add(`Globals: window.game=${!!window.game}, window.tutorial=${!!window.tutorial}, window.app=${!!window.app}`, 'info');
            if (window.game) {
                this.add(`Game state: ${window.game.state}, currentMode=${!!window.game.currentMode}`, 'info');
            }
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
            MobileDebug.add(`Hidden: #${id}`, 'info');
        }
    };

    const stopMusic = () => {
        if (window.stopBackgroundMusic) {
            try {
                window.stopBackgroundMusic();
                MobileDebug.add('Music stopped', 'info');
            } catch (e) {
                MobileDebug.add(`Music stop error: ${e.message}`, 'warn');
            }
        }
    };

    /**
     * Transition overlay with Promise-based completion
     * Returns a Promise that resolves when the overlay animation is done
     */
    const runTransitionOverlay = () => {
        return new Promise((resolve) => {
            const overlay = document.getElementById('funTransitionOverlay');
            if (!overlay) {
                MobileDebug.add('No transition overlay, resolving immediately', 'warn');
                resolve();
                return;
            }

            MobileDebug.add('Starting transition overlay', 'event');
            overlay.classList.remove('exit');
            overlay.classList.add('active');
            overlay.setAttribute('aria-hidden', 'false');

            // Use requestAnimationFrame for more reliable timing on mobile
            const startTime = Date.now();
            const checkAndResolve = () => {
                const elapsed = Date.now() - startTime;
                if (elapsed >= 450) {
                    MobileDebug.add('Transition overlay complete, resolving', 'success');
                    overlay.classList.add('exit');
                    
                    setTimeout(() => {
                        overlay.classList.remove('active', 'exit');
                        overlay.setAttribute('aria-hidden', 'true');
                    }, 850);
                    
                    resolve();
                } else {
                    requestAnimationFrame(checkAndResolve);
                }
            };
            requestAnimationFrame(checkAndResolve);
        });
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

        runTransitionOverlay().then(() => {
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
     */
    const openFunPanel = () => {
        MobileDebug.add('openFunPanel() called', 'event');
        
        if (!funOverlay) {
            funOverlay = document.getElementById('funGameStartOverlay');
        }
        
        if (!funOverlay) {
            MobileDebug.add('CRITICAL: funGameStartOverlay not found!', 'error');
            return;
        }
        
        hideMainMenuOverlay();
        updateFunPanelMeta();
        renderFunSlots();
        
        funOverlay.style.display = 'flex';
        funOverlay.style.visibility = 'visible';
        funOverlay.style.opacity = '1';
        funOverlay.setAttribute('aria-hidden', 'false');
        
        MobileDebug.add('Fun panel opened', 'success');
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
     * Universal click handler that works reliably on all platforms
     * Uses pointer events as primary, with touch/click fallback
     */
    const addUniversalClickHandler = (element, handler, options = {}) => {
        if (!element) return;
        
        let lastEventTime = 0;
        const DEBOUNCE_MS = 300;
        
        const wrappedHandler = (event) => {
            const now = Date.now();
            if (now - lastEventTime < DEBOUNCE_MS) {
                MobileDebug.add(`Event debounced on ${element.id || element.className}`, 'info');
                return;
            }
            lastEventTime = now;
            
            MobileDebug.add(`Handler fired: ${event.type} on ${element.id || element.className}`, 'event');
            
            try {
                handler(event);
            } catch (e) {
                MobileDebug.add(`Handler error: ${e.message}`, 'error');
                console.error('Handler error:', e);
            }
        };
        
        // Use pointerup as primary (works on both touch and mouse)
        if ('PointerEvent' in window) {
            element.addEventListener('pointerup', (event) => {
                // Only handle primary button/touch
                if (event.button !== 0 && event.pointerType === 'mouse') return;
                wrappedHandler(event);
            }, { passive: true });
        } else {
            // Fallback for older browsers
            element.addEventListener('touchend', (event) => {
                if (event.changedTouches.length !== 1) return;
                
                const touch = event.changedTouches[0];
                const rect = element.getBoundingClientRect();
                if (touch.clientX < rect.left || touch.clientX > rect.right ||
                    touch.clientY < rect.top || touch.clientY > rect.bottom) {
                    return;
                }
                
                wrappedHandler(event);
            }, { passive: true });
            
            element.addEventListener('click', wrappedHandler);
        }
    };

    // ========================================================================
    // ROBUST TUTORIAL INITIALIZATION
    // ========================================================================
    
    /**
     * Ensures the tutorial is properly shown with comprehensive error handling
     * This is the CRITICAL fix for mobile tutorial issues
     */
    const showTutorialSafely = async () => {
        MobileDebug.add('showTutorialSafely() starting...', 'event');
        MobileDebug.logGlobalState();
        
        // Step 1: Wait for tutorial to be defined
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (!window.tutorial && attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        
        if (!window.tutorial) {
            MobileDebug.add('Tutorial object never became available!', 'error');
            return false;
        }
        
        MobileDebug.add(`Tutorial found after ${attempts * 100}ms`, 'success');
        
        // Step 2: Clean up any existing tutorial overlay (prevents guard condition failure)
        const existingOverlay = document.getElementById('tutorialOverlay');
        if (existingOverlay) {
            MobileDebug.add('Removing existing tutorial overlay for clean init', 'warn');
            existingOverlay.remove();
            window.tutorial.overlay = null;
            window.tutorial.initialized = false;
        }
        
        // Step 3: Ensure game is in the right state
        if (!window.game || window.game.state !== 'playing') {
            MobileDebug.add('Game not in playing state, waiting...', 'warn');
            await new Promise(r => setTimeout(r, 200));
        }
        
        // Step 4: Actually show the tutorial
        try {
            MobileDebug.add('Calling tutorial.show()...', 'event');
            window.tutorial.show();
            
            // Step 5: Verify it worked
            await new Promise(r => setTimeout(r, 100));
            const tutOverlay = document.getElementById('tutorialOverlay');
            if (tutOverlay) {
                const styles = window.getComputedStyle(tutOverlay);
                MobileDebug.add(`Tutorial overlay: display=${styles.display}, z=${styles.zIndex}`, 'success');
                
                // Force visibility on mobile
                tutOverlay.style.display = 'flex';
                tutOverlay.style.visibility = 'visible';
                tutOverlay.style.opacity = '1';
                
                return true;
            } else {
                MobileDebug.add('Tutorial overlay not found after show()!', 'error');
                return false;
            }
        } catch (e) {
            MobileDebug.add(`Tutorial.show() error: ${e.message}`, 'error');
            console.error('Tutorial show error:', e);
            return false;
        }
    };
    
    /**
     * Starts a new game with proper sequencing for mobile
     */
    const startNewGame = async (status) => {
        MobileDebug.add('startNewGame() called', 'event');
        
        // Clear save data and tutorial_seen flag
        localStorage.setItem('polygonFunActiveSlot', `${status.activeSlot}`);
        localStorage.removeItem(`polygonFunSaveSlot${status.activeSlot}`);
        localStorage.removeItem(`polygonFunStarsSlot${status.activeSlot}`);
        localStorage.removeItem('tutorial_seen');
        
        MobileDebug.add('Cleared save data, closing panel', 'info');
        closeFunPanel();
        
        // Wait for transition overlay
        MobileDebug.add('Waiting for transition overlay...', 'info');
        await runTransitionOverlay();
        
        // Hide all overlays
        MobileDebug.add('Hiding overlays...', 'info');
        hideElement('mainMenuOverlay');
        hideElement('learnPage');
        hideElement('gameTutorialPage');
        
        // Double-ensure learnPage is hidden
        const learnPageEl = document.getElementById('learnPage');
        if (learnPageEl) {
            learnPageEl.style.display = 'none';
            learnPageEl.classList.remove('active');
        }
        
        // Check for game instance
        if (!window.game) {
            MobileDebug.add('CRITICAL: window.game is undefined!', 'error');
            
            // Wait and retry
            await new Promise(r => setTimeout(r, 500));
            if (!window.game) {
                MobileDebug.add('Game still not available after wait', 'error');
                alert('Game is still loading. Please try again in a moment.');
                return;
            }
        }
        
        // Start beginner mode
        MobileDebug.add('Starting beginner mode...', 'info');
        window.game.startMode('beginner');
        
        // Wait for mode to initialize
        await new Promise(r => setTimeout(r, 100));
        
        if (window.game.currentMode) {
            MobileDebug.add('Game mode initialized, setting up slot and level', 'success');
            window.game.currentMode.setActiveSaveSlot(status.activeSlot);
            window.game.currentMode.loadLevel(0);
        } else {
            MobileDebug.add('Game mode not initialized!', 'error');
        }
        
        // Wait for game to fully settle
        MobileDebug.add('Waiting for game to settle before showing tutorial...', 'info');
        await new Promise(r => setTimeout(r, 300));
        
        // Show tutorial (THE CRITICAL STEP)
        MobileDebug.add('Attempting to show tutorial...', 'event');
        const tutorialShown = await showTutorialSafely();
        
        if (tutorialShown) {
            MobileDebug.add('✓ Tutorial successfully shown!', 'success');
        } else {
            MobileDebug.add('✗ Tutorial failed to show', 'error');
        }
    };

    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    const initMenuFix = () => {
        MobileDebug.add('Menu Fix V6 initializing...', 'info');
        MobileDebug.add(`User Agent: ${navigator.userAgent.substring(0, 60)}...`, 'info');
        MobileDebug.add(`Touch: ${'ontouchstart' in window}, Pointer: ${'PointerEvent' in window}`, 'info');

        // Cache DOM references
        funOverlay = document.getElementById('funGameStartOverlay');
        mainMenuOverlay = document.getElementById('mainMenuOverlay');
        funMeta = document.getElementById('funGameStartMeta');
        funSlots = document.getElementById('funGameStartSlots');
        
        MobileDebug.add(`DOM: funOverlay=${!!funOverlay}, mainMenu=${!!mainMenuOverlay}`, 'info');
        MobileDebug.logGlobalState();

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
            MobileDebug.add('Found btnFunMode, attaching handler', 'info');
            
            const newFunBtn = funBtn.cloneNode(true);
            funBtn.parentNode.replaceChild(newFunBtn, funBtn);

            addUniversalClickHandler(newFunBtn, () => {
                MobileDebug.add('Fun Mode button pressed', 'event');
                stopMusic();
                hideElement('learnPage');
                hideElement('gameTutorialPage');
                openFunPanel();
            });
            
            MobileDebug.add('btnFunMode handler attached', 'success');
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
        // 5. FIX "New Game" Button - THE MAIN FIX
        // ====================================================================
        const funNewBtn = document.getElementById('funGameStartNew');
        if (funNewBtn) {
            MobileDebug.add('Found funGameStartNew, attaching handler', 'info');
            
            const newBtn = funNewBtn.cloneNode(true);
            funNewBtn.parentNode.replaceChild(newBtn, funNewBtn);
            
            addUniversalClickHandler(newBtn, async () => {
                MobileDebug.add('New Game button pressed', 'event');
                
                const status = getFunSaveStatus();
                
                // Confirm overwrite if save exists
                if (status.activeHasSave) {
                    let confirmNew = false;
                    if (window.appConfirm) {
                        try {
                            confirmNew = await window.appConfirm(
                                `Start a new game in Slot ${status.activeSlot}? This will overwrite the current save.`,
                                {
                                    title: 'Overwrite Save?',
                                    confirmText: 'Yes, Overwrite',
                                    cancelText: 'Cancel'
                                }
                            );
                        } catch (e) {
                            MobileDebug.add(`Confirm dialog error: ${e.message}`, 'error');
                            confirmNew = confirm(`Start a new game in Slot ${status.activeSlot}? This will overwrite the current save.`);
                        }
                    } else {
                        confirmNew = confirm(`Start a new game in Slot ${status.activeSlot}? This will overwrite the current save.`);
                    }

                    if (!confirmNew) {
                        MobileDebug.add('User cancelled new game', 'info');
                        return;
                    }
                }
                
                // Start the new game with proper async flow
                await startNewGame(status);
            });
            
            MobileDebug.add('funGameStartNew handler attached', 'success');
        } else {
            MobileDebug.add('funGameStartNew not found', 'error');
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

        MobileDebug.add('Menu Fix V6 initialization complete!', 'success');
    };

    // ========================================================================
    // ROBUST DOM READY HANDLING
    // ========================================================================
    const onDOMReady = (callback) => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            // Use setTimeout(0) to ensure we're in a clean call stack
            setTimeout(callback, 0);
        }
    };

    // Start initialization
    onDOMReady(() => {
        MobileDebug.init();
        initMenuFix();
    });

    // Export for external use and debugging
    window.openFunGamePanel = openFunPanel;
    window.MobileDebug = MobileDebug;
    window.showTutorialSafely = showTutorialSafely;

})();
