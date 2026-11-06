
// ===============================
// MyStudy Planner - Backend Server
// ===============================

// Load environment variables first
require("dotenv").config();

const express = require("express");
const cors = require("cors");

// Database connection
const pool = require("./config/db");

// Authentication routes
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const app = express();

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());
app.use(express.json());

// ===============================
// HOME API
// ===============================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "MyStudy Planner Backend is Running!"
    });
});

// ===============================
// DATABASE TEST API
// ===============================

app.get("/api/test-db", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT NOW() AS current_time"
        );

        res.json({
            success: true,
            message: "PostgreSQL Connected Successfully!",
            time: result.rows[0].current_time
        });

    } catch (error) {
        console.error("Database Error:", error.message);

        res.status(500).json({
            success: false,
            message: "Database Connection Failed"
        });
    }
});

// ===============================
// AUTHENTICATION API
// ===============================

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

// ===============================
// SERVER START
// ===============================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`MyStudy Planner Server running on port ${PORT}`);
});
