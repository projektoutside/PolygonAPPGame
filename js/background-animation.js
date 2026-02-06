/**
 * Neon Background Animation
 * Renders floating neon geometric shapes and particles to mimic a AAA game menu background.
 * Includes advanced dynamic slicing effects.
 */

class NeonBackground {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.shapes = [];
        this.particles = [];
        this.effects = []; // For slash lines
        this.logicalWidth = window.innerWidth;
        this.logicalHeight = window.innerHeight;
        this.lastFrameTime = 0;
        this.frameInterval = 1000 / 30; // Cap animation cost to ~30 FPS
        this.hiddenFrameInterval = 1000 / 8; // Lower cost when canvas is hidden
        this.cachedGradient = null;
        this.cachedGradientWidth = 0;
        this.cachedGradientHeight = 0;

        // Configuration
        this.targetShapeCount = 15;
        this.particleCount = 50;
        this.lastSplitTime = 0;
        this.splitInterval = 4000; // Split every 4 seconds

        this.colors = [
            '#00f3ff', // Cyan
            '#bc13fe', // Magenta/Purple
            '#00ff9d', // Neon Green
            '#ff9d00', // Orange/Gold
        ];

        this.init();

        // Bind methods
        this.resize = this.resize.bind(this);
        this.animate = this.animate.bind(this);

        // Event listeners
        window.addEventListener('resize', this.resize);
        this.resize(); // Initial resize

