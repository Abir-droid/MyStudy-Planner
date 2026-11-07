const { Pool } = require("pg");
require("dotenv").config();

let poolConfig;

if (process.env.DATABASE_URL) {
    poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ...(process.env.DB_SSL === "true" && {
            ssl: { rejectUnauthorized: false }
        })
    };
} else {
    poolConfig = {
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5432", 10),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ...(process.env.DB_SSL === "true" && {
            ssl: { rejectUnauthorized: false }
        })
    };
}

const pool = new Pool(poolConfig);

pool.on("error", (err) => {
    console.error("Unexpected DB client error:", err.message);
});

module.exports = pool;
