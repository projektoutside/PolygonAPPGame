/**
 * Tutorial System
 * 
 * Interactive tutorial overlay that guides new players through
 * the game mechanics with animated demonstrations.
 */

class Tutorial {
    constructor() {
        this.currentStep = 0;
        this.overlay = null;
        this.currentAudio = null;
        this.currentAudioStep = -1;
        this.audioPlayToken = 0;
        this.initialized = false;
        this.preloaded = false;
        this.audioPreloaded = false;
        this.audioFiles = [
            'Music/Tutorial1.mp3',
            'Music/Tutorial2.mp3',
            'Music/Tutorial3.mp3',
            'Music/Tutorial4.mp3'
        ];
        this.preloadedAudio = new Map();
        this.linesInterval = null;
        this.steps = [
            {
                id: 'goal',
                title: "Your Mission",
                text: "Cut the shape into the correct number of pieces shown in the target.",
                setup: (container) => this.setupGoalScene(container)
            },
            {
                id: 'lines',
                title: "Watch Your Cuts",
                text: "You must use exactly the number of lines provided. You may not use any more or less than that number.",
                setup: (container) => this.setupLinesScene(container)
            },
            {
                id: 'slice',
                title: "How to Slice",
                text: "Click and drag across the shape to create a cut line.",
                setup: (container) => this.setupSliceScene(container)
            },
            {
                id: 'win',
                title: "Victory",
                text: "When you match the target, hit the Submit button to win!",
                setup: (container) => this.setupWinScene(container)
            }
        ];
        
        this._log('Tutorial instance created');
    }
    
    _log(msg, type = 'info') {
        const prefix = '[Tutorial]';
        if (type === 'error') {
            console.error(prefix, msg);
        } else if (type === 'warn') {
            console.warn(prefix, msg);
        } else {
            console.log(prefix, msg);
        }
        
        // Also log to MobileDebug if available
        if (window.MobileDebug && typeof window.MobileDebug.add === 'function') {
            window.MobileDebug.add(`Tutorial: ${msg}`, type);
        }
    }

