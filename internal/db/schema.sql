PRAGMA foreign_keys = ON;

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
    amount_cents INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expense_year_month ON expense(year, month);
