document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Menu Fixes V4...');
    window.MenuFixActive = true;
    const storage = window.SafeStorage || localStorage;

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
            console.warn('stopBackgroundMusic not found, music might continue.');
        }
    };

    const showTutorial = () => {
        if (window.tutorial) {
            window.tutorial.show();
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

    const getActiveFunSlot = (maxSlots = 3) => {
        const stored = parseInt(storage.getItem('polygonFunActiveSlot'), 10);
        if (!Number.isFinite(stored) || stored < 1 || stored > maxSlots) {
            return 1;
        }
        return stored;
    };

    const getFunSlotData = (slot) => {
        const key = `polygonFunSaveSlot${slot}`;
        const raw = storage.getItem(key);
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (error) {
            console.warn('Failed to parse fun game slot data', error);
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

    const funOverlay = document.getElementById('funGameStartOverlay');
    const mainMenuOverlay = document.getElementById('mainMenuOverlay');
    const funCloseBtn = document.getElementById('funGameStartClose');
    const funNewBtn = document.getElementById('funGameStartNew');
    const funSlots = document.getElementById('funGameStartSlots');
    const funMeta = document.getElementById('funGameStartMeta');

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

    const startFunModeFromSlot = (slot, slotData) => {
        closeFunPanel({ showMenu: false });

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
                console.error('Game instance not found');
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
                storage.setItem('polygonFunActiveSlot', `${slot}`);
                startFunModeFromSlot(slot, slotData);
            };

            const actionBtn = card.querySelector('.fun-game-start-slot-action');
            if (actionBtn) {
                actionBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    handleLoad();
                });
            }

            card.addEventListener('click', () => {
                storage.setItem('polygonFunActiveSlot', `${slot}`);
                renderFunSlots();
                updateFunPanelMeta();
            });

            card.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    storage.setItem('polygonFunActiveSlot', `${slot}`);
                    renderFunSlots();
                    updateFunPanelMeta();
                }
            });

            funSlots.appendChild(card);
        }
    };

    const openFunPanel = () => {
        if (!funOverlay) return;
        hideMainMenuOverlay();
        updateFunPanelMeta();
        renderFunSlots();
        funOverlay.style.display = 'flex';
        funOverlay.setAttribute('aria-hidden', 'false');
    };

    const closeFunPanel = ({ showMenu = true } = {}) => {
        if (!funOverlay) return;
        funOverlay.style.display = 'none';
        funOverlay.setAttribute('aria-hidden', 'true');
        if (showMenu) {
            showMainMenuOverlay();
        } else {
            hideMainMenuOverlay();
        }
    };

    const ensureDefaultTriangle = () => {
        if (window.app) {
            // Only create if empty
            if (window.app.polygons.length === 0) {
                console.log('Creating default triangle for sandbox mode...');
                const triangleOption = document.querySelector('[data-shape="triangle"]');
                if (triangleOption) {
                    window.app.selectShape(triangleOption);
                }
            }
        }
    };

    // 1. Fix "Learn Polygon Playground" (Main Menu)
    // ACTION: Go to SANDBOX/GRID (Canvas), stop game mode, ensure triangle exists.
    const learnBtn = document.getElementById('btnLearnMode');
    if (learnBtn) {
        const newBtn = learnBtn.cloneNode(true);
        learnBtn.parentNode.replaceChild(newBtn, learnBtn);

        newBtn.addEventListener('click', () => {
            console.log('Learn Mode (Sandbox) Clicked');
            stopMusic();
            hideElement('mainMenuOverlay');
            hideElement('learnPage');         // Ensure definitions page is hidden
            hideElement('gameTutorialPage');  // Ensure coming soon is hidden

            // Ensure Game Mode is STOPPED (restores Sidebar/Toolbar)
            if (window.game) {
                window.game.stop();
            }

            // Create default triangle if needed
            setTimeout(ensureDefaultTriangle, 100);
        });
    }

    // 2. Fix "Polygon Fun Game" (Main Menu)
    // ACTION: Start Game, Show Tutorial
    const funBtn = document.getElementById('btnFunMode');
    if (funBtn) {
        const newFunBtn = funBtn.cloneNode(true);
        funBtn.parentNode.replaceChild(newFunBtn, funBtn);

        newFunBtn.addEventListener('click', () => {
            console.log('Fun Mode Clicked');
            stopMusic();
            hideElement('learnPage');
            hideElement('gameTutorialPage');
            openFunPanel();
        });
    }

    if (funCloseBtn && funOverlay) {
        const newCloseBtn = funCloseBtn.cloneNode(true);
        funCloseBtn.parentNode.replaceChild(newCloseBtn, funCloseBtn);
        newCloseBtn.addEventListener('click', () => {
            closeFunPanel();
        });
    }

    if (funOverlay) {
        funOverlay.addEventListener('click', (event) => {
            if (event.target === funOverlay) {
                closeFunPanel();
            }
        });
    }

    if (funNewBtn) {
        const newBtn = funNewBtn.cloneNode(true);
        funNewBtn.parentNode.replaceChild(newBtn, funNewBtn);
        newBtn.addEventListener('click', async () => {
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
            storage.setItem('polygonFunActiveSlot', `${status.activeSlot}`);
            storage.removeItem(`polygonFunSaveSlot${status.activeSlot}`);
            storage.removeItem(`polygonFunStarsSlot${status.activeSlot}`);
            closeFunPanel({ showMenu: false });

            runTransitionOverlay(() => {
                hideElement('mainMenuOverlay');
                hideElement('learnPage');
                hideElement('gameTutorialPage');

                if (window.game) {
                    window.game.startMode('beginner');
                    if (window.game.currentMode) {
                        window.game.currentMode.setActiveSaveSlot(status.activeSlot);
                        window.game.currentMode.loadLevel(0);
                    }

                    if (window.tutorial) {
                        setTimeout(() => {
                            window.tutorial.show();
                        }, 100);
                    }
                } else {
                    console.error('Game instance not found');
                }
            });
        });
    }

    if (funSlots) {
        renderFunSlots();
    }

    // 3. Fix Top Bar "Learn Polygons" Button
    // ACTION: Open Definitions Page (#learnPage)
    const topLearnBtn = document.getElementById('openLearnPageBtn');
    if (topLearnBtn) {
        const newTopBtn = topLearnBtn.cloneNode(true);
        topLearnBtn.parentNode.replaceChild(newTopBtn, topLearnBtn);

        newTopBtn.addEventListener('click', () => {
            const learnPage = document.getElementById('learnPage');
            if (learnPage) {
                learnPage.style.display = 'flex';
                learnPage.classList.add('active');
                // Ensure body scroll is handled if defined in CSS
                document.body.style.overflow = 'hidden';
            }
        });
    }

    // 4. Fix Close Button on Learn Page
    const closeLearnBtn = document.getElementById('closeLearnPageBtn');
    if (closeLearnBtn) {
        const newCloseBtn = closeLearnBtn.cloneNode(true);
        closeLearnBtn.parentNode.replaceChild(newCloseBtn, closeLearnBtn);

        newCloseBtn.addEventListener('click', () => {
            hideElement('learnPage');
            document.body.style.overflow = '';
        });
    }
});
