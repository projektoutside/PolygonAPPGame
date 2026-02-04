
const GameLevels = [
    // --- STAGE 1-5: The Basics (Understanding Equal Division) ---
    {
        id: 1, name: "Stage 1", focus: "Halves", instruction: "Split the rectangle into 2 equal parts.",
        startShapeVertices: [{ x: -120, y: -80 }, { x: 120, y: -80 }, { x: 120, y: 80 }, { x: -120, y: 80 }],
        color: '#90cdf4', targetPieces: 2, maxLines: 1
    },
    {
        id: 2, name: "Stage 2", focus: "Thirds", instruction: "Split the rectangle into 3 equal parts.",
        startShapeVertices: [{ x: -150, y: -60 }, { x: 150, y: -60 }, { x: 150, y: 60 }, { x: -150, y: 60 }],
        color: '#a3bffa', targetPieces: 3, maxLines: 2
    },
    {
        id: 3, name: "Stage 3", focus: "Triangle Halves", instruction: "Split the triangle into 2 equal parts.",
        startShapeVertices: [{ x: 0, y: -120 }, { x: 120, y: 80 }, { x: -120, y: 80 }],
        color: '#b794f4', targetPieces: 2, maxLines: 1
    },
    {
        id: 4, name: "Stage 4", focus: "Quarters", instruction: "Split the square into 4 equal parts.",
        startShapeVertices: [{ x: -100, y: -100 }, { x: 100, y: -100 }, { x: 100, y: 100 }, { x: -100, y: 100 }],
        color: '#81e6d9', targetPieces: 4, maxLines: 2
    },
    {
        id: 5, name: "Stage 5", focus: "Triangle Thirds", instruction: "Split the triangle into 3 equal parts.",
        startShapeVertices: [{ x: 0, y: -130 }, { x: 130, y: 80 }, { x: -130, y: 80 }],
        color: '#fbb6ce', targetPieces: 3, maxLines: 2
    },

    // --- STAGE 6-10: Efficiency (Doing More with Less) ---
    {
        id: 6, name: "Stage 6", focus: "Efficiency I", instruction: "Create 4 pieces with only 2 lines.",
        startShapeVertices: [{ x: -120, y: -80 }, { x: 120, y: -80 }, { x: 120, y: 80 }, { x: -120, y: 80 }],
        color: '#9ae6b4', targetPieces: 4, maxLines: 2
    },
    {
        id: 7, name: "Stage 7", focus: "Efficiency II", instruction: "Create 6 pieces with 3 lines.",
        startShapeVertices: [{ x: -140, y: -100 }, { x: 140, y: -100 }, { x: 140, y: 100 }, { x: -140, y: 100 }],
        color: '#90cdf4', targetPieces: 6, maxLines: 3
    },
    {
        id: 8, name: "Stage 8", focus: "Triangle Planning", instruction: "Create 4 equal pieces with 2 lines.",
        startShapeVertices: [{ x: 0, y: -140 }, { x: 140, y: 80 }, { x: -140, y: 80 }],
        color: '#fbd38d', targetPieces: 4, maxLines: 2
    },
    {
        id: 9, name: "Stage 9", focus: "Trapezoid", instruction: "Split the trapezoid into 4 equal parts.",
        startShapeVertices: [{ x: -120, y: -80 }, { x: 120, y: -80 }, { x: 80, y: 80 }, { x: -80, y: 80 }],
        color: '#feb2b2', targetPieces: 4, maxLines: 2
    },
    {
        id: 10, name: "Stage 10", focus: "Pentagon", instruction: "Split the pentagon into 5 equal parts.",
        startShapeVertices: [
            { x: 0, y: -130 }, { x: 120, y: -40 }, { x: 75, y: 100 },
            { x: -75, y: 100 }, { x: -120, y: -40 }
        ],
        color: '#c4b5fd', targetPieces: 5, maxLines: 3
    },

    // --- STAGE 11-15: Irregular Shapes (Adapting to Asymmetry) ---
    {
        id: 11, name: "Stage 11", focus: "Parallelogram", instruction: "Split the parallelogram into 2 equal areas.",
        startShapeVertices: [{ x: -100, y: -60 }, { x: 100, y: -60 }, { x: 140, y: 60 }, { x: -60, y: 60 }],
        color: '#81e6d9', targetPieces: 2, maxLines: 1
    },
    {
        id: 12, name: "Stage 12", focus: "Skewed Trapezoid", instruction: "Split the skewed trapezoid into 3 equal parts.",
        startShapeVertices: [{ x: -120, y: -80 }, { x: 80, y: -100 }, { x: 120, y: 60 }, { x: -100, y: 80 }],
        color: '#a3bffa', targetPieces: 3, maxLines: 2
    },
    {
        id: 13, name: "Stage 13", focus: "Irregular Pentagon", instruction: "Split the pentagon into 3 equal parts.",
        startShapeVertices: [
            { x: 0, y: -120 }, { x: 110, y: -30 }, { x: 80, y: 100 },
            { x: -50, y: 90 }, { x: -110, y: -20 }
        ],
        color: '#fbd38d', targetPieces: 3, maxLines: 2
    },
    {
        id: 14, name: "Stage 14", focus: "Irregular Hexagon", instruction: "Split the hexagon into 4 equal parts.",
        startShapeVertices: [
            { x: -100, y: -100 }, { x: 30, y: -120 }, { x: 120, y: -20 },
            { x: 80, y: 100 }, { x: -30, y: 120 }, { x: -120, y: 20 }
        ],
        color: '#9ae6b4', targetPieces: 4, maxLines: 3
    },
    {
        id: 15, name: "Stage 15", focus: "Gentle Notch", instruction: "Split the shape into 2 equal areas.",
        startShapeVertices: [
            { x: -120, y: -100 }, { x: 120, y: -100 }, { x: 120, y: 20 },
            { x: 20, y: 20 }, { x: 20, y: 100 }, { x: -120, y: 100 }
        ],
        color: '#b794f4', targetPieces: 2, maxLines: 1
    },

    // --- STAGE 16-20: Precision (Tight Line Limits) ---
    {
        id: 16, name: "Stage 16", focus: "Precision I", instruction: "Create 5 equal pieces with only 3 lines.",
        startShapeVertices: [{ x: -150, y: -80 }, { x: 150, y: -80 }, { x: 150, y: 80 }, { x: -150, y: 80 }],
        color: '#90cdf4', targetPieces: 5, maxLines: 3
    },
    {
        id: 17, name: "Stage 17", focus: "Precision II", instruction: "Split the triangle into 5 equal parts.",
        startShapeVertices: [{ x: 0, y: -140 }, { x: 140, y: 80 }, { x: -140, y: 80 }],
        color: '#fbb6ce', targetPieces: 5, maxLines: 3
    },
    {
        id: 18, name: "Stage 18", focus: "Precision III", instruction: "Split the parallelogram into 4 equal parts.",
        startShapeVertices: [{ x: -120, y: -60 }, { x: 60, y: -60 }, { x: 120, y: 60 }, { x: -60, y: 60 }],
        color: '#81e6d9', targetPieces: 4, maxLines: 2
    },
    {
        id: 19, name: "Stage 19", focus: "Precision IV", instruction: "Split the hexagon into 6 equal parts.",
        startShapeVertices: [
            { x: 0, y: -130 }, { x: 115, y: -65 }, { x: 115, y: 65 },
            { x: 0, y: 130 }, { x: -115, y: 65 }, { x: -115, y: -65 }
        ],
        color: '#c4b5fd', targetPieces: 6, maxLines: 3
    },
    {
        id: 20, name: "Stage 20", focus: "Precision V", instruction: "Split the trapezoid into 5 equal parts.",
        startShapeVertices: [{ x: -160, y: -70 }, { x: 160, y: -70 }, { x: 110, y: 90 }, { x: -110, y: 90 }],
        color: '#feb2b2', targetPieces: 5, maxLines: 3
    },

    // --- STAGE 21-25: Mastery (Complex Polygons) ---
    {
        id: 21, name: "Stage 21", focus: "Mastery I", instruction: "Split the irregular hexagon into 4 equal parts.",
        startShapeVertices: [
            { x: -120, y: -100 }, { x: 30, y: -120 }, { x: 120, y: -30 },
            { x: 80, y: 110 }, { x: -30, y: 130 }, { x: -130, y: 20 }
        ],
        color: '#9ae6b4', targetPieces: 4, maxLines: 2
    },
    {
        id: 22, name: "Stage 22", focus: "Mastery II", instruction: "Split the concave pentagon into 4 equal parts.",
        startShapeVertices: [
            { x: -120, y: -80 }, { x: 120, y: -80 }, { x: 120, y: 50 },
            { x: 0, y: 10 }, { x: -120, y: 80 }
        ],
        color: '#a3bffa', targetPieces: 4, maxLines: 2
    },
    {
        id: 23, name: "Stage 23", focus: "Mastery III", instruction: "Split the heptagon into 5 equal parts.",
        startShapeVertices: [
            { x: 0, y: -140 }, { x: 100, y: -100 }, { x: 140, y: -20 },
            { x: 90, y: 100 }, { x: -30, y: 130 }, { x: -130, y: 50 }, { x: -120, y: -70 }
        ],
        color: '#fbd38d', targetPieces: 5, maxLines: 3
    },
    {
        id: 24, name: "Stage 24", focus: "Mastery IV", instruction: "Split the octagon into 6 equal parts.",
        startShapeVertices: [
            { x: 0, y: -140 }, { x: 100, y: -120 }, { x: 140, y: -30 },
            { x: 120, y: 100 }, { x: 30, y: 140 }, { x: -70, y: 130 },
            { x: -130, y: 50 }, { x: -110, y: -70 }
        ],
        color: '#b794f4', targetPieces: 6, maxLines: 3
    },
    {
        id: 25, name: "Stage 25", focus: "Mastery V", instruction: "Split the final shape into 6 equal parts.",
        startShapeVertices: [
            { x: -140, y: -50 }, { x: -70, y: -120 }, { x: 50, y: -120 },
            { x: 140, y: -30 }, { x: 100, y: 110 }, { x: -20, y: 140 },
            { x: -120, y: 70 }, { x: -140, y: 0 }
        ],
        color: '#90cdf4', targetPieces: 6, maxLines: 3
    },

    // --- STAGE 26-30: Grandmaster (Features of the New Engine) ---
    {
        id: 26, name: "Stage 26", focus: "The Fork", instruction: "Cut across all 3 prongs to make 4 pieces with 1 line.",
        startShapeVertices: [
            { x: -100, y: -100 }, { x: -60, y: -100 }, { x: -60, y: 0 },
            { x: -20, y: 0 }, { x: -20, y: -100 }, { x: 20, y: -100 },
            { x: 20, y: 0 }, { x: 60, y: 0 }, { x: 60, y: -100 },
            { x: 100, y: -100 }, { x: 100, y: 100 }, { x: -100, y: 100 }
        ],
        // Impossible without multi-cut engine
        color: '#ff6b6b', targetPieces: 4, maxLines: 1
    },
    {
        id: 27, name: "Stage 27", focus: "Spiral Cut", instruction: "Cut the spiral into 3 pieces with 1 line.",
        startShapeVertices: [
            { x: -100, y: -100 }, { x: 100, y: -100 }, { x: 100, y: 100 },
            { x: -100, y: 100 }, { x: -100, y: -60 }, { x: 60, y: -60 },
            { x: 60, y: 60 }, { x: -60, y: 60 }, { x: -60, y: -20 }
        ],
        color: '#f6ad55', targetPieces: 3, maxLines: 1
    },
    {
        id: 28, name: "Stage 28", focus: "Double U", instruction: "Split the W-shape into 5 pieces with 1 horizontal line.",
        startShapeVertices: [
            { x: -140, y: -80 }, { x: -100, y: -80 }, { x: -100, y: 40 },
            { x: -60, y: 40 }, { x: -60, y: -80 }, { x: 60, y: -80 },
            { x: 60, y: 40 }, { x: 100, y: 40 }, { x: 100, y: -80 },
            { x: 140, y: -80 }, { x: 140, y: 100 }, { x: -140, y: 100 }
        ],
        color: '#63b3ed', targetPieces: 5, maxLines: 1
    },
    {
        id: 29, name: "Stage 29", focus: "Expert Precision", instruction: "Create 7 pieces using only 3 lines on the Star.",
        startShapeVertices: [
            { x: 0, y: -150 }, { x: 40, y: -50 }, { x: 140, y: -40 },
            { x: 70, y: 30 }, { x: 90, y: 130 }, { x: 0, y: 80 },
            { x: -90, y: 130 }, { x: -70, y: 30 }, { x: -140, y: -40 },
            { x: -40, y: -50 }
        ],
        color: '#d53f8c', targetPieces: 7, maxLines: 3
    },
    {
        id: 30, name: "Stage 30", focus: "Legend", instruction: "The Ultimate Challenge: Slice the Tower into 10 pieces with 3 lines!",
        startShapeVertices: [
            { x: -80, y: -150 }, { x: 80, y: -150 }, { x: 80, y: -110 }, { x: -40, y: -110 },
            { x: -40, y: -70 }, { x: 80, y: -70 }, { x: 80, y: -30 }, { x: -40, y: -30 },
            { x: -40, y: 10 }, { x: 80, y: 10 }, { x: 80, y: 50 }, { x: -40, y: 50 },
            { x: -40, y: 90 }, { x: 80, y: 90 }, { x: 80, y: 130 }, { x: -80, y: 130 }
        ],
        color: '#805ad5', targetPieces: 10, maxLines: 3
    }
];
