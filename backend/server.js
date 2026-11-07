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
const BASE = "/mystudy-planner";

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

// ── Static frontend ──────────────────────────────────────────
app.use(BASE, express.static(path.join(__dirname, "public")));

// ── Health check ─────────────────────────────────────────────
app.get(`${BASE}/health`, (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── DB test ───────────────────────────────────────────────────
app.get(`${BASE}/api/test-db`, async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW() AS current_time");
        res.json({ success: true, time: result.rows[0].current_time });
    } catch (err) {
        console.error("DB test error:", err.message);
        res.status(500).json({ success: false, message: "DB connection failed" });
    }
});

// ── API routes ────────────────────────────────────────────────
app.use(`${BASE}/api/auth`, authRoutes);
app.use(`${BASE}/api/tasks`, taskRoutes);

// ── SPA fallback — serve index.html for all subpath routes ────
app.get(`${BASE}`, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get(`${BASE}/*splat`, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

initDB().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`MyStudy Planner running on port ${PORT}`);
        console.log(`Accessible at ${BASE}`);
    });
});
