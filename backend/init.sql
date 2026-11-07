-- MyStudy Planner — Database Initialization
-- Uses unique table names so it never conflicts with other services sharing the same database.

CREATE TABLE IF NOT EXISTS mystudy_users (
    id            SERIAL PRIMARY KEY,
    full_name     VARCHAR(255) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mystudy_tasks (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES mystudy_users(id) ON DELETE CASCADE,
    title      VARCHAR(500) NOT NULL,
    subject    VARCHAR(255) NOT NULL,
    due_date   DATE         NOT NULL,
    priority   VARCHAR(10)  NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
    completed  BOOLEAN      DEFAULT FALSE,
    created_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mystudy_tasks_user_id ON mystudy_tasks(user_id);
