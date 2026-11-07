require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const pool = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");

// ── Auto-create tables on startup ────────────────────────────
async function initDB() {
    const sql = fs.readFileSync(path.join(__dirname, "init.sql"), "utf8");
    try {
        await pool.query(sql);
        console.log("✅ Database tables ready.");
    } catch (err) {
        console.error("❌ Failed to initialize DB tables:", err.message);
        process.exit(1);
    }
}

const app = express();

// Base subpath from APPLICATION_ROOT (like Coolify) or BASE_PATH, defaults to /mystudy-planner
const rawBase = process.env.APPLICATION_ROOT || process.env.BASE_PATH || "/mystudy-planner";
const BASE = ("/" + rawBase.trim().replace(/^\/+|\/+$/g, "")).replace(/^\/$/, "");

// Trust Coolify's reverse proxy (Traefik)
app.set("trust proxy", 1);

// CORS
app.use(cors({
    origin: [
        "https://abirdroid.ddns.net",
        "http://localhost:5000"
    ],
    credentials: true
}));

app.use(express.json());

const publicPath = path.join(__dirname, "public");

// ── Static frontend ──────────────────────────────────────────
// Support both with subpath and without (if Traefik strips prefix)
if (BASE) {
    app.use(BASE, express.static(publicPath));
}
app.use(express.static(publicPath));

// ── Health check ─────────────────────────────────────────────
const healthHandler = (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
};
if (BASE) {
    app.get(`${BASE}/health`, healthHandler);
}
app.get("/health", healthHandler);

// ── DB test ───────────────────────────────────────────────────
const testDbHandler = async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW() AS current_time");
        res.json({ success: true, time: result.rows[0].current_time });
    } catch (err) {
        console.error("DB test error:", err.message);
        res.status(500).json({ success: false, message: "DB connection failed" });
    }
};
if (BASE) {
    app.get(`${BASE}/api/test-db`, testDbHandler);
}
app.get("/api/test-db", testDbHandler);

// ── API routes ────────────────────────────────────────────────
if (BASE) {
    app.use(`${BASE}/api/auth`, authRoutes);
    app.use(`${BASE}/api/tasks`, taskRoutes);
}
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

// ── SPA fallback — serve index.html for all subpath routes ────
const sendIndex = (req, res) => res.sendFile(path.join(publicPath, "index.html"));

if (BASE) {
    app.get(`${BASE}`, sendIndex);
    app.get(`${BASE}/*splat`, sendIndex);
}
app.get("/*splat", sendIndex);

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`MyStudy Planner running on port ${PORT}`);
        console.log(`Base path: ${BASE || "/"}`);
    });
});
