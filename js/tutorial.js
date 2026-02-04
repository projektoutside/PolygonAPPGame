class Tutorial {
    constructor() {
        this.currentStep = 0;
        this.overlay = null;
        this.currentAudio = null;
        this.initialized = false;
        this.preloaded = false;
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
    }

    init() {
        if (this.initialized || document.getElementById('tutorialOverlay')) return;
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

        this.createOverlay();
    }

    preloadStyles() {
        if (this.preloaded) return;
        const style = document.createElement('style');
        style.setAttribute('data-tutorial-style', 'true');
        style.textContent = `
            .tut-overlay {
                position: fixed; inset: 0; background: rgba(15, 23, 42, 0.9);
                backdrop-filter: blur(10px); z-index: 9999;
                display: flex; align-items: center; justify-content: center;
                font-family: 'Inter', system-ui, sans-serif;
                animation: tutFadeIn 0.4s ease-out;
            }
            @keyframes tutFadeIn { from { opacity: 0; } to { opacity: 1; } }

            .tut-card {
                background: white; width: 90%; max-width: 800px;
                border-radius: 24px; overflow: hidden;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                display: flex; flex-direction: column;
                position: relative;
            }

            .tut-stage {
                height: 360px; background: #f1f5f9;
                position: relative; overflow: hidden;
                display: flex; align-items: center; justify-content: center;
                border-bottom: 1px solid #e2e8f0;
                /* Grid Pattern */
                background-image: linear-gradient(#cbd5e1 1px, transparent 1px),
                                linear-gradient(90deg, #cbd5e1 1px, transparent 1px);
                background-size: 40px 40px;
            }
            .tut-stage::after {
                content: ''; position: absolute; inset: 0;
                background: radial-gradient(circle at center, transparent 30%, rgba(241, 245, 249, 0.8) 100%);
            }

            .tut-content { padding: 32px; text-align: center; }
            .tut-title { 
                font-size: 28px; font-weight: 800; color: #1e293b; margin: 0 0 12px 0;
                background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                -webkit-background-clip: text; -webkit-text-fill-color: transparent;
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
            }
            .tut-btn-primary {
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
            }
            .tut-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(37, 99, 235, 0.3); }
            
            .tut-btn-text { background: transparent; color: #94a3b8; }
            .tut-btn-text:hover { color: #64748b; background: #f8fafc; }

            .tut-dots { display: flex; gap: 8px; }
            .tut-dot { width: 10px; height: 10px; border-radius: 5px; background: #e2e8f0; transition: all 0.3s; }
            .tut-dot.active { width: 30px; background: #3b82f6; }

            /* --- SCENE ELEMENTS --- */
            
            /* Shapes */
            .tut-shape {
                position: absolute; left: 50%; top: 50%;
                transform: translate(-50%, -50%);
                filter: drop-shadow(0 10px 15px rgba(59, 130, 246, 0.2));
            }
            .tut-shape path {
                fill: rgba(96, 165, 250, 0.2);
                stroke: #3b82f6; stroke-width: 3;
                vector-effect: non-scaling-stroke;
            }

            /* UI Mockups */
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

            /* Cursors */
            .tut-cursor {
                width: 32px; height: 32px;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath fill='white' stroke='black' stroke-width='2' d='M8 2l7 16 3.5-6.5L22 10 8 2z'/%3E%3C/svg%3E");
                position: absolute; z-index: 20;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
                top: 0; left: 0; opacity: 0;
            }

            /* ANIMATIONS */
            
            /* Goal Scene */
            @keyframes pulse-attention {
                0%, 100% { transform: scale(1); box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-color: #e2e8f0; }
                50% { transform: scale(1.1); box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); border-color: #3b82f6; }
            }

            /* Lines Scene */
             @keyframes pulse-lines-red {
                0%, 100% { transform: scale(1); border-color: #e2e8f0; color: #475569; }
                50% { transform: scale(1.1); border-color: #ef4444; color: #ef4444; box-shadow: 0 0 15px rgba(239, 68, 68, 0.3); }
            }

            /* Slice Scene */
            .tut-cut-line {
                position: absolute; background: #22c55e; height: 3px;
                transform-origin: left; opacity: 0; z-index: 15;
                box-shadow: 0 0 10px #22c55e;
            }
            
            @keyframes cursor-slice-demo {
                0% { opacity: 0; transform: translate(300px, 100px); }
                10% { opacity: 1; transform: translate(300px, 100px); } /* Appear */
                25% { transform: translate(400px, 50px); } /* Move to Start */
                30% { transform: translate(400px, 50px) scale(0.9); } /* Click */
                60% { transform: translate(400px, 300px) scale(0.9); } /* Drag Down */
                70% { transform: translate(400px, 300px) scale(1); } /* Release */
                80% { opacity: 1; }
                100% { opacity: 0; }
            }

            /* Win Scene */
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
        this.overlay = document.createElement('div');
        this.overlay.className = 'tut-overlay';
        this.overlay.id = 'tutorialOverlay';
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
                    <button class="tut-btn tut-btn-text" onclick="tutorial.skip()">Skip</button>
                    <div class="tut-dots" id="tutDots"></div>
                    <button class="tut-btn tut-btn-primary" id="tutNextBtn" onclick="tutorial.next()">Next Step</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.overlay);
        this.showStep(0);
    }

    showStep(index) {
        this.playAudio(index);
        this.currentStep = index;
        const step = this.steps[index];
        const stage = document.getElementById('tutStage');

        // Text
        document.getElementById('tutTitle').textContent = step.title;
        document.getElementById('tutDesc').textContent = step.text;
        document.getElementById('tutNextBtn').textContent = index === this.steps.length - 1 ? 'Start Playing' : 'Next Step';

        // Dots
        const dots = document.getElementById('tutDots');
        dots.innerHTML = this.steps.map((_, i) =>
            `<div class="tut-dot ${i === index ? 'active' : ''}"></div>`
        ).join('');

        // Clear and Setup Stage
        stage.innerHTML = '';
        step.setup(stage);
    }

    next() {
        if (this.currentStep < this.steps.length - 1) {
            this.showStep(this.currentStep + 1);
        } else {
            this.skip();
        }
    }

    skip() {
        this.stopAudio();
        if (this.overlay) {
            this.overlay.remove();
        }
        if (window.game && window.game.state === 'menu') {
            window.game.startMode('beginner');
        }
    }

    stopAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
    }

    playAudio(index) {
        this.stopAudio();
        // Tutorial1.mp3 corresponds to index 0, Tutorial2.mp3 to index 1, etc.
        const audioPath = `Music/Tutorial${index + 1}.mp3`;
        if (typeof window.ensureAudioUnlocked === 'function') {
            window.ensureAudioUnlocked();
        }
        this.currentAudio = new Audio(audioPath);
        this.currentAudio.play().catch(e => {
            console.warn('Audio playback failed:', e);
        });
    }

    /* --- SCENE GENERATORS --- */

    setupGoalScene(container) {
        // Spotlight effect focusing on the Target UI
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
        shape.style.opacity = '0.5'; // Dim shape to focus on UI

        container.appendChild(spotlight);
        container.appendChild(targetUI);
        container.appendChild(shape);
    }

    setupLinesScene(container) {
        // Spotlight effect focusing on the Lines UI (Top Left)
        const spotlight = document.createElement('div');
        spotlight.className = 'tut-spotlight';
        spotlight.style.setProperty('--x', '20%'); // Focus left
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

        // Animate a cut to show lines decreasing
        const box = container.getBoundingClientRect();
        const startX = box.width * 0.5;
        const startY = box.height * 0.15;
        const endY = box.height * 0.85;

        // Sequence: Move cursor -> Slice -> Decrement Counter -> Reset
        const cutAnimation = cursor.animate([
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

        // Sync line
        const lineAnimation = line.animate([
            { height: '0px', width: '2px', top: `${startY}px`, left: `${startX}px`, opacity: 0 },
            { height: '0px', width: '2px', top: `${startY}px`, left: `${startX}px`, opacity: 1, offset: 0.2 },
            { height: `${endY - startY}px`, width: '2px', top: `${startY}px`, left: `${startX}px`, opacity: 1, offset: 0.6 },
            { opacity: 0, offset: 0.75 }
        ], {
            duration: 3000,
            iterations: Infinity
        });

        // Manual JS interval to update the text "Lines: 1" at the right moment
        // The cut finishes around 60% of 3000ms = 1800ms

        let counterState = 2;
        const valSpan = document.getElementById('demoLinesVal');

        // Clear any existing intervals if re-running
        if (this.linesInterval) clearInterval(this.linesInterval);

        this.linesInterval = setInterval(() => {
            // We want to flip to 1 roughly when the cut finishes
            // Let's just toggle it based on time to match the loop
            // Since we can't easily hook into the exact keyframe event of Web Animation API here without more complexity,
            // We will restart the text logic every loop.
            // Actually, simpler: just set timeouts relative to now, wrapped in a function that calls itself?
            // No, setInterval is fine if we sync it.
            // Better: Use `onfinish` if it wasn't infinite.
            // Let's just toggle it:
            // 0ms: Text = 2
            // 1800ms: Text = 1, Pulse Red
            // 2800ms: Text = 2 (Reset)
        }, 3000);

        // Initial set
        const updateLoop = () => {
            if (!document.body.contains(linesUI)) return; // Stop if removed
            valSpan.textContent = "1";
            valSpan.style.color = "inherit";
            linesUI.style.animation = 'pulse-attention 1.5s infinite';

            setTimeout(() => {
                if (!document.body.contains(linesUI)) return;
                valSpan.textContent = "0";
                valSpan.style.color = "#ef4444";
                linesUI.style.animation = 'pulse-lines-red 0.5s';
            }, 1800);

            setTimeout(updateLoop, 3000);
        };
        updateLoop();
    }

    setupSliceScene(container) {
        const shape = this.createSVGShape();

        const cursor = document.createElement('div');
        cursor.className = 'tut-cursor';

        // Line that appears
        const line = document.createElement('div');
        line.className = 'tut-cut-line';

        container.appendChild(shape);
        container.appendChild(line); // Line below cursor
        container.appendChild(cursor);

        // JS Animation for precise control
        // Start -> Click -> Drag -> Release
        const box = container.getBoundingClientRect();
        const startX = box.width * 0.5;
        const startY = box.height * 0.15;
        const endY = box.height * 0.85;

        cursor.animate([
            { opacity: 0, transform: `translate(${startX}px, ${startY - 50}px)` },
            { opacity: 1, transform: `translate(${startX}px, ${startY - 50}px)`, offset: 0.1 },
            { transform: `translate(${startX}px, ${startY}px)`, offset: 0.2 }, // Move to start
            { transform: `translate(${startX}px, ${startY}px) scale(0.8)`, offset: 0.25 }, // Click
            { transform: `translate(${startX}px, ${endY}px) scale(0.8)`, offset: 0.6 }, // Drag
            { transform: `translate(${startX}px, ${endY}px) scale(1)`, offset: 0.7 }, // Release
            { opacity: 0, offset: 0.8 }
        ], {
            duration: 2500,
            iterations: Infinity
        });

        // Sync line with cursor
        line.animate([
            { height: '0px', width: '2px', top: `${startY}px`, left: `${startX}px`, opacity: 0 },
            { height: '0px', width: '2px', top: `${startY}px`, left: `${startX}px`, opacity: 1, offset: 0.25 },
            { height: `${endY - startY}px`, width: '2px', top: `${startY}px`, left: `${startX}px`, opacity: 1, offset: 0.6 },
            { opacity: 0, offset: 0.75 }
        ], {
            duration: 2500,
            iterations: Infinity
        });
    }

    setupWinScene(container) {
        // Two piece shape that splits
        const wrapper = document.createElement('div');
        wrapper.className = 'tut-shape';
        wrapper.style.width = '200px';
        wrapper.style.height = '200px';

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 200 200");
        svg.style.overflow = "visible";

        // Left Piece
        const p1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p1.setAttribute("d", "M40,40 L100,40 L100,160 L20,160 Z");
        p1.setAttribute("fill", "rgba(96, 165, 250, 0.2)");
        p1.setAttribute("stroke", "#3b82f6");
        p1.setAttribute("stroke-width", "3");
        p1.style.transition = "transform 0.5s ease-out";

        // Right Piece
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

        // Submit Button
        const submitBtn = document.createElement('button');
        submitBtn.style.cssText = `
            position: absolute; bottom: 30px; 
            padding: 10px 30px; border-radius: 50px; border: none;
            background: #e2e8f0; color: #94a3b8; font-weight: bold;
            transition: all 0.3s; transform: scale(0.9);
        `;
        submitBtn.textContent = 'Submit';
        container.appendChild(submitBtn);

        // Timeline
        setTimeout(() => {
            // 1. Split
            p1.style.transform = "translate(-15px, 0) rotate(-5deg)";
            p2.style.transform = "translate(15px, 0) rotate(5deg)";

            // 2. Button Active
            submitBtn.style.background = "#22c55e";
            submitBtn.style.color = "white";
            submitBtn.style.transform = "scale(1.1)";
            submitBtn.style.boxShadow = "0 0 20px #22c55e66";

            // 3. Stars (Confetti)
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

    show() {
        if (!this.overlay) {
            this.init();
            return;
        }
        document.body.appendChild(this.overlay); // Re-append to ensure top z-index
        this.showStep(0);
    }
}

window.tutorial = new Tutorial();

// Preload tutorial styles during idle time for faster first show
const preloadTutorialOnIdle = () => {
    if (window.tutorial && typeof window.tutorial.preloadStyles === 'function') {
        window.tutorial.preloadStyles();
    }
};
if ('requestIdleCallback' in window) {
    requestIdleCallback(preloadTutorialOnIdle, { timeout: 500 });
} else {
    setTimeout(preloadTutorialOnIdle, 200);
}
