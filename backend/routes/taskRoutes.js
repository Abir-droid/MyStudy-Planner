
const express = require("express");
const router = express.Router();

const {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTask
} = require("../controllers/taskController");

const authMiddleware = require("../middleware/authMiddleware");

// All routes require login
router.use(authMiddleware);

// Get all tasks
router.get("/", getTasks);

// Create task
router.post("/", createTask);

// Update task
router.put("/:id", updateTask);

// Toggle completed status
router.patch("/:id/toggle", toggleTask);

// Delete task
router.delete("/:id", deleteTask);

module.exports = router;
