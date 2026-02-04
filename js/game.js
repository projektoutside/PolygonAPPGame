
// Game State Management
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    LEVEL_COMPLETE: 'level_complete',
    GAME_OVER: 'game_over'
};

class Game {
    constructor(app) {
        this.app = app; // Reference to PolygonPlayground instance
        this.state = GameState.MENU;
        this.currentMode = null;
        this.currentLevel = 0;
        this.score = 0;
        this.levels = []; // Loaded from levels.js
        this.devManager = new DevManager(this); // Initialize DevManager
    }

    init() {
        // Initialize game systems
        console.log('Game system initialized');
        // Hook into app events if needed
    }

    startMode(modeName) {
        if (modeName === 'beginner') {
            this.currentMode = new BeginnerMode(this);
            // Switch UI to Game Mode
            this.toggleUI(true);
            this.currentMode.start();
        }
        this.state = GameState.PLAYING;
        // Hide Main Menu
        if (MainMenu) MainMenu.hide();
    }

    stop() {
        this.state = GameState.MENU;
        this.currentMode = null;
        this.toggleUI(false);
        if (this.app) {
            this.app.gridSnap = true;
        }
        if (MainMenu) MainMenu.show();

        // Remove HUD
        const hud = document.getElementById('gameHUD');
        if (hud) hud.remove();

        const controls = document.getElementById('gameControls');
        if (controls) controls.style.display = 'none';

        const results = document.getElementById('gameResultsOverlay');
        if (results) results.style.display = 'none';

        const boxScore = document.getElementById('boxScoreOverlay');
        if (boxScore) {
            boxScore.style.display = 'none';
            boxScore.setAttribute('aria-hidden', 'true');
        }

        const saveLoad = document.getElementById('saveLoadOverlay');
        if (saveLoad) {
            saveLoad.style.display = 'none';
            saveLoad.setAttribute('aria-hidden', 'true');
        }

        // Hide Dev Panel if open
        if (this.devManager) this.devManager.hide();
    }

    toggleUI(active) {
        // Elements to hide during game mode
        const selectorsToHide = [
            '.sidebar',               // Layers (left)
            '.sidebar-right',         // Visualizers (right)
            '.toolbar',               // Left Toolbar
            '.top-tools-bar',         // Top Bar (Learn, Save, Open, Fullscreen)
            '.mobile-menu-toggle',    // Mobile toggles if any
            '.coord-display'          // Coordinate display
        ];

        // Ensure Learn Page is hidden when entering game mode
        if (active) {
            const learnPage = document.getElementById('learnPage');
            if (learnPage) {
                learnPage.classList.remove('active');
            }
        }

        selectorsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (active) {
                    el.classList.add('game-hidden');
                    el.style.display = 'none'; // Force hide
                } else {
                    el.classList.remove('game-hidden');
                    el.style.display = ''; // Restore default
                }
            });
        });

        const propPanel = document.getElementById('bottomPropertiesPanel');
        if (propPanel && active) {
            propPanel.style.display = 'flex';
        }

        const controls = document.getElementById('gameControls');
        if (controls) {
            controls.style.display = active ? 'flex' : 'none';
        }
    }

    loadLevels(levels) {
        this.levels = [];
        // SAFE LEVEL VALIDATION
        levels.forEach((lvl, idx) => {
            if (!lvl.startShapeVertices || lvl.startShapeVertices.length < 3) {
                console.warn(`Skipping invalid level ${idx}: Invalid vertices.`);
                return;
            }
            if (!lvl.targetPieces || lvl.targetPieces < 2) {
                console.warn(`Skipping invalid level ${idx}: Invalid target pieces.`);
                return;
            }
            this.levels.push(lvl);
        });

        // Refresh dev manager list if it exists
        if (this.devManager && this.devManager.panel) {
            this.devManager.populateList();
        }
    }
}

class BeginnerMode {
    constructor(game) {
        this.game = game;
        this.app = game.app;
        this.currentLevelIndex = 0;
        this.movesRemaining = 0;
        this.targetPieces = 0;
        this.levelData = null;
        this.linesUsed = 0;
        this.maxLines = 0;
        this.lineHistory = [];
        this.redoLineHistory = [];
        this.controlsBound = false;
        this.lastResult = null;
        this.modeType = 'fun';
        this.levelFailCount = 0; // Safety Feature: Track frustration
        this.audioCtx = null;
        this.gridFreeMode = false;
        this.gridToggleBound = false;
        this.saveSlotCount = 3;
        this.activeSaveSlot = 1;
        this.starRatings = [];
        this.boxScoreReady = false;
        this.didAutoResume = false;
    }

    start() {
        console.log('Starting Beginner Mode');
        this.bindGameControls();
        this.setupBoxScoreUI();
        const resumed = this.tryAutoResume();
        if (!resumed) {
            this.loadLevel(0);
        }

        // Auto-show tutorial for new users
        if (window.tutorial && !localStorage.getItem('tutorial_seen')) {
            setTimeout(() => window.tutorial.show(), 150);
            localStorage.setItem('tutorial_seen', 'true');
        }
    }

    isFunModeActive() {
        return this.game && this.game.currentMode === this && this.game.state === GameState.PLAYING;
    }

    getSlotKey(slot) {
        return `polygonFunSaveSlot${slot}`;
    }

    getStarKey(slot) {
        return `polygonFunStarsSlot${slot}`;
    }

    getActiveSaveSlot() {
        const stored = parseInt(localStorage.getItem('polygonFunActiveSlot'), 10);
        if (!Number.isFinite(stored) || stored < 1 || stored > this.saveSlotCount) {
            return 1;
        }
        return stored;
    }

    setActiveSaveSlot(slot) {
        const normalized = Math.min(this.saveSlotCount, Math.max(1, slot));
        this.activeSaveSlot = normalized;
        localStorage.setItem('polygonFunActiveSlot', `${normalized}`);
        this.starRatings = this.getSlotStars(normalized);
        this.refreshBoxScoreUI();
    }

    createEmptyStars() {
        const length = this.game && Array.isArray(this.game.levels)
            ? this.game.levels.length
            : 30;
        return Array.from({ length }, () => 0);
    }

    getSlotMeta(slot) {
        const slotData = this.getSlotData(slot);
        const stars = this.getSlotStars(slot);
        const totalStars = stars.reduce((sum, value) => sum + value, 0);
        const maxStars = stars.length * 3;
        const completion = maxStars > 0 ? Math.min(100, Math.round((totalStars / maxStars) * 100)) : 0;
        const hasSave = !!slotData?.appState;
        const savedAt = slotData?.savedAt ? new Date(slotData.savedAt) : null;
        const levelIndex = Number.isFinite(slotData?.levelIndex) ? slotData.levelIndex : -1;
        const lastPlayedLabel = levelIndex >= 0 ? `Level ${levelIndex + 1}` : '—';
        const autoSaveTime = slotData?.autoSavedAt ? new Date(slotData.autoSavedAt) : null;
        return {
            slotData,
            stars,
            totalStars,
            maxStars,
            completion,
            hasSave,
            savedAt,
            autoSaveTime,
            lastPlayedLabel,
            levelIndex
        };
    }

    formatRelativeTime(dateValue) {
        if (!dateValue) return '—';
        const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
        if (!Number.isFinite(date.getTime())) return '—';
        const diff = Date.now() - date.getTime();
        if (diff < 60000) return 'just now';
        const minutes = Math.round(diff / 60000);
        if (minutes < 60) return `${minutes} min ago`;
        const hours = Math.round(minutes / 60);
        if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
        const days = Math.round(hours / 24);
        if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
        return date.toLocaleDateString();
    }

    getSaveStatusForSlot(slot) {
        const meta = this.getSlotMeta(slot);
        if (!meta.hasSave) {
            return {
                label: 'Empty',
                detail: 'No save yet',
                tone: 'empty'
            };
        }
        if (slot === this.activeSaveSlot) {
            const autosaveLabel = meta.autoSaveTime ? this.formatRelativeTime(meta.autoSaveTime) : 'Autosave ready';
            return {
                label: 'Active',
                detail: `Autosave ${autosaveLabel}`,
                tone: 'active'
            };
        }
        return {
            label: 'Saved',
            detail: meta.savedAt ? `Manual save ${this.formatRelativeTime(meta.savedAt)}` : 'Manual save ready',
            tone: 'saved'
        };
    }

    normalizeStars(stars) {
        const normalized = Array.isArray(stars) ? [...stars] : [];
        const targetLength = this.game && Array.isArray(this.game.levels)
            ? this.game.levels.length
            : 30;
        while (normalized.length < targetLength) {
            normalized.push(0);
        }
        return normalized.slice(0, targetLength).map(value => {
            if (!Number.isFinite(value)) return 0;
            return Math.max(0, Math.min(3, Math.round(value)));
        });
    }

    getSlotData(slot) {
        const key = this.getSlotKey(slot);
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (error) {
            console.warn('Failed to parse save slot data', error);
            return null;
        }
    }

