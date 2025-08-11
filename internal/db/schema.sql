PRAGMA foreign_keys = ON;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    -- Optional admin flag (will be added automatically if missing on existing DBs)
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Sessions table for login management
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Income sources (replaces salary with more flexible structure)
CREATE TABLE IF NOT EXISTS income_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Budget sources (flexible budget categories with sources)
CREATE TABLE IF NOT EXISTS budget_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Legacy tables (keeping for backward compatibility)
CREATE TABLE IF NOT EXISTS salary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    UNIQUE(year, month)
);

CREATE TABLE IF NOT EXISTS budget (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    UNIQUE(year, month)
);

CREATE TABLE IF NOT EXISTS expense (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    category TEXT,
    description TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Manual budgets (bank amount + list of items) per user/month
CREATE TABLE IF NOT EXISTS manual_budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    bank_amount_cents INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, year, month),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS manual_budget_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_id) REFERENCES manual_budgets(id) ON DELETE CASCADE
);

-- Seed admin user only if it doesn't exist (do not overwrite password on subsequent migrations)
INSERT OR IGNORE INTO users (username, password_hash, email) VALUES 
('admin', '$2a$10$d6drRj7UUyiGwqskDPuSSuOy4yMWKJdfXJfNtLA98rE2Pw0SIfxxa', 'admin@localhost');


-- Indexes
CREATE INDEX IF NOT EXISTS idx_expense_year_month ON expense(year, month);
CREATE INDEX IF NOT EXISTS idx_income_sources_user_year_month ON income_sources(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_budget_sources_user_year_month ON budget_sources(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_budgets_user_year_month ON manual_budgets(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_manual_budget_items_budget_id ON manual_budget_items(budget_id);
