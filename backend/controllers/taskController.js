const pool = require("../config/db");

// Get all tasks of logged-in user
const getTasks = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                id,
                title,
                subject,
                due_date AS "dueDate",
                priority,
                completed,
                created_at AS "createdAt"
             FROM mystudy_tasks
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.status(200).json({
            success: true,
            tasks: result.rows
        });
    } catch (error) {
        console.error("Get tasks error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to get tasks"
        });
    }
};

// Create a new task
const createTask = async (req, res) => {
    try {
        const { title, subject, dueDate, priority } = req.body;

        if (!title || !subject || !dueDate || !priority) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if (!["Low", "Medium", "High"].includes(priority)) {
            return res.status(400).json({
                success: false,
                message: "Invalid priority"
            });
        }

        const result = await pool.query(
            `INSERT INTO mystudy_tasks
                (user_id, title, subject, due_date, priority)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING
                id, title, subject,
                due_date AS "dueDate",
                priority, completed`,
            [req.user.id, title, subject, dueDate, priority]
        );

        res.status(201).json({
            success: true,
            message: "Task created successfully",
            task: result.rows[0]
        });
    } catch (error) {
        console.error("CREATE TASK ERROR:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create task"
        });
    }
};

// Update a task
const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, subject, dueDate, priority, completed } = req.body;

        if (!title || !subject || !dueDate || !priority) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if (!["Low", "Medium", "High"].includes(priority)) {
            return res.status(400).json({
                success: false,
                message: "Invalid priority"
            });
        }

        const result = await pool.query(
            `UPDATE mystudy_tasks
             SET title = $1,
                 subject = $2,
                 due_date = $3,
                 priority = $4,
                 completed = COALESCE($5, completed)
             WHERE id = $6 AND user_id = $7
             RETURNING
                id, title, subject,
                due_date AS "dueDate",
                priority, completed`,
            [
                title,
                subject,
                dueDate,
                priority,
                completed ?? null,
                id,
                req.user.id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Task updated successfully",
            task: result.rows[0]
        });
    } catch (error) {
        console.error("Update task error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update task"
        });
    }
};

// Delete a task
const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM mystudy_tasks WHERE id = $1 AND user_id = $2 RETURNING id",
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Task deleted successfully"
        });
    } catch (error) {
        console.error("Delete task error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete task"
        });
    }
};

// Toggle task completion
const toggleTask = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE mystudy_tasks
             SET completed = NOT completed
             WHERE id = $1 AND user_id = $2
             RETURNING id, completed`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        res.status(200).json({
            success: true,
            task: result.rows[0]
        });
    } catch (error) {
        console.error("Toggle task error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to toggle task"
        });
    }
};

module.exports = {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTask
};
