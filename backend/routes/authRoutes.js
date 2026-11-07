
const express = require("express");
const router = express.Router();

const {
    register,
    login,
    getProfile
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

// Registration
router.post("/register", register);

// Login
router.post("/login", login);

// Protected Profile
router.get("/profile", authMiddleware, getProfile);

module.exports = router;