    /**
     * Force reset the tutorial state for clean re-initialization
     */
    reset() {
        this._log('Resetting tutorial state');
        this.stopAudio();
        this.cleanup();
        
        // Remove any existing overlay
        const existingOverlay = document.getElementById('tutorialOverlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        this.overlay = null;
        this.initialized = false;
        this.currentStep = 0;
    }
    
    /**
     * Clean up intervals and timeouts
     */
    cleanup() {
        if (this.linesInterval) {
            clearTimeout(this.linesInterval);
            this.linesInterval = null;
        }
    }

    preloadAudio() {
        if (this.audioPreloaded) return;

        this._log('Preloading tutorial audio files');
        this.audioFiles.forEach((path) => {
            try {
                const audio = new Audio(path);
                audio.preload = 'auto';
                audio.load();
                this.preloadedAudio.set(path, audio);
            } catch (e) {
                this._log(`Audio preload failed for ${path}: ${e.message}`, 'warn');
            }
        });

        this.audioPreloaded = true;
    }

    init() {
        this._log(`init() called, initialized=${this.initialized}`);
        
        // Check if there's an existing overlay
        const existingOverlay = document.getElementById('tutorialOverlay');
        if (existingOverlay) {
            this._log('Existing overlay found, removing for fresh init');
            existingOverlay.remove();
            this.overlay = null;
            this.initialized = false;
        }
        
        if (this.initialized) {
            this._log('Already initialized, skipping');
            return;
        }
        
        this.initialized = true;

        if (this.preloaded) {
            const existingStyle = document.querySelector('style[data-tutorial-style="true"]');
            if (!existingStyle) {
                this.preloaded = false;
            }
        }

        if (!this.preloaded) {
            this.preloadStyles();
        }

        this.preloadAudio();

        this.createOverlay();
        this._log('init() complete');
    }

    preloadStyles() {
        if (this.preloaded) return;
        
        this._log('Preloading styles');
        const style = document.createElement('style');
        style.setAttribute('data-tutorial-style', 'true');
        style.textContent = `
            .tut-overlay {
                position: fixed; inset: 0; background: rgba(15, 23, 42, 0.9);
                backdrop-filter: blur(10px); z-index: 99999;
                display: flex; align-items: center; justify-content: center;
                font-family: 'Inter', system-ui, sans-serif;
                animation: tutFadeIn 0.4s ease-out;
                /* Mobile-specific fixes */
                -webkit-overflow-scrolling: touch;
                touch-action: manipulation;
            }
            @keyframes tutFadeIn { from { opacity: 0; } to { opacity: 1; } }

            .tut-card {
                background: white; width: 90%; max-width: 800px;
                max-height: 90vh;
                border-radius: 24px; overflow: hidden;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                display: flex; flex-direction: column;
                position: relative;
            }
            
            /* Mobile adjustments */
            @media (max-width: 768px) {
                .tut-card {
                    width: 95%;
                    max-height: 85vh;
                    border-radius: 16px;
                }
                .tut-stage {
                    height: 200px !important;
                }
                .tut-content {
                    padding: 16px !important;
                }
                .tut-title {
                    font-size: 22px !important;
                }
                .tut-desc {
                    font-size: 15px !important;
                }
                .tut-footer {
                    padding: 16px !important;
                    flex-wrap: wrap;
                    gap: 10px;
                }
                .tut-btn {
                    padding: 10px 20px !important;
                    font-size: 14px !important;
                    /* Ensure touch targets are at least 44px */
                    min-height: 44px;
                }
            }

            .tut-stage {
                height: 360px; background: #f1f5f9;
                position: relative; overflow: hidden;
                display: flex; align-items: center; justify-content: center;
                border-bottom: 1px solid #e2e8f0;
                background-image: linear-gradient(#cbd5e1 1px, transparent 1px),
                                linear-gradient(90deg, #cbd5e1 1px, transparent 1px);
                background-size: 40px 40px;
            }
            .tut-stage::after {
                content: ''; position: absolute; inset: 0;
                background: radial-gradient(circle at center, transparent 30%, rgba(241, 245, 249, 0.8) 100%);
                pointer-events: none;
            }

            .tut-content { padding: 32px; text-align: center; }
            .tut-title { 
                font-size: 28px; font-weight: 800; color: #1e293b; margin: 0 0 12px 0;
                background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .tut-desc { font-size: 18px; color: #64748b; line-height: 1.6; max-width: 600px; margin: 0 auto; }

            .tut-footer {
                padding: 24px 32px; border-top: 1px solid #f1f5f9;
                display: flex; justify-content: space-between; align-items: center;
                background: #fff;
            }

            .tut-btn {
                padding: 12px 28px; border-radius: 12px; font-weight: 700; cursor: pointer;
                border: none; transition: all 0.2s; font-size: 16px;
                /* Touch-friendly */
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
                user-select: none;
            }
            .tut-btn-primary {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
            }
            .tut-btn-primary:hover, .tut-btn-primary:active { 
                transform: translateY(-2px); 
                box-shadow: 0 8px 16px rgba(37, 99, 235, 0.3); 
            }
            
            .tut-btn-text { background: transparent; color: #94a3b8; }
            .tut-btn-text:hover, .tut-btn-text:active { color: #64748b; background: #f8fafc; }

            .tut-dots { display: flex; gap: 8px; }
            .tut-dot { width: 10px; height: 10px; border-radius: 5px; background: #e2e8f0; transition: all 0.3s; }
            .tut-dot.active { width: 30px; background: #3b82f6; }

            /* --- SCENE ELEMENTS --- */
            
            .tut-shape {
                position: absolute; left: 50%; top: 50%;
                transform: translate(-50%, -50%);
                filter: drop-shadow(0 10px 15px rgba(59, 130, 246, 0.2));
                z-index: 1;
            }
            .tut-shape path {
                fill: rgba(96, 165, 250, 0.2);
                stroke: #3b82f6; stroke-width: 3;
                vector-effect: non-scaling-stroke;
            }

            .tut-ui-target, .tut-ui-lines {
                position: absolute; top: 20px;
                background: white; padding: 10px 20px; border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                font-weight: 700; color: #475569; border: 1px solid #e2e8f0;
                display: flex; align-items: center; gap: 8px; z-index: 10;
            }
            .tut-ui-target { right: 20px; }
            .tut-ui-lines { left: 20px; }
            
            .tut-spotlight {
                position: absolute; inset: -100px;
                background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), transparent 80px, rgba(15, 23, 42, 0.6) 120px);
                opacity: 0; pointer-events: none; transition: opacity 0.5s; z-index: 5;
            }

            .tut-cursor {
                width: 32px; height: 32px;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath fill='white' stroke='black' stroke-width='2' d='M8 2l7 16 3.5-6.5L22 10 8 2z'/%3E%3C/svg%3E");
                position: absolute; z-index: 20;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
                top: 0; left: 0; opacity: 0;
            }

            @keyframes pulse-attention {
                0%, 100% { transform: scale(1); box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-color: #e2e8f0; }
                50% { transform: scale(1.1); box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); border-color: #3b82f6; }
            }

             @keyframes pulse-lines-red {
                0%, 100% { transform: scale(1); border-color: #e2e8f0; color: #475569; }
                50% { transform: scale(1.1); border-color: #ef4444; color: #ef4444; box-shadow: 0 0 15px rgba(239, 68, 68, 0.3); }
            }

            .tut-cut-line {
                position: absolute; background: #22c55e; height: 3px;
                transform-origin: left; opacity: 0; z-index: 15;
                box-shadow: 0 0 10px #22c55e;
            }
            
            @keyframes cursor-slice-demo {
                0% { opacity: 0; transform: translate(300px, 100px); }
                10% { opacity: 1; transform: translate(300px, 100px); }
                25% { transform: translate(400px, 50px); }
                30% { transform: translate(400px, 50px) scale(0.9); }
                60% { transform: translate(400px, 300px) scale(0.9); }
                70% { transform: translate(400px, 300px) scale(1); }
                80% { opacity: 1; }
                100% { opacity: 0; }
            }

            .tut-piece { transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
            
            @keyframes confetti-pop {
                0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                50% { opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
            }

        `;
        document.head.appendChild(style);
        this.preloaded = true;
    }

    createOverlay() {
        this._log('Creating overlay');
        
        this.overlay = document.createElement('div');
        this.overlay.className = 'tut-overlay';
        this.overlay.id = 'tutorialOverlay';
        
        // Create card content
        this.overlay.innerHTML = `
            <div class="tut-card">
                <div class="tut-stage" id="tutStage">
                    <!-- Scene content injected here -->
                </div>
                <div class="tut-content">
                    <h2 class="tut-title" id="tutTitle"></h2>
                    <p class="tut-desc" id="tutDesc"></p>
                </div>
                <div class="tut-footer">
                    <button class="tut-btn tut-btn-text" id="tutSkipBtn">Skip</button>
                    <div class="tut-dots" id="tutDots"></div>
                    <button class="tut-btn tut-btn-primary" id="tutNextBtn">Next Step</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.overlay);
        
        // Force visibility (mobile fix)
        this.overlay.style.display = 'flex';
        this.overlay.style.visibility = 'visible';
        this.overlay.style.opacity = '1';
        
        // Attach mobile-friendly button handlers
        this._attachButtonHandlers();
        
        this.showStep(0);
        this._log('Overlay created and shown');
    }
    
    /**
     * Attach touch-friendly button handlers
     */
    _attachButtonHandlers() {
        const skipBtn = document.getElementById('tutSkipBtn');
        const nextBtn = document.getElementById('tutNextBtn');
        
        if (skipBtn) {
            this._addMobileHandler(skipBtn, () => this.skip());
        }
        
        if (nextBtn) {
            this._addMobileHandler(nextBtn, () => this.next());
        }
    }
    
    /**
     * Add mobile-friendly click/touch handler
     */
    _addMobileHandler(element, handler) {
        if (!element || element.dataset.tutorialHandlerAttached === 'true') {
            return;
        }

        let lastTime = 0;
        const DEBOUNCE = 300;
        
        const wrappedHandler = (e) => {
            const now = Date.now();
            if (now - lastTime < DEBOUNCE) return;
            lastTime = now;
            
            this._log(`Button pressed: ${element.id || element.className}`);
            handler();
        };
        
        // Use pointer events if available
        if ('PointerEvent' in window) {
            element.addEventListener('pointerup', wrappedHandler, { passive: true });
        } else {
            element.addEventListener('touchend', (e) => {
                e.preventDefault();
                wrappedHandler(e);
            }, { passive: false });
            element.addEventListener('click', wrappedHandler);
        }

        element.dataset.tutorialHandlerAttached = 'true';
    }

    showStep(index) {
        this._log(`showStep(${index})`);
        
        // Play audio (non-blocking)
        this.playAudio(index);
        
        this.currentStep = index;
        const step = this.steps[index];
        
        if (!step) {
            this._log(`Invalid step index: ${index}`, 'error');
            return;
        }
        
        const stage = document.getElementById('tutStage');
        const title = document.getElementById('tutTitle');
        const desc = document.getElementById('tutDesc');
        const nextBtn = document.getElementById('tutNextBtn');
        const dots = document.getElementById('tutDots');
        
        if (!stage || !title || !desc || !nextBtn || !dots) {
            this._log('Tutorial DOM elements not found', 'error');
            return;
        }

        // Update text
        title.textContent = step.title;
        desc.textContent = step.text;
        nextBtn.textContent = index === this.steps.length - 1 ? 'Start Playing' : 'Next Step';

        // Update dots
        dots.innerHTML = this.steps.map((_, i) =>
            `<div class="tut-dot ${i === index ? 'active' : ''}"></div>`
        ).join('');

        // Clear and setup stage
        this.cleanup();
        stage.innerHTML = '';
        
        try {
            step.setup(stage);
        } catch (e) {
            this._log(`Step setup error: ${e.message}`, 'error');
        }
    }

    next() {
        this._log('next() called');
        if (this.currentStep < this.steps.length - 1) {
            this.showStep(this.currentStep + 1);
        } else {
            this.skip();
        }
    }

    skip() {
        this._log('skip() called');
        this.stopAudio();
        this.cleanup();
        
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        
        this.initialized = false;
        
        // Mark tutorial as seen
        try {
            localStorage.setItem('tutorial_seen', 'true');
        } catch (e) {
            this._log('Could not save tutorial_seen to localStorage', 'warn');
        }
        
        // Only auto-start game when explicitly allowed by the caller.
        // This prevents stale tutorial overlay interactions from re-entering
        // Beginner mode after returning to Main Menu.
        const allowAutoStart = window.__allowTutorialToStartGame === true;

        // Consume the flag so a stale/delayed tutorial action can't retrigger start.
        window.__allowTutorialToStartGame = false;

        if (allowAutoStart && window.game && window.game.state === 'menu') {
            this._log('Starting game after tutorial skip (allowed)');
            window.game.startMode('beginner');
        } else {
            this._log('Tutorial skip completed without auto-start', 'info');
        }
    }

    stopAudio() {
        this.audioPlayToken++;

        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
            } catch (e) {
                // Ignore audio errors
            }
            this.currentAudio = null;
        }

        this.currentAudioStep = -1;
    }

    playAudio(index) {
        this.stopAudio();

        const audioPath = this.audioFiles[index];
        if (!audioPath) {
            this._log(`No tutorial audio mapped for step ${index}`, 'warn');
            return;
        }

        const playToken = this.audioPlayToken;
        this.currentAudioStep = index;
        this._log(`Playing audio: ${audioPath}`);

        try {
            const preloaded = this.preloadedAudio.get(audioPath);
            this.currentAudio = preloaded ? preloaded.cloneNode(true) : new Audio(audioPath);
            this.currentAudio.preload = 'auto';
            this.currentAudio.currentTime = 0;

            this.currentAudio.play().catch(e => {
                if (playToken !== this.audioPlayToken) {
                    return;
                }
                // Audio autoplay blocked - this is expected on mobile
                this._log(`Audio blocked (expected on mobile): ${e.message}`, 'warn');
            });
        } catch (e) {
            this._log(`Audio creation error: ${e.message}`, 'warn');
        }
    }

    /* --- SCENE GENERATORS --- */

    setupGoalScene(container) {
        const spotlight = document.createElement('div');
        spotlight.className = 'tut-spotlight';
        spotlight.style.setProperty('--x', '80%');
        spotlight.style.setProperty('--y', '20%');
        spotlight.style.opacity = '1';

        const targetUI = document.createElement('div');
        targetUI.className = 'tut-ui-target';
        targetUI.innerHTML = '<span>🎯</span> Target: 2 Pieces';
        targetUI.style.animation = 'pulse-attention 1.5s infinite';

        const shape = this.createSVGShape();
        shape.style.opacity = '0.5';

        container.appendChild(spotlight);
        container.appendChild(targetUI);
        container.appendChild(shape);
    }

    setupLinesScene(container) {
        const spotlight = document.createElement('div');
        spotlight.className = 'tut-spotlight';
        spotlight.style.setProperty('--x', '20%');
        spotlight.style.setProperty('--y', '20%');
        spotlight.style.opacity = '1';

        const linesUI = document.createElement('div');
        linesUI.className = 'tut-ui-lines';
        linesUI.innerHTML = '<span>✂️</span> Lines: <span id="demoLinesVal">1</span>';
        linesUI.style.animation = 'pulse-attention 1.5s infinite';

        const shape = this.createSVGShape();
        const cursor = document.createElement('div');
        cursor.className = 'tut-cursor';
        const line = document.createElement('div');
        line.className = 'tut-cut-line';

        container.appendChild(spotlight);
        container.appendChild(linesUI);
        container.appendChild(shape);
        container.appendChild(line);
        container.appendChild(cursor);

        // Get container dimensions with fallback
        const box = container.getBoundingClientRect();
        const startX = Math.max(box.width * 0.5, 100);
        const startY = Math.max(box.height * 0.15, 30);
        const endY = Math.max(box.height * 0.85, 150);

        // Cursor animation
        try {
            cursor.animate([
                { opacity: 0, transform: `translate(${startX}px, ${startY - 50}px)` },
                { opacity: 1, transform: `translate(${startX}px, ${startY - 50}px)`, offset: 0.1 },
                { transform: `translate(${startX}px, ${startY}px)`, offset: 0.2 },
                { transform: `translate(${startX}px, ${endY}px) scale(0.8)`, offset: 0.6 },
                { transform: `translate(${startX}px, ${endY}px) scale(1)`, offset: 0.7 },
                { opacity: 0, offset: 0.8 }
            ], {
                duration: 3000,
                iterations: Infinity
            });

            // Line animation
            line.animate([
                { height: '0px', width: '2px', top: `${startY}px`, left: `${startX}px`, opacity: 0 },
                { height: '0px', width: '2px', top: `${startY}px`, left: `${startX}px`, opacity: 1, offset: 0.2 },
                { height: `${endY - startY}px`, width: '2px', top: `${startY}px`, left: `${startX}px`, opacity: 1, offset: 0.6 },
                { opacity: 0, offset: 0.75 }
            ], {
                duration: 3000,
                iterations: Infinity
            });
        } catch (e) {
            this._log(`Animation error: ${e.message}`, 'warn');
        }

        // Update loop for line counter
        const updateLoop = () => {
            if (!document.body.contains(linesUI)) return;
            
            const valSpan = document.getElementById('demoLinesVal');
            if (!valSpan) return;
            
            valSpan.textContent = "1";
            valSpan.style.color = "inherit";
            linesUI.style.animation = 'pulse-attention 1.5s infinite';

            setTimeout(() => {
                if (!document.body.contains(linesUI)) return;
                const valSpan = document.getElementById('demoLinesVal');
                if (!valSpan) return;
                
                valSpan.textContent = "0";
                valSpan.style.color = "#ef4444";
                linesUI.style.animation = 'pulse-lines-red 0.5s';
            }, 1800);

            this.linesInterval = setTimeout(updateLoop, 3000);
        };
        updateLoop();
    }

    setupSliceScene(container) {
        const shape = this.createSVGShape();
        const cursor = document.createElement('div');
        cursor.className = 'tut-cursor';
        const line = document.createElement('div');
        line.className = 'tut-cut-line';

        container.appendChild(shape);
        container.appendChild(line);
        container.appendChild(cursor);

        const box = container.getBoundingClientRect();
        const startX = Math.max(box.width * 0.5, 100);
        const startY = Math.max(box.height * 0.15, 30);
        const endY = Math.max(box.height * 0.85, 150);

        try {
            cursor.animate([
                { opacity: 0, transform: `translate(${startX}px, ${startY - 50}px)` },
                { opacity: 1, transform: `translate(${startX}px, ${startY - 50}px)`, offset: 0.1 },
                { transform: `translate(${startX}px, ${startY}px)`, offset: 0.2 },
                { transform: `translate(${startX}px, ${startY}px) scale(0.8)`, offset: 0.25 },
                { transform: `translate(${startX}px, ${endY}px) scale(0.8)`, offset: 0.6 },
                { transform: `translate(${startX}px, ${endY}px) scale(1)`, offset: 0.7 },
                { opacity: 0, offset: 0.8 }
            ], {
                duration: 2500,
                iterations: Infinity
            });

            line.animate([
                { height: '0px', width: '2px', top: `${startY}px`, left: `${startX}px`, opacity: 0 },
                { height: '0px', width: '2px', top: `${startY}px`, left: `${startX}px`, opacity: 1, offset: 0.25 },
                { height: `${endY - startY}px`, width: '2px', top: `${startY}px`, left: `${startX}px`, opacity: 1, offset: 0.6 },
                { opacity: 0, offset: 0.75 }
            ], {
                duration: 2500,
                iterations: Infinity
            });
        } catch (e) {
            this._log(`Animation error: ${e.message}`, 'warn');
        }
    }

    setupWinScene(container) {
        const wrapper = document.createElement('div');
        wrapper.className = 'tut-shape';
        wrapper.style.width = '200px';
        wrapper.style.height = '200px';

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 200 200");
        svg.style.overflow = "visible";

        const p1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p1.setAttribute("d", "M40,40 L100,40 L100,160 L20,160 Z");
        p1.setAttribute("fill", "rgba(96, 165, 250, 0.2)");
        p1.setAttribute("stroke", "#3b82f6");
        p1.setAttribute("stroke-width", "3");
        p1.style.transition = "transform 0.5s ease-out";

        const p2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p2.setAttribute("d", "M100,40 L160,40 L180,160 L100,160 Z");
        p2.setAttribute("fill", "rgba(96, 165, 250, 0.2)");
        p2.setAttribute("stroke", "#3b82f6");
        p2.setAttribute("stroke-width", "3");
        p2.style.transition = "transform 0.5s ease-out";

        svg.appendChild(p1);
        svg.appendChild(p2);
        wrapper.appendChild(svg);
        container.appendChild(wrapper);

        const submitBtn = document.createElement('button');
        submitBtn.style.cssText = `
            position: absolute; bottom: 30px; 
            padding: 10px 30px; border-radius: 50px; border: none;
            background: #e2e8f0; color: #94a3b8; font-weight: bold;
            transition: all 0.3s; transform: scale(0.9);
        `;
        submitBtn.textContent = 'Submit';
        container.appendChild(submitBtn);

        setTimeout(() => {
            if (!document.body.contains(container)) return;
            
            p1.style.transform = "translate(-15px, 0) rotate(-5deg)";
            p2.style.transform = "translate(15px, 0) rotate(5deg)";

            submitBtn.style.background = "#22c55e";
            submitBtn.style.color = "white";
            submitBtn.style.transform = "scale(1.1)";
            submitBtn.style.boxShadow = "0 0 20px #22c55e66";

            const confetti = document.createElement('div');
            confetti.innerHTML = '⭐⭐⭐';
            confetti.style.cssText = `
                position: absolute; font-size: 40px; top: 40%; 
                animation: confetti-pop 0.6s forwards;
            `;
            container.appendChild(confetti);
        }, 500);
    }

    createSVGShape() {
        const div = document.createElement('div');
        div.className = 'tut-shape';
        div.innerHTML = `
            <svg width="200" height="200" viewBox="0 0 200 200">
                <path d="M40,40 L160,40 L180,160 L20,160 Z" />
            </svg>
        `;
        return div;
    }

    /**
     * Main entry point - shows the tutorial
     * This method is called externally and must be robust
     */
    show() {
        this._log('show() called');
        
        try {
            if (!this.overlay) {
                this._log('No overlay exists, calling init()');
                this.init();
                return;
            }
            
            // Re-append to ensure it's on top
            this._log('Re-appending existing overlay');
            document.body.appendChild(this.overlay);
            
            // Force visibility
            this.overlay.style.display = 'flex';
            this.overlay.style.visibility = 'visible';
            this.overlay.style.opacity = '1';
            this.overlay.style.zIndex = '99999';
            
            // Re-attach handlers (in case they were lost)
            this._attachButtonHandlers();
            
            this.showStep(0);
            this._log('show() complete');
        } catch (e) {
            this._log(`show() error: ${e.message}`, 'error');
            console.error('Tutorial show error:', e);
        }
    }
}

// Create global instance
window.tutorial = new Tutorial();

// Preload styles during idle time
const preloadTutorialOnIdle = () => {
    if (window.tutorial) {
        if (typeof window.tutorial.preloadStyles === 'function') {
            window.tutorial.preloadStyles();
        }
        if (typeof window.tutorial.preloadAudio === 'function') {
            window.tutorial.preloadAudio();
        }
    }
};

if ('requestIdleCallback' in window) {
    requestIdleCallback(preloadTutorialOnIdle, { timeout: 500 });
} else {
    setTimeout(preloadTutorialOnIdle, 200);
}