    getStoredStars(slot) {
        const key = this.getStarKey(slot);
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : null;
        } catch (error) {
            console.warn('Failed to parse stored stars data', error);
            return null;
        }
    }

    getSlotStars(slot) {
        const slotData = this.getSlotData(slot);
        const slotStars = Array.isArray(slotData?.stars) ? slotData.stars : null;
        const storedStars = this.getStoredStars(slot);
        const sources = [storedStars, slotStars].filter(Boolean).map(stars => this.normalizeStars(stars));
        if (sources.length === 0) {
            return this.createEmptyStars();
        }
        const merged = [...sources[0]];
        for (let i = 1; i < sources.length; i++) {
            sources[i].forEach((value, index) => {
                merged[index] = Math.max(merged[index] || 0, value || 0);
            });
        }
        return this.normalizeStars(merged);
    }

    saveSlotData(slot, data) {
        const key = this.getSlotKey(slot);
        localStorage.setItem(key, JSON.stringify(data));
    }

    saveStars(slot, stars) {
        const key = this.getStarKey(slot);
        localStorage.setItem(key, JSON.stringify(this.normalizeStars(stars)));
    }

    captureAppState() {
        if (!this.app) return null;
        return {
            polygons: this.app.polygons.map(p => ({
                vertices: p.vertices.map(v => ({ x: v.x, y: v.y })),
                color: p.color,
                name: p.name,
                visible: p.visible
            })),
            history: Array.isArray(this.app.history) ? [...this.app.history] : [],
            historyIndex: this.app.historyIndex,
            pan: this.app.pan ? { ...this.app.pan } : { x: 0, y: 0 },
            zoom: this.app.zoom || 1
        };
    }

    applyAppState(state) {
        if (!this.app || !state) return false;
        if (!Array.isArray(state.polygons) || state.polygons.length === 0) {
            return false;
        }

        this.app.polygons = state.polygons.map(p => {
            const poly = new Polygon(p.vertices || [], p.color || '#667eea');
            poly.name = p.name || 'Polygon';
            poly.visible = p.visible !== false;
            return poly;
        }).filter(p => p.vertices.length >= 3);

        this.app.history = Array.isArray(state.history) ? [...state.history] : [];
        if (Number.isFinite(state.historyIndex)) {
            this.app.historyIndex = state.historyIndex;
        } else {
            this.app.historyIndex = this.app.history.length - 1;
        }

        if (state.pan && Number.isFinite(state.pan.x) && Number.isFinite(state.pan.y)) {
            this.app.pan = { x: state.pan.x, y: state.pan.y };
        }
        if (Number.isFinite(state.zoom)) {
            this.app.zoom = state.zoom;
        }

        this.app.selectedPolygon = null;
        this.app.selectedVertex = null;
        this.app.updateLayers();
        this.app.updateProperties();
        this.app.render(true);
        return true;
    }

    tryAutoResume() {
        this.setActiveSaveSlot(this.getActiveSaveSlot());
        const slotData = this.getSlotData(this.activeSaveSlot);

        if (slotData && slotData.appState && Number.isFinite(slotData.levelIndex)) {
            const restored = this.restoreFromSlotData(slotData);
            if (restored) {
                this.didAutoResume = true;
                if (this.app && typeof this.app.showToast === 'function') {
                    this.app.showToast(`Loaded Save Slot ${this.activeSaveSlot}`);
                }
                return true;
            }
        }
        return false;
    }

    shouldConfirmLoad(slot) {
        if (!this.isFunModeActive()) return false;
        const currentSlotData = this.getSlotData(this.activeSaveSlot);
        if (!currentSlotData?.appState) return false;
        return slot !== this.activeSaveSlot;
    }

    shouldConfirmOverwrite(slot) {
        if (!this.isFunModeActive()) return false;
        const slotData = this.getSlotData(slot);
        return !!slotData?.appState;
    }

    updateBoxScoreHeaderMeta() {
        const activeSlotEl = document.getElementById('boxScoreActiveSlot');
        const saveTypeEl = document.getElementById('boxScoreSaveType');
        const lastSaveEl = document.getElementById('boxScoreLastSave');
        if (!activeSlotEl || !saveTypeEl || !lastSaveEl) return;
        const meta = this.getSlotMeta(this.activeSaveSlot);
        activeSlotEl.textContent = `Active Slot: ${this.activeSaveSlot}`;
        if (meta.hasSave) {
            const autosaveLabel = meta.autoSaveTime ? this.formatRelativeTime(meta.autoSaveTime) : 'Autosave ready';
            saveTypeEl.textContent = meta.autoSaveTime ? 'Autosaved' : 'Manual Save';
            lastSaveEl.textContent = meta.savedAt
                ? `Last save: ${this.formatRelativeTime(meta.savedAt)}`
                : `Autosave: ${autosaveLabel}`;
        } else {
            saveTypeEl.textContent = 'Empty Slot';
            lastSaveEl.textContent = 'Last save: --';
        }
    }

    restoreFromSlotData(slotData) {
        if (!slotData || !this.game || !Array.isArray(this.game.levels)) {
            return false;
        }

        const levelIndex = Math.min(
            this.game.levels.length - 1,
            Math.max(0, Number(slotData.levelIndex || 0))
        );

        this.currentLevelIndex = levelIndex;
        this.levelData = this.game.levels[levelIndex];
        if (!this.levelData) {
            return false;
        }

        this.linesUsed = Number(slotData.linesUsed || 0);
        this.lineHistory = Array.isArray(slotData.lineHistory) ? [...slotData.lineHistory] : [];
        this.redoLineHistory = Array.isArray(slotData.redoLineHistory) ? [...slotData.redoLineHistory] : [];
        this.maxLines = this.levelData.maxLines || 99;
        this.targetPieces = this.levelData.targetPieces;
        this.lastResult = null;
        this.hideResultsOverlay();
        this.hideSkipButton();

        this.gridFreeMode = !!slotData.gridFreeMode;
        this.app.gridSnap = !this.gridFreeMode;

        const restored = this.applyAppState(slotData.appState);
        if (!restored) {
            this.setupPlayground();
        }

        this.app.setTool('split');
        this.app.splitMode = true;
        this.app.splitStep = 1;
        this.app.splitLineStart = null;
        this.app.splitLineEnd = null;

        this.updateHUD();
        this.updateGameControlButtons();
        return true;
    }

    saveSlot(slot, silent = false, starsOverride = null) {
        if (!this.app || !this.isFunModeActive()) return;
        const normalizedSlot = Math.min(this.saveSlotCount, Math.max(1, slot));
        const existing = this.getSlotData(normalizedSlot) || {};
        const storedStars = this.getSlotStars(normalizedSlot);
        const sourceStars = Array.isArray(starsOverride) ? starsOverride : this.starRatings;
        const currentStars = this.normalizeStars(sourceStars.length ? sourceStars : storedStars);
        const mergedStars = currentStars.map((value, index) => {
            const stored = storedStars[index] || 0;
            return Math.max(value, stored);
        });
        const payload = {
            version: 1,
            savedAt: Date.now(),
            autoSavedAt: existing.autoSavedAt || null,
            levelIndex: this.currentLevelIndex,
            linesUsed: this.linesUsed,
            lineHistory: Array.isArray(this.lineHistory) ? [...this.lineHistory] : [],
            redoLineHistory: Array.isArray(this.redoLineHistory) ? [...this.redoLineHistory] : [],
            gridFreeMode: this.gridFreeMode,
            stars: mergedStars,
            appState: this.captureAppState(),
            lastResult: existing.lastResult || null
        };
        this.saveSlotData(normalizedSlot, payload);
        this.saveStars(normalizedSlot, mergedStars);
        this.starRatings = mergedStars;
        if (!silent && this.app && typeof this.app.showToast === 'function') {
            this.app.showToast(`Saved to Slot ${normalizedSlot}`);
        }
        this.refreshBoxScoreUI();
    }

    autoSaveSlot(slot) {
        if (!this.app || !this.isFunModeActive()) return;
        const normalizedSlot = Math.min(this.saveSlotCount, Math.max(1, slot));
        const existing = this.getSlotData(normalizedSlot) || {};
        const storedStars = this.getSlotStars(normalizedSlot);
        const sourceStars = this.starRatings.length ? this.starRatings : storedStars;
        const mergedStars = this.normalizeStars(sourceStars).map((value, index) => {
            const stored = storedStars[index] || 0;
            return Math.max(value, stored);
        });
        const payload = {
            version: 1,
            savedAt: existing.savedAt || null,
            autoSavedAt: Date.now(),
            levelIndex: this.currentLevelIndex,
            linesUsed: this.linesUsed,
            lineHistory: Array.isArray(this.lineHistory) ? [...this.lineHistory] : [],
            redoLineHistory: Array.isArray(this.redoLineHistory) ? [...this.redoLineHistory] : [],
            gridFreeMode: this.gridFreeMode,
            stars: mergedStars,
            appState: this.captureAppState(),
            lastResult: existing.lastResult || null
        };
        this.saveSlotData(normalizedSlot, payload);
        this.saveStars(normalizedSlot, mergedStars);
        this.starRatings = mergedStars;
        this.refreshBoxScoreUI();
        this.updateHUD();
    }

    async loadSlot(slot) {
        const normalizedSlot = Math.min(this.saveSlotCount, Math.max(1, slot));
        const slotData = this.getSlotData(normalizedSlot);
        if (!slotData) {
            if (this.app && typeof this.app.showToast === 'function') {
                this.app.showToast(`Slot ${normalizedSlot} is empty.`, true);
            }
            return;
        }

        if (this.shouldConfirmLoad(normalizedSlot)) {
            const confirmMessage = `Load Slot ${normalizedSlot}? Your current session will be replaced.`;
            if (!(await window.appConfirm(confirmMessage, { title: 'Load Game', confirmText: 'Load' }))) {
                return;
            }
        }

        if (this.game.state !== GameState.PLAYING) {
            this.game.startMode('beginner');
        }

        this.setActiveSaveSlot(normalizedSlot);
        this.starRatings = this.getSlotStars(normalizedSlot);
        this.restoreFromSlotData(slotData);

        if (this.app && typeof this.app.showToast === 'function') {
            this.app.showToast(`Loaded Slot ${normalizedSlot}`);
        }
        this.refreshBoxScoreUI();
    }

    clearSlot(slot) {
        const normalizedSlot = Math.min(this.saveSlotCount, Math.max(1, slot));
        localStorage.removeItem(this.getSlotKey(normalizedSlot));
        localStorage.removeItem(this.getStarKey(normalizedSlot));
        if (normalizedSlot === this.activeSaveSlot) {
            this.starRatings = this.getSlotStars(normalizedSlot);
        }
        if (this.app && typeof this.app.showToast === 'function') {
            this.app.showToast(`Cleared Slot ${normalizedSlot}`);
        }
        this.refreshBoxScoreUI();
    }

    autosaveProgress() {
        if (!this.isFunModeActive()) return;
        if (this.starRatings.length === 0) {
            this.starRatings = this.getSlotStars(this.activeSaveSlot);
        }
        this.autoSaveSlot(this.activeSaveSlot);
    }

    getSolutionKey(slot) {
        return `polygonFunSolutionsSlot${slot}`;
    }

    saveLevelResult(slot, levelIndex, result) {
        if (!result || !result.pieces) return;

        // Serialize minimal data needed for preview
        const serializablePieces = result.pieces.map(p => ({
            vertices: p.vertices.map(v => ({ x: v.x, y: v.y })), // Ensure plain objects
            color: p.color
        }));

        const data = {
            pieces: serializablePieces,
            percents: result.piecePercents || [],
            coins: result.coins || 0,
            timestamp: Date.now()
        };

        const key = this.getSolutionKey(slot);
        let allSolutions = {};
        try {
            const raw = localStorage.getItem(key);
            if (raw) allSolutions = JSON.parse(raw);
        } catch (e) { console.warn('Error reading solutions', e); }

        allSolutions[levelIndex] = data;
        localStorage.setItem(key, JSON.stringify(allSolutions));
    }

    getLevelSolution(slot, levelIndex) {
        const key = this.getSolutionKey(slot);
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const all = JSON.parse(raw);
            return all[levelIndex] || null;
        } catch (e) { return null; }
    }

    recordStarRating(stars, resultData = null) {
        const normalizedStars = Math.max(0, Math.min(3, Number(stars) || 0));
        const levelIndex = this.currentLevelIndex;
        if (!Number.isFinite(levelIndex)) return;

        if (this.starRatings.length === 0) {
            this.starRatings = this.createEmptyStars();
        }

        const previous = this.starRatings[levelIndex] || 0;

        // Save stars if better
        if (normalizedStars > previous) {
            this.starRatings[levelIndex] = normalizedStars;
            this.saveStars(this.activeSaveSlot, this.starRatings);
        }

        // Save solution if provided and it's a passing score (and better or equal to previous best)
        // We prioritize higher stars, or newer solution if stars are same (assuming newer is what user wants to remember)
        if (resultData && normalizedStars > 0 && normalizedStars >= previous) {
            this.saveLevelResult(this.activeSaveSlot, levelIndex, resultData);
        }

        this.refreshBoxScoreUI();
        this.updateHUD();
    }

    setupBoxScoreUI() {
        if (this.boxScoreReady) return;
        const overlay = document.getElementById('boxScoreOverlay');
        const closeBtn = document.getElementById('boxScoreClose');

        if (!overlay || !closeBtn) return;

        closeBtn.addEventListener('click', () => this.closeBoxScore());
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                this.closeBoxScore();
            }
        });

        // Setup Save/Load UI as well
        this.setupSaveLoadUI();

        this.boxScoreReady = true;
    }

    setupSaveLoadUI() {
        // Create the overlay if it doesn't exist
        if (!document.getElementById('saveLoadOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'saveLoadOverlay';
            overlay.className = 'overlay';
            overlay.setAttribute('aria-hidden', 'true');
            overlay.style.cssText = `
                display: none;
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px);
                z-index: 9999; justify-content: center; align-items: center;
            `;

            overlay.innerHTML = `
                <div class="panel-container" style="background: white; border-radius: 20px; width: 95%; max-width: 500px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                    <div class="panel-header" style="padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: white; color: #1e293b;">
                        <h2 style="margin: 0; font-size: 20px; font-weight: 700; font-family: 'Inter', sans-serif;">Save / Load Game</h2>
                        <button id="saveLoadClose" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; padding: 4px;">&times;</button>
                    </div>
                    
                    <div class="panel-content" style="padding: 24px; overflow-y: auto;">
                        <div class="panel-meta" style="margin-bottom: 20px; text-align: center; color: #64748b; background: #f8fafc; padding: 12px; border-radius: 12px; font-size: 14px;">
                            <div id="saveLoadActiveSlot" style="font-weight: 600; color: #334155; margin-bottom: 4px;">Active Slot: --</div>
                            <div id="saveLoadLastSave">Last save: --</div>
                        </div>

                        <div id="saveLoadSlots" style="display: flex; flex-direction: column; gap: 12px;">
                            <!-- Slots injected here -->
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            // CSS for slots (reused logic from box score but scoped)
            const style = document.createElement('style');
            style.textContent = `
                .sl-slot {
                    border: 2px solid #e2e8f0; border-radius: 12px; padding: 16px;
                    transition: all 0.2s; cursor: pointer; position: relative;
                }
                .sl-slot:hover { border-color: #cbd5e1; transform: translateY(-1px); }
                .sl-slot.active { border-color: #3b82f6; background: #eff6ff; }
                .sl-slot.active::before {
                    content: 'Active'; position: absolute; top: -10px; right: 10px;
                    background: #3b82f6; color: white; font-size: 10px; font-weight: 700;
                    padding: 2px 8px; border-radius: 10px;
                }
                .sl-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
                .sl-title { font-weight: 700; color: #334155; }
                .sl-status { font-size: 12px; font-weight: 600; }
                .sl-details { font-size: 13px; color: #64748b; margin-bottom: 12px; display: flex; gap: 10px; }
                .sl-actions { display: flex; gap: 8px; margin-top: 12px; }
                .sl-actions button {
                    flex: 1; padding: 8px; border-radius: 8px; border: 1px solid #e2e8f0;
                    background: white; font-weight: 600; font-size: 13px; cursor: pointer;
                    transition: all 0.2s;
                }
                .sl-actions button:hover:not(:disabled) { background: #f1f5f9; }
                .sl-actions button:disabled { opacity: 0.5; cursor: not-allowed; }
                .sl-actions button.primary { background: #3b82f6; color: white; border-color: #3b82f6; }
                .sl-actions button.primary:hover:not(:disabled) { background: #2563eb; }
                .sl-actions button.danger { color: #ef4444; border-color: #fecaca; }
                .sl-actions button.danger:hover:not(:disabled) { background: #fef2f2; }
            `;
            document.head.appendChild(style);
        }

        const overlay = document.getElementById('saveLoadOverlay');
        const closeBtn = document.getElementById('saveLoadClose');

        if (closeBtn) {
            closeBtn.onclick = () => this.closeSaveLoadPanel();
        }
        if (overlay) {
            overlay.onclick = (e) => {
                if (e.target === overlay) this.closeSaveLoadPanel();
            };
        }
    }

    openSaveLoadPanel() {
        const overlay = document.getElementById('saveLoadOverlay');
        if (!overlay) return;
        this.refreshSaveLoadUI();
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');
    }

    closeSaveLoadPanel() {
        const overlay = document.getElementById('saveLoadOverlay');
        if (!overlay) return;
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
    }

    refreshSaveLoadUI() {
        const activeSlotEl = document.getElementById('saveLoadActiveSlot');
        const lastSaveEl = document.getElementById('saveLoadLastSave');
        const slotContainer = document.getElementById('saveLoadSlots');

        if (!activeSlotEl || !lastSaveEl || !slotContainer) return;

        const meta = this.getSlotMeta(this.activeSaveSlot);
        activeSlotEl.textContent = `Active Slot: ${this.activeSaveSlot}`;
        if (meta.hasSave) {
            const autosaveLabel = meta.autoSaveTime ? this.formatRelativeTime(meta.autoSaveTime) : 'Autosave ready';
            lastSaveEl.textContent = meta.savedAt
                ? `Last save: ${this.formatRelativeTime(meta.savedAt)}`
                : `Autosave: ${autosaveLabel}`;
        } else {
            lastSaveEl.textContent = 'Last save: --';
        }

        this.renderSaveLoadSlots(slotContainer);
    }

    openBoxScore() {
        const overlay = document.getElementById('boxScoreOverlay');
        if (!overlay) return;
        this.refreshBoxScoreUI();
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');
    }

    closeBoxScore() {
        const overlay = document.getElementById('boxScoreOverlay');
        if (!overlay) return;
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
    }

    refreshBoxScoreUI() {
        const totalEl = document.getElementById('boxScoreTotal');
        const gridContainer = document.getElementById('boxScoreGrid');

        // Hide Slot Container in Box Score if it exists
        const slotContainer = document.getElementById('boxScoreSlots');
        if (slotContainer) slotContainer.style.display = 'none';

        const headerMeta = document.querySelector('.box-score-header-meta');
        if (headerMeta) headerMeta.style.display = 'none'; // Hide slot info in box score

        if (!totalEl || !gridContainer) return;

        const storedStars = this.getSlotStars(this.activeSaveSlot);
        const currentStars = this.normalizeStars(this.starRatings.length ? this.starRatings : storedStars);
        const normalizedStars = currentStars.map((value, index) => Math.max(value, storedStars[index] || 0));
        this.starRatings = normalizedStars;

        const slotData = this.getSlotData(this.activeSaveSlot);
        const slotLevelIndex = Number.isFinite(slotData?.levelIndex) ? slotData.levelIndex : 0;
        const lastStarIndex = normalizedStars.reduce((acc, value, index) => (value > 0 ? index : acc), -1);
        const unlockedIndex = Math.max(slotLevelIndex, lastStarIndex);

        const totalStars = normalizedStars.reduce((sum, value) => sum + value, 0);
        const maxStars = normalizedStars.length * 3;
        totalEl.textContent = `${totalStars} / ${maxStars}`;

        // Removed updateBoxScoreHeaderMeta() call

        // Removed renderBoxScoreSlots(slotContainer) call
        this.renderBoxScoreGrid(gridContainer, normalizedStars, unlockedIndex);
    }

    renderSaveLoadSlots(container) {
        container.innerHTML = '';
        for (let slot = 1; slot <= this.saveSlotCount; slot++) {
            const meta = this.getSlotMeta(slot);
            const status = this.getSaveStatusForSlot(slot);

            const card = document.createElement('div');
            card.className = `sl-slot${slot === this.activeSaveSlot ? ' active' : ''}`;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('data-slot-select', `${slot}`);

            const stats = `⭐ ${meta.totalStars} / ${meta.maxStars} • ${meta.completion}%`;

            card.innerHTML = `
                <div class="sl-header">
                    <span class="sl-title">Slot ${slot}</span>
                    <span class="sl-status" style="color: ${meta.hasSave ? '#10b981' : '#94a3b8'}">${status.label}</span>
                </div>
                <div class="sl-details">
                    <span>${stats}</span>
                    <span>•</span>
                    <span>${status.detail}</span>
                </div>
                <div class="sl-actions">
                    <button data-slot-action="load" data-slot="${slot}" ${meta.hasSave ? '' : 'disabled'}>Load</button>
                    <button data-slot-action="save" data-slot="${slot}" class="primary">Save</button>
                    <button data-slot-action="clear" data-slot="${slot}" class="danger" ${meta.hasSave ? '' : 'disabled'}>Clear</button>
                </div>
            `;
            container.appendChild(card);
        }

        container.querySelectorAll('[data-slot-select]').forEach(card => {
            const slot = parseInt(card.dataset.slotSelect, 10);
            if (!Number.isFinite(slot)) return;

            const handleSelect = (event) => {
                // Ignore clicks on buttons inside
                if (event.target && event.target.closest('button')) return;
                this.setActiveSaveSlot(slot);
                this.refreshSaveLoadUI(); // Refresh UI to update active state
            };

            card.addEventListener('click', handleSelect);
        });

        container.querySelectorAll('button[data-slot-action]').forEach(btn => {
            btn.addEventListener('click', async (event) => {
                event.stopPropagation(); // Stop card selection
                const action = event.currentTarget.dataset.slotAction;
                const slot = parseInt(event.currentTarget.dataset.slot, 10);
                if (!Number.isFinite(slot)) return;

                if (action === 'load') {
                    if (this.shouldConfirmLoad(slot)) {
                        const confirmMessage = `Load Slot ${slot}? Unsaved progress will be lost.`;
                        if (!(await window.appConfirm(confirmMessage, { title: 'Load Slot' }))) return;
                    }
                    this.loadSlot(slot);
                    this.closeSaveLoadPanel(); // Close panel on load
                } else if (action === 'save') {
                    if (this.shouldConfirmOverwrite(slot)) {
                        const confirmMessage = `Overwrite Slot ${slot}? This will replace the existing save.`;
                        if (!(await window.appConfirm(confirmMessage, { title: 'Overwrite Save', confirmText: 'Overwrite', cancelText: 'Cancel' }))) return;
                    }
                    // Save logic
                    // Explicitly get stars from the *current* active slot storage to ensure accuracy
                    // Stars are autosaved immediately on level completion, so storage is the source of truth
                    const currentSlot = this.activeSaveSlot;
                    const sessionStars = this.getSlotStars(currentSlot);

                    // Switch to target slot
                    this.setActiveSaveSlot(slot);

                    // Save using the captured stars
                    this.saveSlot(slot, false, sessionStars);

                    // Force a delay to ensure localStorage write completes before UI refresh (rare edge case but safe)
                    setTimeout(() => {
                        this.refreshSaveLoadUI();
                    }, 50);
                } else if (action === 'clear') {
                    if (await window.appConfirm(`Clear Slot ${slot}? This cannot be undone.`, { title: 'Clear Slot', confirmText: 'Clear', cancelText: 'Cancel' })) {
                        this.clearSlot(slot);
                        this.refreshSaveLoadUI();
                    }
                }
            });
        });
    }

    renderBoxScoreGrid(container, stars, unlockedIndex = -1) {
        container.innerHTML = '';
        const levels = Array.isArray(this.game.levels) ? this.game.levels : [];
        stars.forEach((value, index) => {
            const levelLabel = levels[index]
                ? `${levels[index].name || `Level ${index + 1}`}`
                : `Level ${index + 1}`;
            const row = document.createElement('div');
            const isCurrent = index === this.currentLevelIndex;
            const isSelectable = index <= unlockedIndex;
            row.className = `box-score-level${isSelectable ? ' selectable' : ' locked'}${isCurrent ? ' current' : ''}`;
            if (isSelectable) {
                row.setAttribute('role', 'button');
                row.setAttribute('tabindex', '0');
                row.setAttribute('data-level-index', `${index}`);
            } else {
                row.setAttribute('aria-disabled', 'true');
            }
            const starIcons = Array.from({ length: 3 }).map((_, idx) => {
                const filled = idx < value;
                return `<span class="box-score-star${filled ? '' : ' empty'}">★</span>`;
            }).join('');
            const statusText = isCurrent
                ? 'Current'
                : isSelectable
                    ? 'Replay'
                    : 'Locked';
            row.innerHTML = `
                <span class="box-score-level-title">
                    <span>${levelLabel}</span>
                    <span class="box-score-level-status">${statusText}</span>
                </span>
                <div class="box-score-stars">${starIcons}</div>
            `;
            if (isSelectable) {
                const handleSelect = () => this.loadLevelFromBoxScore(index);
                row.addEventListener('click', handleSelect);
                row.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleSelect();
                    }
                });

                // Preview on hover
                row.addEventListener('mouseenter', () => {
                    this.renderLevelPreview(index);
                });
            }
            container.appendChild(row);
        });

        // Initialize preview with current level or first unlocked
        const initialPreviewIndex = (Number.isFinite(this.currentLevelIndex)) ? this.currentLevelIndex : 0;
        this.renderLevelPreview(initialPreviewIndex);
    }

    renderLevelPreview(index) {
        const canvas = document.getElementById('levelPreviewCanvas');
        const titleEl = document.getElementById('levelPreviewTitle');
        if (!canvas || !titleEl) return;

        const level = this.game.levels[index];
        if (!level) return;

        // Check for saved solution
        const savedSolution = this.getLevelSolution(this.activeSaveSlot, index);
        const isSolved = savedSolution && savedSolution.pieces && savedSolution.pieces.length > 0;

        titleEl.textContent = isSolved
            ? `Level ${index + 1} Result`
            : `Level ${index + 1} Preview`;

        const ctx = canvas.getContext('2d');
        const width = canvas.clientWidth || 300;
        const height = canvas.clientHeight || 300;

        // Ensure high DPI rendering
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        ctx.clearRect(0, 0, width, height);

        // Draw Grid Background
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        const gridSize = 20;
        ctx.beginPath();
        for (let x = 0; x <= width; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();

        let verticesCollection = [];
        let labels = [];

        if (isSolved) {
            const storedPercents = Array.isArray(savedSolution.percents) ? savedSolution.percents : [];
            let fallbackPercents = [];
            if (!storedPercents.length || storedPercents.length !== savedSolution.pieces.length) {
                const pieceAreas = savedSolution.pieces.map(piece => Math.abs(Geometry.getArea(piece.vertices)));
                const totalArea = pieceAreas.reduce((sum, area) => sum + area, 0);
                fallbackPercents = totalArea > 0
                    ? pieceAreas.map(area => (area / totalArea) * 100)
                    : pieceAreas.map(() => 0);
            }

            savedSolution.pieces.forEach((p, idx) => {
                verticesCollection.push({
                    vertices: p.vertices,
                    color: p.color
                });
                const percentValue = Number.isFinite(storedPercents[idx])
                    ? storedPercents[idx]
                    : fallbackPercents[idx];
                if (Number.isFinite(percentValue)) {
                    labels.push({
                        text: `${percentValue.toFixed(1)}%`,
                        vertices: p.vertices
                    });
                }
            });
        } else {
            // Fallback to start shape
            verticesCollection.push({
                vertices: level.startShapeVertices,
                color: level.color || '#60a5fa'
            });
        }

        if (verticesCollection.length === 0) return;

        // Calculate bounds to center and zoom
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        verticesCollection.forEach(item => {
            item.vertices.forEach(v => {
                minX = Math.min(minX, v.x);
                minY = Math.min(minY, v.y);
                maxX = Math.max(maxX, v.x);
                maxY = Math.max(maxY, v.y);
            });
        });

        const polyWidth = maxX - minX;
        const polyHeight = maxY - minY;
        const scaleX = (width * 0.6) / (polyWidth || 1);
        const scaleY = (height * 0.6) / (polyHeight || 1);
        const scale = Math.min(scaleX, scaleY);

        const centerX = width / 2;
        const centerY = height / 2;
        const polyCenterX = (minX + maxX) / 2;
        const polyCenterY = (minY + maxY) / 2;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.translate(-polyCenterX, -polyCenterY);

        // Draw Polygons
        verticesCollection.forEach(item => {
            ctx.fillStyle = item.color;
            ctx.strokeStyle = '#1e3a8a';
            ctx.lineWidth = 2 / scale;

            ctx.beginPath();
            ctx.moveTo(item.vertices[0].x, item.vertices[0].y);
            for (let i = 1; i < item.vertices.length; i++) {
                ctx.lineTo(item.vertices[i].x, item.vertices[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });

        // Draw Vertices
        ctx.fillStyle = '#fff';
        const pointSize = 4 / scale;
        verticesCollection.forEach(item => {
            item.vertices.forEach(v => {
                ctx.beginPath();
                ctx.arc(v.x, v.y, pointSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });
        });

        // Draw Text Labels (Percentages)
        if (labels.length > 0) {
            const drawRoundedRect = (x, y, width, height, radius) => {
                const r = Math.min(radius, width / 2, height / 2);
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.lineTo(x + width - r, y);
                ctx.quadraticCurveTo(x + width, y, x + width, y + r);
                ctx.lineTo(x + width, y + height - r);
                ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
                ctx.lineTo(x + r, y + height);
                ctx.quadraticCurveTo(x, y + height, x, y + height - r);
                ctx.lineTo(x, y + r);
                ctx.quadraticCurveTo(x, y, x + r, y);
                ctx.closePath();
            };

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            let fontSize = 24 / scale;
            if (fontSize < 12) fontSize = 12;
            if (fontSize > 100) fontSize = 100;

            ctx.font = `800 ${fontSize}px "Inter", sans-serif`;
            ctx.lineWidth = 2.5 / scale;

            labels.forEach(lbl => {
                let center = { x: 0, y: 0 };
                if (typeof Geometry !== 'undefined' && Geometry.getPolygonCenter) {
                    center = Geometry.getPolygonCenter(lbl.vertices);
                } else {
                    let sumX = 0, sumY = 0;
                    lbl.vertices.forEach(v => { sumX += v.x; sumY += v.y; });
                    center = { x: sumX / lbl.vertices.length, y: sumY / lbl.vertices.length };
                }

                const metrics = ctx.measureText(lbl.text);
                const paddingX = 10 / scale;
                const paddingY = 6 / scale;
                const boxWidth = metrics.width + paddingX * 2;
                const boxHeight = fontSize + paddingY * 2;
                const boxX = center.x - boxWidth / 2;
                const boxY = center.y - boxHeight / 2;

                ctx.save();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
                drawRoundedRect(boxX, boxY, boxWidth, boxHeight, 8 / scale);
                ctx.fill();
                ctx.stroke();
                ctx.restore();

                ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
                ctx.strokeText(lbl.text, center.x, center.y);
                ctx.fillStyle = '#0f172a';
                ctx.fillText(lbl.text, center.x, center.y);
            });
        }

        ctx.restore();
    }

    showSafetyPopup(message, onConfirm) {
        // Remove existing if any
        const existing = document.getElementById('safetyPopup');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'safetyPopup';
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(4px); z-index: 10000;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Inter', system-ui, sans-serif;
            animation: fadeIn 0.2s ease-out;
        `;

        const card = document.createElement('div');
        card.style.cssText = `
            background: white; width: 90%; max-width: 400px;
            border-radius: 20px; padding: 24px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            text-align: center;
        `;

        const title = document.createElement('h3');
        title.textContent = "Replay Level?";
        title.style.cssText = `
            margin: 0 0 12px 0; color: #1e293b; font-size: 20px; font-weight: 700;
        `;

        const text = document.createElement('p');
        text.textContent = message;
        text.style.cssText = `
            margin: 0 0 24px 0; color: #64748b; font-size: 15px; line-height: 1.5;
        `;

        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = `display: flex; gap: 12px; justify-content: center;`;

        const btnBase = `
            padding: 10px 20px; border-radius: 10px; border: none; font-weight: 600; cursor: pointer; transition: transform 0.1s; font-size: 14px;
        `;

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = "Cancel";
        cancelBtn.style.cssText = btnBase + `background: #f1f5f9; color: #64748b;`;
        cancelBtn.onmouseenter = () => cancelBtn.style.background = '#e2e8f0';
        cancelBtn.onmouseleave = () => cancelBtn.style.background = '#f1f5f9';
        cancelBtn.onclick = () => overlay.remove();

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = "Replay";
        confirmBtn.style.cssText = btnBase + `background: #3b82f6; color: white; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);`;
        confirmBtn.onmouseenter = () => confirmBtn.style.background = '#2563eb';
        confirmBtn.onmouseleave = () => confirmBtn.style.background = '#3b82f6';
        confirmBtn.onclick = () => {
            overlay.remove();
            if (onConfirm) onConfirm();
        };

        btnGroup.appendChild(cancelBtn);
        btnGroup.appendChild(confirmBtn);

        card.appendChild(title);
        card.appendChild(text);
        card.appendChild(btnGroup);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        card.animate([
            { transform: 'scale(0.9)', opacity: 0 },
            { transform: 'scale(1)', opacity: 1 }
        ], { duration: 200, easing: 'ease-out' });
    }

    loadLevelFromBoxScore(index) {
        if (!Number.isFinite(index)) return;

        const proceed = () => {
            if (this.game.state !== GameState.PLAYING) {
                this.game.startMode('beginner');
            }
            if (index < 0 || index >= this.game.levels.length) return;
            this.closeBoxScore();
            this.loadLevel(index);
            if (this.app && typeof this.app.showToast === 'function') {
                this.app.showToast(`Replaying Level ${index + 1}`);
            }
        };

        // Safety Check: If level is already completed (has stars), confirm first
        const stars = this.starRatings[index] || 0;
        if (stars > 0) {
            this.showSafetyPopup(
                "You have already completed this level. Do you want to replay it?",
                proceed
            );
        } else {
            proceed();
        }
    }

    loadLevel(index) {
        if (index >= this.game.levels.length) {
            this.showMessage('Game Completed!', 'Congratulations! You have finished all levels.', 'Back to Menu', () => {
                this.game.stop();
            });
            return;
        }

        // Reset fail count if advancing to a new level
        if (index !== this.currentLevelIndex) {
            this.levelFailCount = 0;
        }

        this.currentLevelIndex = index;
        this.levelData = this.game.levels[index];
        this.linesUsed = 0; // Track actual lines drawn
        this.maxLines = this.levelData.maxLines || 99; // Default if not set
        this.targetPieces = this.levelData.targetPieces;
        this.lineHistory = [];
        this.redoLineHistory = [];
        this.lastResult = null;
        this.hideResultsOverlay();
        this.hideSkipButton(); // Reset UI

        // Setup the playground for the level
        this.setupPlayground();

        // Show Level Info & Update HUD
        this.updateHUD();
        this.updateGameControlButtons();

        // If user was stuck before (reloading same level), maybe show skip immediately?
        // No, let them try fresh.
        if (this.levelFailCount >= 3) {
            this.showSkipButton();
        }

        this.autosaveProgress();
    }

    setupPlayground() {
        // Clear existing polygons
        this.app.polygons = [];
        this.app.history = [];
        this.app.historyIndex = -1;
        this.app.selectedPolygon = null;
        this.app.selectedVertex = null;

        // Create the starting shape
        const startShape = new Polygon(this.levelData.startShapeVertices, this.levelData.color);
        startShape.name = 'Target Shape';
        this.app.polygons.push(startShape);
        this.app.saveHistory();

        if (typeof this.app.fitViewToPolygon === 'function') {
            this.app.fitViewToPolygon(startShape, 0.3);
        } else {
            const center = Geometry.getPolygonCenter(startShape.vertices);
            if (center) {
                this.app.centerViewOn(center.x, center.y);
            }
        }

        // Set tool to split and configure split mode
        this.app.setTool('split');
        this.app.splitMode = true;
        this.app.splitStep = 1;
        this.app.splitLineStart = null;
        this.app.splitLineEnd = null;

        this.app.gridSnap = !this.gridFreeMode;

        // Show prompt only for the first level
        if (this.currentLevelIndex === 0) {
            this.app.updateSplitPrompt("Draw a line across shapes to split them.");
        } else {
            this.app.updateSplitPrompt("");
        }

        this.updateGameControlButtons();
        this.app.updateProperties(startShape);
    }

    handleSlice(newPolygons) {
        this.linesUsed++;
        this.lineHistory.push({
            linesUsed: this.linesUsed,
            timestamp: Date.now()
        });
        this.redoLineHistory = [];
        this.updateHUD();
        this.updateGameControlButtons();
        this.autosaveProgress();
    }

    // Safety Feature: Skip Button Management
    showSkipButton() {
        let skipBtn = document.getElementById('gameSkipBtn');
        if (!skipBtn) {
            const leftSide = document.querySelector('#gameHUD > div'); // First div is left side
            if (leftSide) {
                skipBtn = document.createElement('button');
                skipBtn.id = 'gameSkipBtn';
                skipBtn.innerHTML = '<span style="font-size: 16px;">⏭️</span> Skip';
                skipBtn.style.cssText = `
                    background: #f1f5f9;
                    border: 1px solid #cbd5e1;
                    padding: 8px 16px;
                    border-radius: 12px;
                    font-family: 'Inter', sans-serif;
                    font-weight: 600;
                    font-size: 14px;
                    color: #475569;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    animation: fadeIn 0.5s;
                `;
                skipBtn.onclick = async () => {
                    if (await window.appConfirm("Skip this level?", { title: 'Skip Level', confirmText: 'Skip' })) {
                        this.levelComplete(); // Treat as complete but maybe 0 score?
                    }
                };
                leftSide.appendChild(skipBtn);
            }
        }
    }

    hideSkipButton() {
        const skipBtn = document.getElementById('gameSkipBtn');
        if (skipBtn) skipBtn.remove();
    }

    updateHUD() {
        let hud = document.getElementById('gameHUD');

        if (!hud) {
            hud = document.createElement('div');
            hud.id = 'gameHUD';
            // Full width container at top
            hud.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                padding: 16px 24px;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                z-index: 1200;
                pointer-events: none;
                box-sizing: border-box;
            `;

            // Left Side: Buttons
            const leftSide = document.createElement('div');
            leftSide.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: auto;
            `;

            const buttonRow = document.createElement('div');
            buttonRow.style.cssText = `
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                align-items: center;
            `;

            // Helper for button style
            // We use a dedicated class for hover effects
            if (!document.getElementById('hud-btn-styles')) {
                const style = document.createElement('style');
                style.id = 'hud-btn-styles';
                style.textContent = `
                    .game-hud-btn {
                        background: #3b82f6 !important;
                        border: 1px solid #2563eb !important;
                        padding: 8px 16px;
                        border-radius: 12px;
                        font-family: 'Inter', sans-serif;
                        font-weight: 600;
                        font-size: 14px;
                        color: white !important;
                        cursor: pointer;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1);
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .game-hud-btn:hover {
                        transform: scale(1.1);
                        background: #2563eb !important;
                        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15);
                        z-index: 10;
                    }
                    .game-hud-btn:active {
                        transform: scale(0.95);
                    }
                `;
                document.head.appendChild(style);
            }

            const btnClass = 'game-hud-btn';

            // Main Menu Button
            const menuBtn = document.createElement('button');
            menuBtn.innerHTML = '<span style="font-size: 16px;">🏠</span> Main Menu';
            menuBtn.className = btnClass;
            menuBtn.onclick = async () => {
                if (await window.appConfirm('Return to Main Menu? Progress will be lost.', { title: 'Exit Game', confirmText: 'Exit' })) {
                    this.game.stop();
                }
            };
            buttonRow.appendChild(menuBtn);

            // Save/Load Button (New)
            const saveLoadBtn = document.createElement('button');
            saveLoadBtn.innerHTML = '<span style="font-size: 16px;">💾</span> Save/Load';
            saveLoadBtn.className = btnClass;
            saveLoadBtn.onclick = () => {
                this.openSaveLoadPanel();
            };
            buttonRow.appendChild(saveLoadBtn);

            // Settings Button
            const settingsBtn = document.createElement('button');
            settingsBtn.innerHTML = '<span style="font-size: 16px;">⚙️</span> Settings';
            settingsBtn.className = btnClass;
            settingsBtn.onclick = () => {
                window.appAlert('Settings menu coming soon!', { title: 'Settings' });
            };
            buttonRow.appendChild(settingsBtn);



            const totalStars = this.starRatings ? this.starRatings.reduce((a, b) => a + b, 0) : 0;
            const boxScoreBtn = document.createElement('button');
            boxScoreBtn.id = 'gameBoxScoreBtn';
            // "★ [Stars] Select Level" - Updated colors for white background
            boxScoreBtn.innerHTML = `<span style="font-size: 16px; color: #facc15;">★</span> <span style="font-weight: 800; color: white;">${totalStars}</span> &nbsp;Select Level`;
            boxScoreBtn.className = btnClass;
            // Add specific min-width
            boxScoreBtn.style.minWidth = '120px';
            boxScoreBtn.style.justifyContent = 'center';

            boxScoreBtn.onclick = () => {
                this.openBoxScore();
            };
            buttonRow.appendChild(boxScoreBtn);

            const gridLockWrapper = document.createElement('label');
            gridLockWrapper.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 14px;
                border-radius: 14px;
                background: rgba(255, 255, 255, 0.92);
                border: 1px solid rgba(226, 232, 240, 0.95);
                box-shadow: 0 6px 12px rgba(15, 23, 42, 0.08);
                font-family: 'Inter', sans-serif;
                font-size: 13px;
                font-weight: 700;
                color: #1f2937;
                pointer-events: auto;
                align-self: flex-start;
            `;

            const gridLockCheckbox = document.createElement('input');
            gridLockCheckbox.type = 'checkbox';
            gridLockCheckbox.id = 'gameGridLockToggle';
            gridLockCheckbox.style.cssText = `
                width: 18px;
                height: 18px;
                accent-color: #667eea;
                cursor: pointer;
            `;

            const gridLockText = document.createElement('span');
            gridLockText.textContent = 'Lock Grid (free click)';

            gridLockWrapper.appendChild(gridLockCheckbox);
            gridLockWrapper.appendChild(gridLockText);

            leftSide.appendChild(buttonRow);
            leftSide.appendChild(gridLockWrapper);

            hud.appendChild(leftSide);

            // Right Side: Stats Container
            const rightSide = document.createElement('div');
            rightSide.id = 'gameHUD_Stats';
            rightSide.style.cssText = `
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(8px);
                padding: 16px 20px;
                border-radius: 16px;
                border: 1px solid rgba(226, 232, 240, 0.9);
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: auto;
                min-width: 200px;
            `;
            hud.appendChild(rightSide);

            document.querySelector('.canvas-container').appendChild(hud);
        }

        // Filter out ghost pieces for accurate HUD count
        const rawPieces = this.app.polygons.filter(p => p.visible);
        const totalArea = rawPieces.reduce((sum, p) => sum + Math.abs(Geometry.getArea(p.vertices)), 0);
        const validPieces = rawPieces.filter(p => Math.abs(Geometry.getArea(p.vertices)) > (totalArea * 0.005));
        const piecesCount = validPieces.length;

        // --- Update Right Stats Content ---
        const rightSide = document.getElementById('gameHUD_Stats');
        if (rightSide) {
            rightSide.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 24px; font-family: 'Inter', sans-serif;">
                    <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Lines</span>
                    <span style="font-size: 16px; font-weight: 800; color: ${this.linesUsed > this.maxLines ? '#e11d48' : '#0f172a'}">${this.linesUsed} <span style="color: #94a3b8; font-weight: 600;">/</span> ${this.maxLines}</span>
                </div>
                <div style="width: 100%; height: 1px; background: #e2e8f0;"></div>
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 24px; font-family: 'Inter', sans-serif;">
                    <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Pieces</span>
                    <span style="font-size: 16px; font-weight: 800; color: ${piecesCount !== this.targetPieces ? '#0f172a' : '#16a34a'}">${piecesCount} <span style="color: #94a3b8; font-weight: 600;">/</span> ${this.targetPieces}</span>
                </div>
            `;
        }

        // Update Select Level Button Text (formerly Box Score)
        const boxScoreBtn = document.getElementById('gameBoxScoreBtn');
        if (boxScoreBtn) {
            const totalStars = this.starRatings ? this.starRatings.reduce((a, b) => a + b, 0) : 0;
            boxScoreBtn.innerHTML = `<span style="font-size: 16px; color: #facc15;">★</span> <span style="font-weight: 800; color: white;">${totalStars}</span> &nbsp;Select Level`;
        }

        const gridToggle = document.getElementById('gameGridLockToggle');
        if (gridToggle) {
            gridToggle.checked = this.gridFreeMode;
        }

        this.bindGridLockToggle();
    }

    bindGridLockToggle() {
        if (this.gridToggleBound) return;
        const gridToggle = document.getElementById('gameGridLockToggle');
        if (!gridToggle) return;

        gridToggle.checked = this.gridFreeMode;
        gridToggle.addEventListener('change', () => {
            this.gridFreeMode = gridToggle.checked;
            this.app.gridSnap = !this.gridFreeMode;
        });
        this.gridToggleBound = true;
    }

    bindGameControls() {
        if (this.controlsBound) return;
        const undoBtn = document.getElementById('gameUndoBtn');
        const redoBtn = document.getElementById('gameRedoBtn');
        const submitBtn = document.getElementById('gameSubmitBtn');

        if (undoBtn) undoBtn.addEventListener('click', () => this.handleUndo());
        if (redoBtn) redoBtn.addEventListener('click', () => this.handleRedo());
        if (submitBtn) submitBtn.addEventListener('click', () => this.submitSolution());

        const retryBtn = document.getElementById('gameResultsRetry');
        const nextBtn = document.getElementById('gameResultsNext');
        const menuBtn = document.getElementById('gameResultsMenu');

        if (retryBtn) retryBtn.addEventListener('click', () => {
            this.hideResultsOverlay();
            this.loadLevel(this.currentLevelIndex);
        });
        if (nextBtn) nextBtn.addEventListener('click', () => {
            if (this.lastResult && this.lastResult.coins > 0) {
                this.hideResultsOverlay();
                this.loadLevel(this.currentLevelIndex + 1);
            }
        });
        if (menuBtn) menuBtn.addEventListener('click', () => {
            this.hideResultsOverlay();
            this.game.stop();

            const menuOverlay = document.getElementById('mainMenuOverlay');
            if (menuOverlay) {
                menuOverlay.style.display = 'flex';
                menuOverlay.classList.remove('hidden');
            }

            if (typeof window.playBackgroundMusic === 'function') {
                window.playBackgroundMusic();
            }
        });

        this.controlsBound = true;
    }

    updateGameControlButtons() {
        const undoBtn = document.getElementById('gameUndoBtn');
        const redoBtn = document.getElementById('gameRedoBtn');
        const submitBtn = document.getElementById('gameSubmitBtn');

        if (undoBtn) undoBtn.disabled = this.lineHistory.length === 0;
        if (redoBtn) redoBtn.disabled = this.redoLineHistory.length === 0;

        if (submitBtn) {
            const linesRequirementMet = this.linesUsed >= this.maxLines;
            submitBtn.disabled = !linesRequirementMet;

            if (linesRequirementMet) {
                submitBtn.classList.add('submit-ready');
                submitBtn.style.cursor = 'pointer';
                submitBtn.title = "Submit Solution!";
            } else {
                submitBtn.classList.remove('submit-ready');
                submitBtn.style.cursor = 'not-allowed';
                submitBtn.title = `Use ${this.maxLines - this.linesUsed} more lines to submit`;
            }
        }
    }

    handleUndo() {
        if (this.lineHistory.length === 0) return;
        const previousIndex = this.app.historyIndex;
        this.app.undo();

        if (this.app.historyIndex < previousIndex) {
            this.redoLineHistory.push(this.lineHistory.pop());
            this.linesUsed = this.lineHistory.length;
            this.updateHUD();
            this.updateGameControlButtons();
            this.autosaveProgress();
        }
    }

    handleRedo() {
        if (this.redoLineHistory.length === 0) return;
        const previousIndex = this.app.historyIndex;
        this.app.redo();

        if (this.app.historyIndex > previousIndex) {
            this.lineHistory.push(this.redoLineHistory.pop());
            this.linesUsed = this.lineHistory.length;
            this.updateHUD();
            this.updateGameControlButtons();
            this.autosaveProgress();
        }
    }

    levelComplete() {
        this.showMessage('Level Complete!', 'Great job! You made a perfect split.', 'Next Level', () => {
            this.game.score += 100;
            this.loadLevel(this.currentLevelIndex + 1);
        });
    }

    levelFailed() {
        this.levelFailCount++; // Safety Count
        this.showMessage('Level Failed', 'That split didn\'t quite work. Try again!', 'Retry', () => {
            this.loadLevel(this.currentLevelIndex);
        });
    }

    submitSolution() {
        const evaluation = this.evaluateSolution();
        this.lastResult = evaluation;
        this.showResultsOverlay(evaluation);
    }

    ensureAudioContext() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioCtx = new AudioContext();
            }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    playResultSound(isVictory) {
        const soundFile = isVictory ? 'Music/victory.mp3' : 'Music/failed.mp3';
        const audio = new Audio(soundFile);
        audio.volume = 0.6;
        audio.play().catch(e => console.warn('Audio playback failed:', e));
    }

    evaluateSolution() {
        const rawPieces = this.app.polygons.filter(p => p.visible);
        const rawTotalArea = rawPieces.reduce((sum, poly) => sum + Math.abs(Geometry.getArea(poly.vertices)), 0);

        const pieces = rawPieces.filter(p => {
            const area = Math.abs(Geometry.getArea(p.vertices));
            return area > (rawTotalArea * 0.005);
        });

        const totalArea = rawTotalArea;
        const targetArea = totalArea / this.targetPieces;
        const pieceAreas = pieces.map(p => Math.abs(Geometry.getArea(p.vertices)));
        const piecePercents = totalArea > 0
            ? pieceAreas.map(a => (a / totalArea) * 100)
            : pieceAreas.map(() => 0);
        const pieceErrors = targetArea > 0
            ? pieceAreas.map(a => Math.abs(a - targetArea) / targetArea)
            : pieceAreas.map(() => 1);

        const maxError = pieceErrors.length > 0 ? Math.max(...pieceErrors) : 1;
        const cutLimitExceeded = this.linesUsed > this.maxLines;
        const wrongPieceCount = pieces.length !== this.targetPieces;

        let allSimilar = false;
        if (!wrongPieceCount && pieces.length > 1) {
            const first = pieces[0].vertices;
            allSimilar = pieces.slice(1).every(p => Geometry.isGeometricallySimilar(first, p.vertices, 0.05));
        }

        let coins = 0;
        let isPerfectSymmetry = false;

        if (!cutLimitExceeded && !wrongPieceCount) {
            if (maxError <= 0.06) {
                coins = 3;
            } else if (maxError <= 0.12) {
                coins = 2;
            } else if (maxError <= 0.18) {
                coins = 1;
            }

            if (allSimilar && coins >= 2) {
                coins = 3;
                isPerfectSymmetry = true;
            }
        }

        let failureReason = '';
        if (cutLimitExceeded) {
            failureReason = 'Exceeded allowed number of cuts.';
        } else if (wrongPieceCount) {
            failureReason = `Needed ${this.targetPieces} pieces, but you created ${pieces.length}.`;
        } else if (coins === 0) {
            failureReason = 'Pieces are too uneven in area.';
        }

        return {
            pieces, piecePercents, coins, maxError, cutLimitExceeded, wrongPieceCount, failureReason, isPerfectSymmetry
        };
    }

    showResultsOverlay(result) {
        const overlay = document.getElementById('gameResultsOverlay');
        if (!overlay) return;

        const panel = document.getElementById('gameResultsPanel');
        const title = document.getElementById('gameResultsTitle');
        const subtitle = document.getElementById('gameResultsSubtitle');
        const badges = document.getElementById('gameResultsBadges');
        const coin = document.getElementById('gameResultsCoin');
        const reason = document.getElementById('gameResultsReason');
        const list = document.getElementById('gameResultsPieces');
        const nextBtn = document.getElementById('gameResultsNext');
        const menuBtn = document.getElementById('gameResultsMenu');
        const sticker = document.getElementById('gameResultsSticker');

        const isVictory = result.coins > 0;
        if (isVictory) {
            this.recordStarRating(result.coins, result);
        }
        if (panel) {
            panel.classList.toggle('victory', isVictory);
            panel.classList.toggle('failed', !isVictory);
        }
        if (title) title.innerHTML = isVictory ? '<span>Victory!</span>' : '<span>Failed</span>';
        if (subtitle) {
            subtitle.textContent = isVictory
                ? 'You nailed it! Great split skills!'
                : 'Almost there — give it another try!';
        }
        if (sticker) {
            sticker.textContent = isVictory ? '🎉 Awesome!' : '💪 You got this!';
        }
        if (badges) {
            badges.innerHTML = isVictory
                ? '<span class="game-results-badge">🏆 Level Clear</span><span class="game-results-badge">✨ Star Power</span><span class="game-results-badge">🎯 Nice Cuts</span>'
                : '<span class="game-results-badge">🧩 Practice Time</span><span class="game-results-badge">🌈 Keep Trying</span>';
        }




        const starContainer = document.getElementById('gameResultsStars');
        if (starContainer) {
            starContainer.innerHTML = '';
            if (isVictory) {
                const starCount = result.coins || 0;
                for (let i = 1; i <= 3; i++) {
                    const star = document.createElement('span');
                    star.textContent = '★';
                    if (i > starCount) {
                        star.style.opacity = '0.2';
                        star.style.color = '#cbd5e1'; // Slate-300 for empty
                    }
                    starContainer.appendChild(star);
                }
                starContainer.style.display = 'flex';

                // Show Total Stars as well
                const totalStars = this.starRatings.reduce((a, b) => a + b, 0);
                const totalText = document.createElement('div');
                totalText.style.cssText = `
                    width: 100%; text-align: center; font-size: 14px; 
                    color: #64748b; font-weight: 600; margin-top: 4px;
                `;
                totalText.innerHTML = `Total Score: <span style="color: #f59e0b;">★ ${totalStars}</span>`;
                starContainer.appendChild(totalText);
                starContainer.style.flexWrap = 'wrap';

                // Update box score button in background immediately
                this.updateHUD();
            } else {
                starContainer.style.display = 'none';
            }
        }

        if (coin) {
            // User requested to remove diamond/text and use visual stars instead
            coin.style.display = 'none';
            coin.innerHTML = '';
        }

        if (reason) {
            reason.textContent = result.failureReason || '';
            reason.style.display = isVictory ? 'none' : 'block';
        }

        if (list) {
            list.innerHTML = '';
            result.piecePercents.forEach((percent, index) => {
                const item = document.createElement('div');
                item.textContent = `Piece ${index + 1}: ${percent.toFixed(1)}%`;
                list.appendChild(item);
            });
        }

        if (nextBtn) {
            nextBtn.style.display = isVictory ? 'inline-flex' : 'none';
            nextBtn.disabled = !isVictory;
        }
        if (menuBtn) {
            menuBtn.style.display = isVictory ? 'none' : 'inline-flex';
        }

        overlay.style.display = 'flex';
        this.renderResultsCanvas(result);
        this.playResultSound(isVictory);
        this.autosaveProgress();
    }

    hideResultsOverlay() {
        const overlay = document.getElementById('gameResultsOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    renderResultsCanvas(result) {
        const pieces = result.pieces;
        const percents = result.piecePercents;

        const canvas = document.getElementById('gameResultsCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, rect.width, rect.height);
        if (!pieces || pieces.length === 0) return;

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        pieces.forEach(poly => {
            poly.vertices.forEach(v => {
                minX = Math.min(minX, v.x);
                maxX = Math.max(maxX, v.x);
                minY = Math.min(minY, v.y);
                maxY = Math.max(maxY, v.y);
            });
        });

        const padding = 20;
        const width = maxX - minX || 1;
        const height = maxY - minY || 1;
        const scale = Math.min((rect.width - padding * 2) / width, (rect.height - padding * 2) / height);

        ctx.save();
        ctx.translate(rect.width / 2, rect.height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-(minX + maxX) / 2, -(minY + maxY) / 2);

        pieces.forEach((poly, index) => {
            const verts = poly.vertices;
            if (verts.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(verts[0].x, verts[0].y);
            for (let i = 1; i < verts.length; i++) {
                ctx.lineTo(verts[i].x, verts[i].y);
            }
            ctx.closePath();
            ctx.fillStyle = `${poly.color}55`;
            ctx.fill();
            ctx.strokeStyle = poly.color;
            ctx.lineWidth = 2 / scale;
            ctx.stroke();

            if (percents && percents[index] !== undefined) {
                const center = Geometry.getPolygonCenter(verts);
                ctx.save();
                ctx.fillStyle = '#1e293b';
                ctx.font = `bold ${16 / scale}px 'Inter', sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.lineWidth = 3 / scale;
                const text = `${Math.round(percents[index])}%`;
                ctx.strokeText(text, center.x, center.y);
                ctx.fillText(text, center.x, center.y);
                ctx.restore();
            }
        });

        ctx.restore();
    }

    async showMessage(title, body, btnText, callback) {
        await window.appAlert(body, { title, confirmText: btnText || 'OK' });
        if (callback) callback();
    }
}

// --- HIDDEN DEVELOPER MANAGER ---
class DevManager {
    constructor(game) {
        this.game = game;
        this.isVisible = false;
        this.panel = null;
        this.setupListener();
    }

    setupListener() {
        // Toggle with Ctrl + Shift + D
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
                e.preventDefault();
                this.toggle();
            }
        });
        // Console access
        window.enableDevMode = () => this.toggle();
    }

    toggle() {
        this.isVisible = !this.isVisible;
        if (this.isVisible) {
            this.render();
            // Toast - Moved to bottom center to avoid top-right UI (HUD, etc)
            const toast = document.createElement('div');
            toast.textContent = "💻 Developer Mode Enabled";
            toast.style.cssText = `
                position: fixed; 
                bottom: 30px; 
                left: 50%; 
                transform: translateX(-50%);
                background: rgba(16, 185, 129, 0.95); 
                color: white; 
                padding: 10px 24px; 
                border-radius: 50px; 
                z-index: 20000; 
                font-family: 'Inter', sans-serif; 
                font-weight: 600;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: fadeOut 2s forwards 2s;
                pointer-events: none;
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 4100);
        } else {
            this.hide();
        }
    }

    hide() {
        if (this.panel) this.panel.style.display = 'none';
        this.isVisible = false;
    }

    render() {
        if (!this.panel) {
            this.createPanel();
        }
        this.populateList();
        this.panel.style.display = 'flex';
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'devManagerPanel';
        this.panel.style.cssText = `
            position: fixed;
            top: 100px; /* Lower than top bar */
            right: 20px;
            width: 280px;
            max-height: calc(100vh - 140px); /* Prevent bleeding off bottom */
            bottom: auto;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid #334155;
            border-radius: 12px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            box-shadow: -10px 0 30px rgba(0,0,0,0.5);
            font-family: 'Inter', sans-serif;
            color: white;
            padding: 16px;
        `;

        const header = document.createElement('div');
        header.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h3 style="margin:0; font-size:18px; color:#38bdf8;">Dev Manager</h3>
                <button id="devCloseBtn" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:20px;">×</button>
            </div>
            <div style="font-size:12px; color:#94a3b8; margin-bottom:12px;">
                Select a level to instantly load it.
            </div>
        `;
        this.panel.appendChild(header);

        this.levelList = document.createElement('div');
        this.levelList.style.cssText = `
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding-right: 4px;
        `;
        // Custom Scrollbar
        const style = document.createElement('style');
        style.textContent = `
            #devManagerPanel ::-webkit-scrollbar { width: 6px; }
            #devManagerPanel ::-webkit-scrollbar-track { background: #1e293b; }
            #devManagerPanel ::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
        `;
        this.panel.appendChild(style);
        this.panel.appendChild(this.levelList);

        document.body.appendChild(this.panel);

        document.getElementById('devCloseBtn').onclick = () => this.hide();
    }

    populateList() {
        this.levelList.innerHTML = '';
        this.game.levels.forEach((level, index) => {
            const btn = document.createElement('button');
            const isActive = this.game.currentMode && this.game.currentMode.currentLevelIndex === index;

            btn.style.cssText = `
                background: ${isActive ? '#0ea5e9' : '#1e293b'};
                border: 1px solid ${isActive ? '#38bdf8' : '#334155'};
                color: ${isActive ? 'white' : '#cbd5e1'};
                padding: 10px;
                border-radius: 6px;
                text-align: left;
                cursor: pointer;
                font-family: monospace;
                font-size: 13px;
                transition: all 0.2s;
                display:flex; justify-content:space-between;
            `;
            btn.innerHTML = `
                <span>#${level.id} ${level.name}</span>
                <span style="opacity:0.6; font-size:11px;">${level.targetPieces}pcs</span>
            `;

            btn.onmouseover = () => {
                if (!isActive) btn.style.background = '#334155';
            };
            btn.onmouseout = () => {
                if (!isActive) btn.style.background = '#1e293b';
            };
            btn.onclick = () => {
                this.loadLevel(index);
                this.populateList(); // Refresh active state
            };

            this.levelList.appendChild(btn);
        });
    }

    loadLevel(index) {
        if (this.game.state !== GameState.PLAYING) {
            this.game.startMode('beginner');
        }
        if (this.game.currentMode) {
            this.game.currentMode.loadLevel(index);
            // Close panel on mobile, keep open on desktop
            if (window.innerWidth < 768) this.hide();
        }
    }
}
