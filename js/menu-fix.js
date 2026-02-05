/**
 * Menu Controller - Polygon Fun Game
 * 
 * Handles main menu interactions and game panel flow.
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
            const icons = {
                info: 'i',
                warn: '!',
                error: 'X',
                event: '>',
                success: '+'
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
            
            const consoleMethod = type === 'error' ? 'error' : type === 'warn' ? 'warn' : 'log';
            console[consoleMethod](`[PolygonFun +${elapsed}s] ${msg}`);
            
            this.render();
        },
        
        render() {
            if (!this.overlay) return;
            const logDiv = document.getElementById('mobileDebugLog');
            if (logDiv) {
                logDiv.innerHTML = this.log.map(e => 
                    `<div style="color:${e.color};margin:2px 0;word-break:break-word;">[${e.icon}] +${e.elapsed}s ${e.msg}</div>`
                ).join('');
                logDiv.scrollTop = logDiv.scrollHeight;
            }
        },

        logGlobalState() {
            this.add(`Globals: game=${!!window.game}, tutorial=${!!window.tutorial}, app=${!!window.app}`, 'info');
            if (window.game) {
                this.add(`Game: state=${window.game.state}, mode=${!!window.game.currentMode}`, 'info');
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
        if (window.stopBackgroundMusic) {
            try {
                window.stopBackgroundMusic();
            } catch (e) {
                MobileDebug.add(`Music stop error: ${e.message}`, 'warn');
            }
        }
    };

    /**
     * Transition overlay with Promise-based completion
     */
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

            const startTime = Date.now();
            const checkAndResolve = () => {
                const elapsed = Date.now() - startTime;
                if (elapsed >= 450) {
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
            return null;
        }
    };

    const getFunSlotSummary = (slot, slotData) => {
        if (!slotData || !slotData.appState) {
            return `Slot ${slot}: Empty`;
        }
        const levelIndex = Number.isFinite(slotData.levelIndex) ? slotData.levelIndex + 1 : null;
        const levelText = levelIndex ? `Level ${levelIndex}` : 'Unknown level';
        return `Slot ${slot}: ${levelText}`;
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
        const levelText = levelIndex ? `Level ${levelIndex}` : 'Unknown';
        return {
            label: isActive ? 'Active' : 'Saved',
            detail: levelText
        };
    };

    // ========================================================================
    // GAME PANEL MANAGEMENT
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
            : 'No saved games. Start a new game!';
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
                    Load
                </button>
            `;

            const handleLoad = () => {
                if (!slotData || !slotData.appState) return;
                localStorage.setItem('polygonFunActiveSlot', `${slot}`);
                startFunModeFromSlot(slot, slotData);
            };

            const actionBtn = card.querySelector('.fun-game-start-slot-action');
            if (actionBtn) {
                addUniversalClickHandler(actionBtn, (e) => {
                    e.stopPropagation();
                    handleLoad();
                });
            }

            addUniversalClickHandler(card, () => {
                localStorage.setItem('polygonFunActiveSlot', `${slot}`);
                renderFunSlots();
                updateFunPanelMeta();
            });

            funSlots.appendChild(card);
        }
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
        
        funOverlay.style.display = 'flex';
        funOverlay.style.visibility = 'visible';
        funOverlay.style.opacity = '1';
        funOverlay.setAttribute('aria-hidden', 'false');
        
        MobileDebug.add('Panel opened', 'success');
    };

    const closeFunPanel = () => {
        if (!funOverlay) return;
        funOverlay.style.display = 'none';
        funOverlay.setAttribute('aria-hidden', 'true');
        showMainMenuOverlay();
    };

    // ========================================================================
    // CROSS-PLATFORM EVENT HANDLING
    // ========================================================================
    const addUniversalClickHandler = (element, handler) => {
        if (!element) return;
        
        let lastEventTime = 0;
        const DEBOUNCE_MS = 300;
        
        const wrappedHandler = (event) => {
            const now = Date.now();
            if (now - lastEventTime < DEBOUNCE_MS) return;
            lastEventTime = now;
            
            try {
                handler(event);
            } catch (e) {
                MobileDebug.add(`Handler error: ${e.message}`, 'error');
            }
        };
        
        if ('PointerEvent' in window) {
            element.addEventListener('pointerup', (event) => {
                if (event.button !== 0 && event.pointerType === 'mouse') return;
                wrappedHandler(event);
            }, { passive: true });
        } else {
            element.addEventListener('touchend', (event) => {
                if (event.changedTouches.length !== 1) return;
                wrappedHandler(event);
            }, { passive: true });
            element.addEventListener('click', wrappedHandler);
        }
    };

    // ========================================================================
    // TUTORIAL INITIALIZATION
    // ========================================================================
    const showTutorialSafely = async () => {
        MobileDebug.add('Showing tutorial...', 'event');
        
        let attempts = 0;
        while (!window.tutorial && attempts < 50) {
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
                MobileDebug.add('Tutorial shown successfully', 'success');
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
        
        // Clear save data
        localStorage.setItem('polygonFunActiveSlot', `${status.activeSlot}`);
        localStorage.removeItem(`polygonFunSaveSlot${status.activeSlot}`);
        localStorage.removeItem(`polygonFunStarsSlot${status.activeSlot}`);
        localStorage.removeItem('tutorial_seen');
        
        closeFunPanel();
        await runTransitionOverlay();
        hideElement('mainMenuOverlay');
        
        if (!window.game) {
            MobileDebug.add('Waiting for game...', 'warn');
            await new Promise(r => setTimeout(r, 500));
            if (!window.game) {
                MobileDebug.add('Game not available', 'error');
                alert('Game is loading. Please try again.');
                return;
            }
        }
        
        MobileDebug.add('Starting beginner mode', 'info');
        window.game.startMode('beginner');
        
        await new Promise(r => setTimeout(r, 100));
        
        if (window.game.currentMode) {
            window.game.currentMode.setActiveSaveSlot(status.activeSlot);
            window.game.currentMode.loadLevel(0);
        }
        
        await new Promise(r => setTimeout(r, 300));
        await showTutorialSafely();
    };

    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    const initMenuFix = () => {
        MobileDebug.add('Initializing...', 'info');
        MobileDebug.add(`Touch: ${'ontouchstart' in window}, Pointer: ${'PointerEvent' in window}`, 'info');

        funOverlay = document.getElementById('funGameStartOverlay');
        mainMenuOverlay = document.getElementById('mainMenuOverlay');
        funMeta = document.getElementById('funGameStartMeta');
        funSlots = document.getElementById('funGameStartSlots');

        // Play Game button (main menu)
        const funBtn = document.getElementById('btnFunMode');
        if (funBtn) {
            const newFunBtn = funBtn.cloneNode(true);
            funBtn.parentNode.replaceChild(newFunBtn, funBtn);

            addUniversalClickHandler(newFunBtn, () => {
                MobileDebug.add('Play Game pressed', 'event');
                stopMusic();
                openFunPanel();
            });
            
            MobileDebug.add('btnFunMode attached', 'success');
        }

        // Close panel button
        const funCloseBtn = document.getElementById('funGameStartClose');
        if (funCloseBtn && funOverlay) {
            const newCloseBtn = funCloseBtn.cloneNode(true);
            funCloseBtn.parentNode.replaceChild(newCloseBtn, funCloseBtn);
            
            addUniversalClickHandler(newCloseBtn, closeFunPanel);
        }

        // Panel backdrop click
        if (funOverlay) {
            addUniversalClickHandler(funOverlay, (event) => {
                if (event.target === funOverlay) {
                    closeFunPanel();
                }
            });
        }

        // New Game button
        const funNewBtn = document.getElementById('funGameStartNew');
        if (funNewBtn) {
            const newBtn = funNewBtn.cloneNode(true);
            funNewBtn.parentNode.replaceChild(newBtn, funNewBtn);
            
            addUniversalClickHandler(newBtn, async () => {
                MobileDebug.add('New Game pressed', 'event');
                
                const status = getFunSaveStatus();
                
                if (status.activeHasSave) {
                    let confirmNew = false;
                    if (window.appConfirm) {
                        try {
                            confirmNew = await window.appConfirm(
                                `Start new game in Slot ${status.activeSlot}? This will overwrite existing save.`,
                                { title: 'New Game', confirmText: 'Start New', cancelText: 'Cancel' }
                            );
                        } catch (e) {
                            confirmNew = confirm(`Start new game? This will overwrite existing save.`);
                        }
                    } else {
                        confirmNew = confirm(`Start new game? This will overwrite existing save.`);
                    }

                    if (!confirmNew) return;
                }
                
                await startNewGame(status);
            });
        }

        // Initial render
        if (funSlots) {
            renderFunSlots();
        }

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