        // Start loop
        requestAnimationFrame(this.animate);
    }

    init() {
        // Create initial Shapes
        for (let i = 0; i < this.targetShapeCount; i++) {
            this.shapes.push(this.createShape());
        }

        // Create Particles (stars/dots)
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push(this.createParticle());
        }
    }

    createShape(isFragment = false, spawnOffScreen = false, fadeIn = false) {
        // If we are creating a fresh regular shape
        const type = Math.random() < 0.33 ? 'square' : (Math.random() < 0.5 ? 'triangle' : 'hexagon');
        const isBackground = Math.random() < 0.3;

        let x, y;

        if (spawnOffScreen) {
            // Spawn just outside the visible area
            const width = this.logicalWidth || window.innerWidth;
            const height = this.logicalHeight || window.innerHeight;
            const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
            const buffer = 150;
            switch (side) {
                case 0: // Top
                    x = Math.random() * width;
                    y = -buffer;
                    break;
                case 1: // Right
                    x = width + buffer;
                    y = Math.random() * height;
                    break;
                case 2: // Bottom
                    x = Math.random() * width;
                    y = height + buffer;
                    break;
                case 3: // Left
                    x = -buffer;
                    y = Math.random() * height;
                    break;
            }
        } else {
            // Init random position on screen
            x = Math.random() * (this.logicalWidth || window.innerWidth);
            y = Math.random() * (this.logicalHeight || window.innerHeight);
        }

        const targetOpacity = isBackground ? Math.random() * 0.2 + 0.1 : Math.random() * 0.5 + 0.5;

        return {
            id: Math.random().toString(36).substr(2, 9),
            type: 'regular',
            polyType: type, // square, triangle, hexagon
            x: x,
            y: y,
            size: isBackground ? Math.random() * 100 + 80 : Math.random() * 40 + 20,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.02,
            vx: (Math.random() - 0.5) * (isBackground ? 0.2 : 0.5),
            vy: (Math.random() - 0.5) * (isBackground ? 0.2 : 0.5),
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            opacity: fadeIn ? 0 : targetOpacity,
            targetOpacity: targetOpacity,
            fadeIn: fadeIn,
            filled: isBackground || Math.random() < 0.2,
            vertices: [], // Will be calculated on draw or split
            isBackground: isBackground,
            life: 1.0 // For fading out fragments
        };
    }

    createParticle() {
        return {
            x: Math.random() * (this.logicalWidth || window.innerWidth),
            y: Math.random() * (this.logicalHeight || window.innerHeight),
            size: Math.random() * 2 + 0.5,
            alpha: Math.random(),
            fading: Math.random() < 0.5,
            vx: (Math.random() - 0.5) * 0.2,
            vy: (Math.random() - 0.5) * 0.2
        };
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.logicalWidth = window.innerWidth;
        this.logicalHeight = window.innerHeight;

        this.canvas.width = this.logicalWidth * dpr;
        this.canvas.height = this.logicalHeight * dpr;
        this.canvas.style.width = `${this.logicalWidth}px`;
        this.canvas.style.height = `${this.logicalHeight}px`;

        // Reset transform before scaling to avoid cumulative scale growth on resize.
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);

        // Invalidate cached gradient after size changes.
        this.cachedGradient = null;
        this.cachedGradientWidth = 0;
        this.cachedGradientHeight = 0;
    }

    // --- GEOMETRY HELPERS ---

    getRegularVertices(shape) {
        const sides = shape.polyType === 'square' ? 4 : (shape.polyType === 'triangle' ? 3 : 6);
        const vertices = [];
        for (let i = 0; i < sides; i++) {
            const angle = shape.rotation + (i * 2 * Math.PI / sides);
            vertices.push({
                x: shape.x + shape.size * Math.cos(angle),
                y: shape.y + shape.size * Math.sin(angle)
            });
        }
        return vertices;
    }

    // Split a polygon by a line defined by point P and angle Theta
    splitPolygon(vertices, px, py, theta) {
        // Plane equation: ax + by + c = 0
        // Normal vector (-sin, cos) represents direction perpendicular to cut
        const nx = -Math.sin(theta);
        const ny = Math.cos(theta);
        // Point on line (px, py) => nx*px + ny*py + c = 0 => c = -nx*px - ny*py
        const c = -nx * px - ny * py;

        const poly1 = [];
        const poly2 = [];

        // Helper to check side of line
        const dist = (p) => nx * p.x + ny * p.y + c;

        for (let i = 0; i < vertices.length; i++) {
            const cur = vertices[i];
            const next = vertices[(i + 1) % vertices.length];
            const d1 = dist(cur);
            const d2 = dist(next);

            if (d1 >= 0) poly1.push(cur);
            if (d1 <= 0) poly2.push(cur);

            // If crossing the line
            if ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) {
                // Find intersection
                // t = d1 / (d1 - d2)
                const t = d1 / (d1 - d2);
                const inter = {
                    x: cur.x + t * (next.x - cur.x),
                    y: cur.y + t * (next.y - cur.y)
                };
                poly1.push(inter);
                poly2.push(inter);
            }
        }

        return [poly1, poly2];
    }

    getCentroid(vertices) {
        let x = 0, y = 0;
        for (let v of vertices) {
            x += v.x;
            y += v.y;
        }
        return { x: x / vertices.length, y: y / vertices.length };
    }

    triggerRandomSplit(time) {
        const width = this.logicalWidth || window.innerWidth;
        const height = this.logicalHeight || window.innerHeight;
        // Filter candidates: Regular shapes, Visible, On Screen
        const candidates = this.shapes.filter(s =>
            s.type === 'regular' &&
            s.x > 0 && s.x < width &&
            s.y > 0 && s.y < height &&
            s.opacity > 0.3 &&
            !s.fadeIn // Don't split things that are just fading in
        );

        if (candidates.length === 0) return;

        const target = candidates[Math.floor(Math.random() * candidates.length)];

        // 1. Calculate Vertices
        const vertices = this.getRegularVertices(target);

        // 2. Define Split Line (Random angle through center)
        const splitAngle = Math.random() * Math.PI * 2;

        // 3. Perform Split
        const [verts1, verts2] = this.splitPolygon(vertices, target.x, target.y, splitAngle);

        if (verts1.length < 3 || verts2.length < 3) return; // Failed split logic safety

        // 3b. Visual Effects (Slash & Particles)
        // Add a "Slash" effect
        const slashLength = target.size * 3;
        const slashX = Math.cos(splitAngle) * slashLength;
        const slashY = Math.sin(splitAngle) * slashLength;
        this.effects.push({
            type: 'slash',
            x: target.x,
            y: target.y,
            x1: target.x - slashX,
            y1: target.y - slashY,
            x2: target.x + slashX,
            y2: target.y + slashY,
            life: 1.0,
            color: '#ffffff'
        });

        // Spawn debris particles along the cut
        for (let k = 0; k < 6; k++) {
            const p = this.createParticle();
            p.x = target.x + (Math.random() - 0.5) * target.size;
            p.y = target.y + (Math.random() - 0.5) * target.size;
            // Particles burst outward perpendicular to cut
            const burstAngle = splitAngle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) + (Math.random() - 0.5) * 0.5;
            const speed = Math.random() * 1.5 + 0.5; // Slower particles
            p.vx = Math.cos(burstAngle) * speed;
            p.vy = Math.sin(burstAngle) * speed;
            p.life = 1.0;
            p.size = Math.random() * 2 + 1;
            p.color = '#ffffff';
            this.particles.push(p);
        }

        // 4. Create Fragments
        // Reduced push force for "separation" - slower
        const pushForce = Math.max(1.0, target.size / 20);
        const pushX = Math.cos(splitAngle + Math.PI / 2); // Direction X
        const pushY = Math.sin(splitAngle + Math.PI / 2); // Direction Y

        const createFragment = (verts, dir) => {
            const centroid = this.getCentroid(verts);
            // Convert to local coordinates relative to centroid
            const localVerts = verts.map(v => ({ x: v.x - centroid.x, y: v.y - centroid.y }));

            return {
                type: 'fragment',
                vertices: localVerts, // Stored as offsets
                x: centroid.x,
                y: centroid.y,
                size: target.size, // Approximation for drawing logic if needed
                color: target.color,
                opacity: target.opacity,
                // Add velocity: original + perpendicular push + slight spread
                // Reduced velocity inheritance multiplier
                vx: target.vx * 0.5 + pushX * pushForce * dir + (centroid.x - target.x) * 0.02,
                vy: target.vy * 0.5 + pushY * pushForce * dir + (centroid.y - target.y) * 0.02,
                rotation: 0,
                // Add tumble - slower
                rotationSpeed: (Math.random() - 0.5) * 0.05,
                life: 1.0, // fading out
                filled: target.filled
            };
        };

        const frag1 = createFragment(verts1, 1);
        const frag2 = createFragment(verts2, -1);

        // 5. Update Lists
        // Remove target, add fragments
        this.shapes = this.shapes.filter(s => s !== target);
        this.shapes.push(frag1, frag2);

        this.lastSplitTime = time;
    }

    animate(time) {
        const isCanvasHidden = this.canvas.offsetParent === null || this.canvas.clientWidth === 0 || this.canvas.clientHeight === 0;
        const targetInterval = isCanvasHidden ? this.hiddenFrameInterval : this.frameInterval;
        if (time - this.lastFrameTime < targetInterval) {
            requestAnimationFrame(this.animate);
            return;
        }
        this.lastFrameTime = time;

        // --- Logic ---
        // Check for split
        if (time - this.lastSplitTime > this.splitInterval) {
            this.triggerRandomSplit(time);
        }

        // --- Rendering ---
        const width = this.logicalWidth || window.innerWidth;
        const height = this.logicalHeight || window.innerHeight;
        this.ctx.clearRect(0, 0, width, height);

        // Deep blue/purple gradient background
        if (!this.cachedGradient || this.cachedGradientWidth !== width || this.cachedGradientHeight !== height) {
            const gradient = this.ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, '#0f172a');
            gradient.addColorStop(1, '#1e1b4b');
            this.cachedGradient = gradient;
            this.cachedGradientWidth = width;
            this.cachedGradientHeight = height;
        }
        this.ctx.fillStyle = this.cachedGradient;
        this.ctx.fillRect(0, 0, width, height);

        // 0. Effects (Slash lines)
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const eff = this.effects[i];
            eff.life -= 0.1; // Fast fade
            if (eff.life <= 0) {
                this.effects.splice(i, 1);
                continue;
            }
            this.ctx.save();
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${eff.life})`;
            this.ctx.lineWidth = 4;
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = 'white';
            this.ctx.beginPath();
            this.ctx.moveTo(eff.x1, eff.y1);
            this.ctx.lineTo(eff.x2, eff.y2);
            this.ctx.stroke();
            this.ctx.restore();
        }

        // 1. Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;

            // Wall wrapping for particles
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            // Optional explicit life for burst particles
            if (p.life) {
                p.life -= 0.02;
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                    continue;
                }
                p.alpha = p.life; // Override alpha with life
            } else {
                // Background star twinkle logic
                if (p.fading) {
                    p.alpha -= 0.01;
                    if (p.alpha <= 0.1) p.fading = false;
                } else {
                    p.alpha += 0.01;
                    if (p.alpha >= 1) p.fading = true;
                }
            }

            this.ctx.fillStyle = p.color ? p.color : `rgba(255, 255, 255, ${p.alpha})`;
            if (p.color) this.ctx.globalAlpha = p.alpha;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1.0;
        }

        // 2. Shapes (Regular & Fragments)
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            const s = this.shapes[i];

            if (s.type === 'fragment') {
                s.life -= 0.003; // Fade out EVEN SLOWER
                if (s.life <= 0) {
                    this.shapes.splice(i, 1);
                    continue;
                }

                // Move Fragment (Position + Rotation)
                s.x += s.vx;
                s.y += s.vy;
                s.rotation += s.rotationSpeed;

            } else {
                // Regular movement
                s.x += s.vx;
                s.y += s.vy;
                s.rotation += s.rotationSpeed;

                // Handle fade-in
                if (s.fadeIn) {
                    s.opacity += 0.005; // Gentle fade in
                    if (s.opacity >= s.targetOpacity) {
                        s.opacity = s.targetOpacity;
                        s.fadeIn = false;
                    }
                }

                // Wrap regular shapes
                const buffer = 150;
                if (s.x < -buffer) s.x = width + buffer;
                if (s.x > width + buffer) s.x = -buffer;
                if (s.y < -buffer) s.y = height + buffer;
                if (s.y > height + buffer) s.y = -buffer;
            }

            // Draw
            this.ctx.save();
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = s.color;
            this.ctx.strokeStyle = s.color;
            this.ctx.lineWidth = 3;

            const currentOpacity = s.opacity * (s.life || 1);
            if (s.filled) {
                this.ctx.fillStyle = s.color;
                this.ctx.globalAlpha = 0.1 * (s.life || 1);
            } else {
                this.ctx.globalAlpha = currentOpacity;
            }

            // Transform for Rotation
            this.ctx.translate(s.x, s.y);
            this.ctx.rotate(s.rotation);

            this.ctx.beginPath();

            if (s.type === 'regular') {
                // Regular shapes need calculation from center (0,0) with size
                const sides = s.polyType === 'square' ? 4 : (s.polyType === 'triangle' ? 3 : 6);
                for (let j = 0; j < sides; j++) {
                    const angle = (j * 2 * Math.PI / sides);
                    const vx = s.size * Math.cos(angle);
                    const vy = s.size * Math.sin(angle);
                    if (j === 0) this.ctx.moveTo(vx, vy);
                    else this.ctx.lineTo(vx, vy);
                }
            } else {
                // Fragment: vertices are already local offsets
                this.ctx.moveTo(s.vertices[0].x, s.vertices[0].y);
                for (let j = 1; j < s.vertices.length; j++) {
                    this.ctx.lineTo(s.vertices[j].x, s.vertices[j].y);
                }
            }

            this.ctx.closePath();
            this.ctx.stroke();
            if (s.filled) this.ctx.fill();
            this.ctx.restore();
        }

        // 3. Population Control (Respawn Logic)
        const regularCount = this.shapes.filter(s => s.type === 'regular').length;
        if (regularCount < this.targetShapeCount && Math.random() < 0.05) { // Increased spawn rate slightly
            // Spawn new regular shape, ON SCREEN, with FADE IN
            this.shapes.push(this.createShape(false, false, true));
        }

        requestAnimationFrame(this.animate);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only init if the element exists
    if (document.getElementById('bgCanvas')) {
        new NeonBackground('bgCanvas');
    }
});
