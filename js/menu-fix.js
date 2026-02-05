/**
 * Menu Controller - Polygon Fun Game
 * 
 * Handles main menu interactions and game panel flow.
 */

(function() {
    'use strict';

    // ========================================================================
    // DEBUG SYSTEM
    // ========================================================================
    const DEBUG_MODE = localStorage.getItem('POLYGON_DEBUG') === 'true';
    
    const MobileDebug = {
        overlay: null,
        log: [],
        maxLogs: 20,
        startTime: Date.now(),

        init() {
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
                    <span style="font-weight:bold;">POLYGON FUN DEBUG</span>
                    <button id="debugClearBtn" style="background:#333;color:#0f0;border:1px solid #0f0;padding:2px 8px;cursor:pointer;font-size:10px;">Clear</button>
                </div>
                <div id="mobileDebugLog"></div>
            `;
            document.body.appendChild(overlay);
            this.overlay = overlay;
            
            const clearBtn = document.getElementById('debugClearBtn');
            if (clearBtn) {
                clearBtn.onclick = () => {
                    this.log = [];
                    this.render();
                };
            }
            
            // Keyboard shortcut (Ctrl+Shift+D)
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
            const entry = { elapsed, msg, type, color: colors[type] || colors.info };
            
            this.log.push(entry);
            if (this.log.length > this.maxLogs) this.log.shift();
            
            const consoleMethod = type === 'error' ? 'error' : type === 'warn' ? 'warn' : 'log';
            console[consoleMethod](`[PolygonFun +${elapsed}s] ${msg}`);
            
            this.render();
        },
        
        render() {
            if (!this.overlay) return;
            const logDiv = document.getElementById('mobileDebugLog');
            if (logDiv) {
                logDiv.innerHTML = this.log.map(e => 
                    `<div style="color:${e.color};margin:2px 0;word-break:break-word;">[+${e.elapsed}s] ${e.msg}</div>`
                ).join('');
                logDiv.scrollTop = logDiv.scrollHeight;
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
        }
    };

    const stopMusic = () => {
        if (typeof window.stopBackgroundMusic === 'function') {
            try {
                window.stopBackgroundMusic();
            } catch (e) {
                MobileDebug.add(`Music stop error: ${e.message}`, 'warn');
            }
        }
    };

    const runTransitionOverlay = () => {
        return new Promise((resolve) => {
            const overlay = document.getElementById('funTransitionOverlay');
            if (!overlay) {
                resolve();
                return;
            }

            MobileDebug.add('Starting transition', 'event');
            overlay.classList.remove('exit');
            overlay.classList.add('active');
            overlay.setAttribute('aria-hidden', 'false');

            setTimeout(() => {
                overlay.classList.add('exit');
                setTimeout(() => {
                    overlay.classList.remove('active', 'exit');
                    overlay.setAttribute('aria-hidden', 'true');
                }, 850);
                resolve();
            }, 450);
        });
    };

    // ========================================================================
    // SAVE SLOT UTILITIES
    // ========================================================================
    const getActiveFunSlot = (maxSlots = 3) => {
        const stored = parseInt(localStorage.getItem('polygonFunActiveSlot'), 10);
        return (Number.isFinite(stored) && stored >= 1 && stored <= maxSlots) ? stored : 1;
    };

    const getFunSlotData = (slot) => {
        try {
            const key = `polygonFunSaveSlot${slot}`;
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return (parsed && typeof parsed === 'object') ? parsed : null;
        } catch (e) {
            return null;
        }
    };

    const getFunSlotSummary = (slot, slotData) => {
        if (!slotData || !slotData.appState) {
            return `Slot ${slot}: Empty`;
        }
        const levelIndex = Number.isFinite(slotData.levelIndex) ? slotData.levelIndex + 1 : null;
        return `Slot ${slot}: ${levelIndex ? `Level ${levelIndex}` : 'Unknown level'}`;
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
        
        return { activeSlot, activeSlotData, activeHasSave, hasAnySave };
    };

    const formatSlotStatus = (slot, slotData, isActive) => {
        if (!slotData || !slotData.appState) {
            return { label: 'Empty', detail: 'No save data' };
        }
        const levelIndex = Number.isFinite(slotData.levelIndex) ? slotData.levelIndex + 1 : null;
        return {
            label: isActive ? 'Active' : 'Saved',
            detail: levelIndex ? `Level ${levelIndex}` : 'Unknown'
        };
    };

    // ========================================================================
    // GAME PANEL MANAGEMENT
    // ========================================================================
    let funOverlay, mainMenuOverlay, funMeta, funSlots;

    const hideMainMenuOverlay = () => {
        if (!mainMenuOverlay) return;
        mainMenuOverlay.classList.add('hidden');
        // Set pointer-events to none so underlying elements can be clicked
        mainMenuOverlay.style.pointerEvents = 'none';
        MobileDebug.add('Main menu hidden', 'info');
    };

    const showMainMenuOverlay = () => {
        if (!mainMenuOverlay) return;
        mainMenuOverlay.classList.remove('hidden');
        mainMenuOverlay.style.display = 'flex';
        mainMenuOverlay.style.pointerEvents = 'auto';
        MobileDebug.add('Main menu shown', 'info');
    };

    const updateFunPanelMeta = () => {
        if (!funMeta) return;
        const status = getFunSaveStatus();
        funMeta.textContent = status.hasAnySave
            ? getFunSlotSummary(status.activeSlot, status.activeSlotData)
            : 'No saved games. Start a new game!';
    };

    const openFunPanel = () => {
        MobileDebug.add('Opening game panel', 'event');
        
        if (!funOverlay) {
            funOverlay = document.getElementById('funGameStartOverlay');
        }
        
        if (!funOverlay) {
            MobileDebug.add('funGameStartOverlay not found!', 'error');
            return;
        }
        
        hideMainMenuOverlay();
        updateFunPanelMeta();
        renderFunSlots();
        
        // Ensure panel is fully visible and interactive
        funOverlay.style.display = 'flex';
        funOverlay.style.visibility = 'visible';
        funOverlay.style.opacity = '1';
        funOverlay.style.pointerEvents = 'auto';
        funOverlay.setAttribute('aria-hidden', 'false');
        
        // Force a reflow to ensure styles are applied
        funOverlay.offsetHeight;
        
        MobileDebug.add('Panel opened successfully', 'success');
    };

    const closeFunPanel = () => {
        MobileDebug.add('Closing game panel', 'event');
        if (!funOverlay) return;
        funOverlay.style.display = 'none';
        funOverlay.style.pointerEvents = 'none';
        funOverlay.setAttribute('aria-hidden', 'true');
        showMainMenuOverlay();
    };

    const renderFunSlots = () => {
        if (!funSlots) return;
        const maxSlots = 3;
        const status = getFunSaveStatus(maxSlots);
        funSlots.innerHTML = '';

        MobileDebug.add(`Rendering ${maxSlots} save slots`, 'info');

        for (let slot = 1; slot <= maxSlots; slot++) {
            const slotData = getFunSlotData(slot);
            const isActive = slot === status.activeSlot;
            const slotStatus = formatSlotStatus(slot, slotData, isActive);

            const card = document.createElement('div');
            card.className = `fun-game-start-slot${isActive ? ' active' : ''}`;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.dataset.slot = `${slot}`;
            
            // Ensure card is interactive
            card.style.pointerEvents = 'auto';
            
            card.innerHTML = `
                <div class="fun-game-start-slot-header">
                    <span>Slot ${slot}</span>
                    <span class="fun-game-start-slot-status">${slotStatus.label}</span>
                </div>
                <div class="fun-game-start-slot-detail">${slotStatus.detail}</div>
                <button class="fun-game-start-slot-action" ${slotData && slotData.appState ? '' : 'disabled'}>
                    Load
                </button>
            `;

            const handleLoad = () => {
                if (!slotData || !slotData.appState) {
                    MobileDebug.add(`Slot ${slot} is empty, cannot load`, 'warn');
                    return;
                }
                MobileDebug.add(`Loading slot ${slot}`, 'event');
                localStorage.setItem('polygonFunActiveSlot', `${slot}`);
                startFunModeFromSlot(slot, slotData);
            };

            const actionBtn = card.querySelector('.fun-game-start-slot-action');
            if (actionBtn) {
                // Ensure button is interactive
                actionBtn.style.pointerEvents = 'auto';
                addClickHandler(actionBtn, (e) => {
                    e.stopPropagation();
                    handleLoad();
                });
            }

            // Handle card selection
            addClickHandler(card, (e) => {
                // Don't trigger card selection if clicking the action button
                if (e.target.closest('.fun-game-start-slot-action')) return;
                
                MobileDebug.add(`Selecting slot ${slot}`, 'event');
                localStorage.setItem('polygonFunActiveSlot', `${slot}`);
                renderFunSlots();
                updateFunPanelMeta();
            });

            funSlots.appendChild(card);
        }
        
        MobileDebug.add('Slots rendered', 'success');
    };

    const startFunModeFromSlot = (slot, slotData) => {
        closeFunPanel();

        runTransitionOverlay().then(() => {
            hideElement('mainMenuOverlay');

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
                MobileDebug.add('Game not found', 'error');
            }
        });
    };

    // ========================================================================
    // CROSS-PLATFORM EVENT HANDLING
    // ========================================================================
    const addClickHandler = (element, handler) => {
        if (!element) return;
        
        let lastEventTime = 0;
        const DEBOUNCE_MS = 250;
        let isProcessing = false;
        
        const wrappedHandler = (event) => {
            // Prevent double-firing
            if (isProcessing) return;
            
            const now = Date.now();
            if (now - lastEventTime < DEBOUNCE_MS) return;
            lastEventTime = now;
            isProcessing = true;
            
            // Prevent default and stop propagation for touch events
            if (event.type === 'touchend' || event.type === 'pointerup') {
                event.preventDefault();
            }
            event.stopPropagation();
            
            MobileDebug.add(`Click: ${element.id || element.className || 'element'}`, 'event');
            
            try {
                handler(event);
            } catch (e) {
                MobileDebug.add(`Handler error: ${e.message}`, 'error');
                console.error('Handler error:', e);
            }
            
            // Reset processing flag after a short delay
            setTimeout(() => {
                isProcessing = false;
            }, 100);
        };
        
        // Use pointer events for best cross-platform support
        if ('PointerEvent' in window) {
            element.addEventListener('pointerup', wrappedHandler, { passive: false });
        } else {
            // Fallback for older browsers
            element.addEventListener('touchend', wrappedHandler, { passive: false });
            element.addEventListener('click', wrappedHandler);
        }
    };

    // ========================================================================
    // TUTORIAL & NEW GAME
    // ========================================================================
    const showTutorialSafely = async () => {
        MobileDebug.add('Showing tutorial...', 'event');
        
        // Wait for tutorial to be available
        let attempts = 0;
        while (!window.tutorial && attempts < 30) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        
        if (!window.tutorial) {
            MobileDebug.add('Tutorial not available', 'error');
            return false;
        }
        
        // Clean up existing overlay
        const existingOverlay = document.getElementById('tutorialOverlay');
        if (existingOverlay) {
            existingOverlay.remove();
            window.tutorial.overlay = null;
            window.tutorial.initialized = false;
        }
        
        try {
            window.tutorial.show();
            
            await new Promise(r => setTimeout(r, 100));
            const tutOverlay = document.getElementById('tutorialOverlay');
            if (tutOverlay) {
                tutOverlay.style.display = 'flex';
                tutOverlay.style.visibility = 'visible';
                tutOverlay.style.opacity = '1';
                MobileDebug.add('Tutorial shown', 'success');
                return true;
            }
            return false;
        } catch (e) {
            MobileDebug.add(`Tutorial error: ${e.message}`, 'error');
            return false;
        }
    };
    
    const startNewGame = async (status) => {
        MobileDebug.add('Starting new game...', 'event');
        
        try {
            // Clear save data
            localStorage.setItem('polygonFunActiveSlot', `${status.activeSlot}`);
            localStorage.removeItem(`polygonFunSaveSlot${status.activeSlot}`);
            localStorage.removeItem(`polygonFunStarsSlot${status.activeSlot}`);
            localStorage.removeItem('tutorial_seen');
            
            closeFunPanel();
            await runTransitionOverlay();
            hideElement('mainMenuOverlay');
            
            // Wait for game to be available
            if (!window.game) {
                MobileDebug.add('Waiting for game...', 'warn');
                await new Promise(r => setTimeout(r, 500));
                
                if (!window.game) {
                    MobileDebug.add('Game not available', 'error');
                    alert('Game is still loading. Please try again.');
                    showMainMenuOverlay();
                    return;
                }
            }
            
            MobileDebug.add('Starting beginner mode', 'info');
            window.game.startMode('beginner');
            
            await new Promise(r => setTimeout(r, 100));
            
            if (window.game.currentMode) {
                window.game.currentMode.setActiveSaveSlot(status.activeSlot);
                window.game.currentMode.loadLevel(0);
                MobileDebug.add('Level loaded', 'success');
            }
            
            await new Promise(r => setTimeout(r, 300));
            await showTutorialSafely();
            
        } catch (e) {
            MobileDebug.add(`startNewGame error: ${e.message}`, 'error');
            console.error('startNewGame error:', e);
            showMainMenuOverlay();
        }
    };

    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    const initMenuFix = () => {
        MobileDebug.add('Initializing menu system...', 'info');
        MobileDebug.add(`Touch: ${'ontouchstart' in window}, Pointer: ${'PointerEvent' in window}`, 'info');
        MobileDebug.add(`User Agent: ${navigator.userAgent.substring(0, 50)}...`, 'info');

        funOverlay = document.getElementById('funGameStartOverlay');
        mainMenuOverlay = document.getElementById('mainMenuOverlay');
        funMeta = document.getElementById('funGameStartMeta');
        funSlots = document.getElementById('funGameStartSlots');

        // Log element status
        MobileDebug.add(`funOverlay: ${funOverlay ? 'found' : 'NOT FOUND'}`, funOverlay ? 'info' : 'error');
        MobileDebug.add(`mainMenuOverlay: ${mainMenuOverlay ? 'found' : 'NOT FOUND'}`, mainMenuOverlay ? 'info' : 'error');

        // Play Game button (main menu)
        const funBtn = document.getElementById('btnFunMode');
        if (funBtn) {
            addClickHandler(funBtn, () => {
                MobileDebug.add('Play Game pressed', 'event');
                stopMusic();
                openFunPanel();
            });
            MobileDebug.add('btnFunMode attached', 'success');
        } else {
            MobileDebug.add('btnFunMode not found!', 'error');
        }

        // Close panel button
        const funCloseBtn = document.getElementById('funGameStartClose');
        if (funCloseBtn) {
            addClickHandler(funCloseBtn, () => {
                MobileDebug.add('Close button pressed', 'event');
                closeFunPanel();
            });
            MobileDebug.add('funGameStartClose attached', 'success');
        }

        // Panel backdrop click
        if (funOverlay) {
            addClickHandler(funOverlay, (event) => {
                // Only close if clicking the overlay background, not the panel
                if (event.target === funOverlay) {
                    MobileDebug.add('Backdrop clicked', 'event');
                    closeFunPanel();
                }
            });
        }

        // New Game button
        const funNewBtn = document.getElementById('funGameStartNew');
        if (funNewBtn) {
            addClickHandler(funNewBtn, async () => {
                MobileDebug.add('New Game pressed', 'event');
                
                try {
                    const status = getFunSaveStatus();
                    
                    // If there's an existing save, ask for confirmation
                    if (status.activeHasSave) {
                        MobileDebug.add('Has existing save, asking confirmation', 'info');
                        
                        let confirmNew = false;
                        
                        if (typeof window.appConfirm === 'function') {
                            try {
                                confirmNew = await window.appConfirm(
                                    `Start new game in Slot ${status.activeSlot}? This will overwrite existing save.`,
                                    { title: 'New Game', confirmText: 'Start New', cancelText: 'Cancel' }
                                );
                            } catch (e) {
                                MobileDebug.add(`appConfirm error: ${e.message}`, 'warn');
                                confirmNew = confirm('Start new game? This will overwrite existing save.');
                            }
                        } else {
                            confirmNew = confirm('Start new game? This will overwrite existing save.');
                        }

                        if (!confirmNew) {
                            MobileDebug.add('User cancelled new game', 'info');
                            return;
                        }
                    }
                    
                    await startNewGame(status);
                    
                } catch (e) {
                    MobileDebug.add(`New Game error: ${e.message}`, 'error');
                    console.error('New Game error:', e);
                }
            });
            MobileDebug.add('funGameStartNew attached', 'success');
        } else {
            MobileDebug.add('funGameStartNew not found!', 'error');
        }

        // Initial render
        if (funSlots) {
            renderFunSlots();
        }

        // Ensure all interactive elements have proper pointer-events
        const interactiveElements = document.querySelectorAll('.fun-game-start-panel button, .fun-game-start-slot, .fun-game-start-slot-action');
        interactiveElements.forEach(el => {
            el.style.pointerEvents = 'auto';
        });

        MobileDebug.add('Initialization complete', 'success');
    };

    // ========================================================================
    // DOM READY
    // ========================================================================
    const onDOMReady = (callback) => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            setTimeout(callback, 0);
        }
    };

    onDOMReady(() => {
        MobileDebug.init();
        initMenuFix();
    });

    // Exports
    window.openFunGamePanel = openFunPanel;
    window.MobileDebug = MobileDebug;

})();
