// Package repository provides data access for domain models using a SQL database.
package repository

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"time"

	"github.com/mdco1990/webapp/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

// Repository wraps a *sql.DB and exposes data access methods.
type Repository struct {
	db *sql.DB
	// feature flags detected from DB schema
	hasIsAdmin bool
	hasStatus  bool
}

// New creates a new Repository.
func New(db *sql.DB) *Repository {
	r := &Repository{db: db}
	// Detect if users table has is_admin column (SQLite specific PRAGMA)
	// If the PRAGMA query fails for any reason, default to false.
	var exists int
	// Using COUNT from pragma_table_info is safe on SQLite and returns 0/1
	if err := r.db.QueryRow(`SELECT COUNT(1) FROM pragma_table_info('users') WHERE name='is_admin'`).Scan(&exists); err == nil &&
		exists > 0 {
		r.hasIsAdmin = true
	}
	exists = 0
	if err := r.db.QueryRow(`SELECT COUNT(1) FROM pragma_table_info('users') WHERE name='status'`).Scan(&exists); err == nil && exists > 0 {
		r.hasStatus = true
	}
	return r
}

// Legacy methods

// UpsertSalary inserts or updates the salary for a given year/month.
func (r *Repository) UpsertSalary(
	ctx context.Context,
	ym domain.YearMonth,
	amount domain.Money,
) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO salary(year, month, amount_cents) VALUES(?, ?, ?)
		 ON CONFLICT(year, month) DO UPDATE SET amount_cents=excluded.amount_cents`,
		ym.Year, ym.Month, int64(amount))
	return err
}

// UpsertBudget inserts or updates the budget for a given year/month.
func (r *Repository) UpsertBudget(
	ctx context.Context,
	ym domain.YearMonth,
	amount domain.Money,
) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO budget(year, month, amount_cents) VALUES(?, ?, ?)
		 ON CONFLICT(year, month) DO UPDATE SET amount_cents=excluded.amount_cents`,
		ym.Year, ym.Month, int64(amount))
	return err
}

// AddExpense creates a new expense record.
func (r *Repository) AddExpense(ctx context.Context, e *domain.Expense) (int64, error) {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO expense(year, month, category, description, amount_cents)
		 VALUES(?, ?, ?, ?, ?)`, e.Year, e.Month, nullify(e.Category), e.Description, int64(e.AmountCents))
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// ListExpenses returns all expenses for the provided year/month.
func (r *Repository) ListExpenses(
	ctx context.Context,
	ym domain.YearMonth,
) ([]domain.Expense, error) {
	rows, err := r.db.QueryContext(
		ctx,
		`SELECT id, year, month, category, description, amount_cents, created_at FROM expense WHERE year=? AND month=? ORDER BY id DESC`,
		ym.Year,
		ym.Month,
	)
	if err != nil {
		return []domain.Expense{}, err
	}
	defer func() { _ = rows.Close() }()
	var out []domain.Expense
	for rows.Next() {
		var e domain.Expense
		var category sql.NullString
		var amount int64
		if err := rows.Scan(&e.ID, &e.Year, &e.Month, &category, &e.Description, &amount, &e.CreatedAt); err != nil {
			return []domain.Expense{}, err
		}
		e.Category = category.String
		e.AmountCents = domain.Money(amount)
		out = append(out, e)
	}
	// Ensure we return an empty slice instead of nil
	if out == nil {
		out = []domain.Expense{}
	}
	return out, rows.Err()
}

// DeleteExpense removes an expense by ID.
func (r *Repository) DeleteExpense(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM expense WHERE id=?`, id)
	return err
}

// GetSalary returns salary for a given year/month or 0 if none.
func (r *Repository) GetSalary(ctx context.Context, ym domain.YearMonth) (domain.Money, error) {
	var amount int64
	err := r.db.QueryRowContext(ctx, `SELECT amount_cents FROM salary WHERE year=? AND month=?`, ym.Year, ym.Month).
		Scan(&amount)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	return domain.Money(amount), err
}

// GetBudget returns budget for a given year/month or 0 if none.
func (r *Repository) GetBudget(ctx context.Context, ym domain.YearMonth) (domain.Money, error) {
	var amount int64
	err := r.db.QueryRowContext(ctx, `SELECT amount_cents FROM budget WHERE year=? AND month=?`, ym.Year, ym.Month).
		Scan(&amount)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	return domain.Money(amount), err
}

// GetExpensesTotal returns the sum of expenses for a given year/month.
func (r *Repository) GetExpensesTotal(
	ctx context.Context,
	ym domain.YearMonth,
) (domain.Money, error) {
	var total int64
	err := r.db.QueryRowContext(ctx, `SELECT COALESCE(SUM(amount_cents),0) FROM expense WHERE year=? AND month=?`, ym.Year, ym.Month).
		Scan(&total)
	return domain.Money(total), err
}

// Authentication methods

// CreateUser stores a new user and returns it.
func (r *Repository) CreateUser(
	ctx context.Context,
	username, password, email string,
) (*domain.User, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	result, err := r.db.ExecContext(ctx,
		func() string {
			if r.hasStatus {
				return `INSERT INTO users (username, password_hash, email, status) VALUES (?, ?, ?, 'pending')`
			}
			return `INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)`
		}(),
		username, string(hashedPassword), nullify(email))
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &domain.User{
		ID:        id,
		Username:  username,
		Email:     email,
		CreatedAt: time.Now(),
	}, nil
}

// GetUserByUsername retrieves a user by username along with the password hash.
func (r *Repository) GetUserByUsername(
	ctx context.Context,
	username string,
) (*domain.User, string, error) {
	if r.hasIsAdmin {
		return r.getUserByUsernameWithAdmin(ctx, username)
	}
	return r.getUserByUsernameWithoutAdmin(ctx, username)
}

// getUserByUsernameWithAdmin handles user lookup when is_admin column exists
func (r *Repository) getUserByUsernameWithAdmin(
	ctx context.Context,
	username string,
) (*domain.User, string, error) {
	var user domain.User
	var passwordHash string
	var email sql.NullString
	var lastLogin sql.NullTime
	var isAdminInt sql.NullInt64

	query := `SELECT id, username, password_hash, email, created_at, last_login, is_admin FROM users WHERE username = ?`
	err := r.db.QueryRowContext(ctx, query, username).Scan(
		&user.ID, &user.Username, &passwordHash, &email, &user.CreatedAt, &lastLogin, &isAdminInt,
	)
	if err != nil {
		return nil, "", err
	}

	r.populateUserFields(&user, email, lastLogin)
	user.IsAdmin = isAdminInt.Valid && isAdminInt.Int64 != 0
	return &user, passwordHash, nil
}

// getUserByUsernameWithoutAdmin handles user lookup when is_admin column doesn't exist
func (r *Repository) getUserByUsernameWithoutAdmin(
	ctx context.Context,
	username string,
) (*domain.User, string, error) {
	var user domain.User
	var passwordHash string
	var email sql.NullString
	var lastLogin sql.NullTime

	query := `SELECT id, username, password_hash, email, created_at, last_login FROM users WHERE username = ?`
	err := r.db.QueryRowContext(ctx, query, username).Scan(
		&user.ID, &user.Username, &passwordHash, &email, &user.CreatedAt, &lastLogin)
	if err != nil {
		return nil, "", err
	}

	r.populateUserFields(&user, email, lastLogin)
	// No is_admin column: treat built-in 'admin' username as admin
	user.IsAdmin = user.Username == "admin"
	return &user, passwordHash, nil
}

// populateUserFields sets common user fields from nullable database values
func (r *Repository) populateUserFields(
	user *domain.User,
	email sql.NullString,
	lastLogin sql.NullTime,
) {
	user.Email = email.String
	if lastLogin.Valid {
		user.LastLogin = &lastLogin.Time
	}
}

// GetUserByID retrieves a user by ID along with the password hash.
func (r *Repository) GetUserByID(ctx context.Context, userID int64) (*domain.User, string, error) {
	if r.hasIsAdmin {
		return r.getUserByIDWithAdmin(ctx, userID)
	}
	return r.getUserByIDWithoutAdmin(ctx, userID)
}

// getUserByIDWithAdmin handles user lookup by ID when is_admin column exists
func (r *Repository) getUserByIDWithAdmin(
	ctx context.Context,
	userID int64,
) (*domain.User, string, error) {
	var user domain.User
	var passwordHash string
	var email sql.NullString
	var lastLogin sql.NullTime
	var isAdminInt sql.NullInt64

	err := r.db.QueryRowContext(ctx,
		`SELECT id, username, password_hash, email, created_at, last_login, is_admin 
		 FROM users WHERE id = ?`, userID).Scan(
		&user.ID, &user.Username, &passwordHash, &email, &user.CreatedAt, &lastLogin, &isAdminInt)
	if err != nil {
		return nil, "", err
	}

	r.populateUserFields(&user, email, lastLogin)
	user.IsAdmin = isAdminInt.Valid && isAdminInt.Int64 != 0
	return &user, passwordHash, nil
}

// getUserByIDWithoutAdmin handles user lookup by ID when is_admin column doesn't exist
func (r *Repository) getUserByIDWithoutAdmin(
	ctx context.Context,
	userID int64,
) (*domain.User, string, error) {
	var user domain.User
	var passwordHash string
	var email sql.NullString
	var lastLogin sql.NullTime

	err := r.db.QueryRowContext(ctx,
		`SELECT id, username, password_hash, email, created_at, last_login 
		 FROM users WHERE id = ?`, userID).Scan(
		&user.ID, &user.Username, &passwordHash, &email, &user.CreatedAt, &lastLogin)
	if err != nil {
		return nil, "", err
	}

	r.populateUserFields(&user, email, lastLogin)
	user.IsAdmin = user.Username == "admin"
	return &user, passwordHash, nil
}

// IsUserAdmin returns true if the user has admin privileges.
// It supports both schema with is_admin column and legacy fallback to username 'admin'.
// IsUserAdmin reports whether the given user has admin privileges.
func (r *Repository) IsUserAdmin(ctx context.Context, userID int64) (bool, error) {
	if r.hasIsAdmin {
		var isAdmin int64
		if err := r.db.QueryRowContext(ctx, `SELECT COALESCE(is_admin, 0) FROM users WHERE id = ?`, userID).Scan(&isAdmin); err != nil {
			return false, err
		}
		return isAdmin != 0, nil
	}
	var username string
	if err := r.db.QueryRowContext(ctx, `SELECT username FROM users WHERE id = ?`, userID).Scan(&username); err != nil {
		return false, err
	}
	return username == "admin", nil
}

// UpdateUserPassword changes the stored password hash for a user.
func (r *Repository) UpdateUserPassword(
	ctx context.Context,
	userID int64,
	newPassword string,
) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = r.db.ExecContext(ctx,
		`UPDATE users SET password_hash = ? WHERE id = ?`,
		string(hashedPassword), userID)
	return err
}

// UpdateLastLogin sets the user's last_login to current timestamp.
func (r *Repository) UpdateLastLogin(ctx context.Context, userID int64) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, userID)
	return err
}

// CreateSession creates a new session for a user with a 24h expiration.
func (r *Repository) CreateSession(ctx context.Context, userID int64) (*domain.Session, error) {
	sessionID := generateSessionID()
	expiresAt := time.Now().Add(24 * time.Hour) // 24 hour sessions

	_, err := r.db.ExecContext(ctx,
		`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`,
		sessionID, userID, expiresAt)
	if err != nil {
		return nil, err
	}

	return &domain.Session{
		ID:        sessionID,
		UserID:    userID,
		CreatedAt: time.Now(),
		ExpiresAt: expiresAt,
	}, nil
}

// GetSession fetches a non-expired session by ID.
func (r *Repository) GetSession(ctx context.Context, sessionID string) (*domain.Session, error) {
	var session domain.Session
	err := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, created_at, expires_at FROM sessions 
		 WHERE id = ? AND expires_at > CURRENT_TIMESTAMP`, sessionID).Scan(
		&session.ID, &session.UserID, &session.CreatedAt, &session.ExpiresAt)
	if err != nil {
		return nil, err
	}

	return &session, nil
}

// DeleteSession removes a session by ID.
func (r *Repository) DeleteSession(ctx context.Context, sessionID string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM sessions WHERE id = ?`, sessionID)
	return err
}

// Income Sources methods

// CreateIncomeSource creates a new income source for a user and month.
func (r *Repository) CreateIncomeSource(
	ctx context.Context,
	userID int64,
	req domain.CreateIncomeSourceRequest,
) (*domain.IncomeSource, error) {
	now := time.Now()
	result, err := r.db.ExecContext(
		ctx,
		`INSERT INTO income_sources (user_id, name, year, month, amount_cents, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		userID,
		req.Name,
		req.Year,
		req.Month,
		int64(req.AmountCents),
		now,
		now,
	)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &domain.IncomeSource{
		ID:          id,
		UserID:      userID,
		Name:        req.Name,
		YearMonth:   domain.YearMonth{Year: req.Year, Month: req.Month},
		AmountCents: req.AmountCents,
		CreatedAt:   now,
		UpdatedAt:   now,
	}, nil
}

// UpdateIncomeSource updates an existing income source.
func (r *Repository) UpdateIncomeSource(
	ctx context.Context,
	id int64,
	userID int64,
	req domain.UpdateSourceRequest,
) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE income_sources SET name = ?, amount_cents = ?, updated_at = CURRENT_TIMESTAMP
		 WHERE id = ? AND user_id = ?`,
		req.Name, int64(req.AmountCents), id, userID)
	return err
}

// ListIncomeSources lists income sources for a user and month.
func (r *Repository) ListIncomeSources(
	ctx context.Context,
	userID int64,
	ym domain.YearMonth,
) ([]domain.IncomeSource, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, name, year, month, amount_cents, created_at, updated_at
		 FROM income_sources WHERE user_id = ? AND year = ? AND month = ?
		 ORDER BY name`,
		userID, ym.Year, ym.Month)
	if err != nil {
		return []domain.IncomeSource{}, err
	}
	defer func() { _ = rows.Close() }()

	var sources []domain.IncomeSource
	for rows.Next() {
		var source domain.IncomeSource
		var amount int64
		if err := rows.Scan(&source.ID, &source.UserID, &source.Name,
			&source.Year, &source.Month, &amount, &source.CreatedAt, &source.UpdatedAt); err != nil {
			return []domain.IncomeSource{}, err
		}
		source.AmountCents = domain.Money(amount)
		sources = append(sources, source)
	}

	if sources == nil {
		sources = []domain.IncomeSource{}
	}
	return sources, rows.Err()
}

// DeleteIncomeSource deletes an income source by ID for a user.
func (r *Repository) DeleteIncomeSource(ctx context.Context, id int64, userID int64) error {
	_, err := r.db.ExecContext(
		ctx,
		`DELETE FROM income_sources WHERE id = ? AND user_id = ?`,
		id,
		userID,
	)
	return err
}

// Budget Sources methods

// CreateBudgetSource creates a new budget source for a user and month.
func (r *Repository) CreateBudgetSource(
	ctx context.Context,
	userID int64,
	req domain.CreateBudgetSourceRequest,
) (*domain.BudgetSource, error) {
	now := time.Now()
	result, err := r.db.ExecContext(
		ctx,
		`INSERT INTO budget_sources (user_id, name, year, month, amount_cents, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		userID,
		req.Name,
		req.Year,
		req.Month,
		int64(req.AmountCents),
		now,
		now,
	)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &domain.BudgetSource{
		ID:          id,
		UserID:      userID,
		Name:        req.Name,
		YearMonth:   domain.YearMonth{Year: req.Year, Month: req.Month},
		AmountCents: req.AmountCents,
		CreatedAt:   now,
		UpdatedAt:   now,
	}, nil
}

// UpdateBudgetSource updates an existing budget source.
func (r *Repository) UpdateBudgetSource(
	ctx context.Context,
	id int64,
	userID int64,
	req domain.UpdateSourceRequest,
) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE budget_sources SET name = ?, amount_cents = ?, updated_at = CURRENT_TIMESTAMP
		 WHERE id = ? AND user_id = ?`,
		req.Name, int64(req.AmountCents), id, userID)
	return err
}

// ListBudgetSources lists budget sources for a user and month.
func (r *Repository) ListBudgetSources(
	ctx context.Context,
	userID int64,
	ym domain.YearMonth,
) ([]domain.BudgetSource, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, name, year, month, amount_cents, created_at, updated_at
		 FROM budget_sources WHERE user_id = ? AND year = ? AND month = ?
		 ORDER BY name`,
		userID, ym.Year, ym.Month)
	if err != nil {
		return []domain.BudgetSource{}, err
	}
	defer func() { _ = rows.Close() }()

	var sources []domain.BudgetSource
	for rows.Next() {
		var source domain.BudgetSource
		var amount int64
		if err := rows.Scan(&source.ID, &source.UserID, &source.Name,
			&source.Year, &source.Month, &amount, &source.CreatedAt, &source.UpdatedAt); err != nil {
			return []domain.BudgetSource{}, err
		}
		source.AmountCents = domain.Money(amount)
		sources = append(sources, source)
	}

	if sources == nil {
		sources = []domain.BudgetSource{}
	}
	return sources, rows.Err()
}

// DeleteBudgetSource deletes a budget source by ID for a user.
func (r *Repository) DeleteBudgetSource(ctx context.Context, id int64, userID int64) error {
	_, err := r.db.ExecContext(
		ctx,
		`DELETE FROM budget_sources WHERE id = ? AND user_id = ?`,
		id,
		userID,
	)
	return err
}

// Manual Budget methods

// GetManualBudget returns a manual budget with its items for the given user/month.
func (r *Repository) GetManualBudget(
	ctx context.Context,
	userID int64,
	ym domain.YearMonth,
) (*domain.ManualBudget, error) {
	var (
		id   int64
		bank int64
	)
	err := r.db.QueryRowContext(
		ctx,
		`SELECT id, bank_amount_cents FROM manual_budgets WHERE user_id = ? AND year = ? AND month = ?`,
		userID,
		ym.Year,
		ym.Month,
	).Scan(&id, &bank)
	if errors.Is(err, sql.ErrNoRows) {
		// Return empty structure
		return &domain.ManualBudget{
			UserID:          userID,
			YearMonth:       ym,
			BankAmountCents: 0,
			Items:           []domain.ManualBudgetItem{},
		}, nil
	}
	if err != nil {
		return nil, err
	}

	rows, err := r.db.QueryContext(
		ctx,
		`SELECT id, name, amount_cents FROM manual_budget_items WHERE budget_id = ? ORDER BY id`,
		id,
	)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	items := []domain.ManualBudgetItem{}
	for rows.Next() {
		var it domain.ManualBudgetItem
		var amount int64
		if err := rows.Scan(&it.ID, &it.Name, &amount); err != nil {
			return nil, err
		}
		it.BudgetID = id
		it.AmountCents = domain.Money(amount)
		items = append(items, it)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &domain.ManualBudget{
		ID:              id,
		UserID:          userID,
		YearMonth:       ym,
		BankAmountCents: domain.Money(bank),
		Items:           items,
	}, nil
}

// UpsertManualBudget replaces the manual budget and its items for a given user/month atomically
// UpsertManualBudget replaces the manual budget and items for a user/month atomically.
func (r *Repository) UpsertManualBudget(
	ctx context.Context,
	userID int64,
	ym domain.YearMonth,
	bank domain.Money,
	items []domain.ManualBudgetItem,
) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	budgetID, err := r.upsertManualBudgetRow(ctx, tx, userID, ym, bank)
	if err != nil {
		return err
	}

	if err = r.replaceManualBudgetItems(ctx, tx, budgetID, items); err != nil {
		return err
	}

	return tx.Commit()
}

// upsertManualBudgetRow inserts or updates the manual_budgets row and returns its ID
func (r *Repository) upsertManualBudgetRow(
	ctx context.Context,
	tx *sql.Tx,
	userID int64,
	ym domain.YearMonth,
	bank domain.Money,
) (int64, error) {
	// Try update first
	res, err := tx.ExecContext(
		ctx,
		`UPDATE manual_budgets SET bank_amount_cents = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND year = ? AND month = ?`,
		int64(bank),
		userID,
		ym.Year,
		ym.Month,
	)
	if err != nil {
		return 0, err
	}

	rowsAff, _ := res.RowsAffected()
	if rowsAff == 0 {
		// Insert new row
		result, err := tx.ExecContext(
			ctx,
			`INSERT INTO manual_budgets(user_id, year, month, bank_amount_cents) VALUES(?, ?, ?, ?)`,
			userID,
			ym.Year,
			ym.Month,
			int64(bank),
		)
		if err != nil {
			return 0, err
		}
		return result.LastInsertId()
	}

	// Get ID for existing row
	var budgetID int64
	err = tx.QueryRowContext(
		ctx,
		`SELECT id FROM manual_budgets WHERE user_id = ? AND year = ? AND month = ?`,
		userID,
		ym.Year,
		ym.Month,
	).Scan(&budgetID)
	return budgetID, err
}

// replaceManualBudgetItems deletes existing items and inserts new ones for the budget
func (r *Repository) replaceManualBudgetItems(
	ctx context.Context,
	tx *sql.Tx,
	budgetID int64,
	items []domain.ManualBudgetItem,
) error {
	// Delete existing items
	if _, err := tx.ExecContext(ctx, `DELETE FROM manual_budget_items WHERE budget_id = ?`, budgetID); err != nil {
		return err
	}

	// Insert new items if any
	if len(items) == 0 {
		return nil
	}

	stmt, err := tx.PrepareContext(
		ctx,
		`INSERT INTO manual_budget_items(budget_id, name, amount_cents) VALUES(?, ?, ?)`,
	)
	if err != nil {
		return err
	}
	defer func() { _ = stmt.Close() }()

	for _, it := range items {
		if _, err := stmt.ExecContext(ctx, budgetID, it.Name, int64(it.AmountCents)); err != nil {
			return err
		}
	}
	return nil
}

// Monthly data aggregation

// GetMonthlyData aggregates monthly income, budget sources, and expenses.
func (r *Repository) GetMonthlyData(
	ctx context.Context,
	userID int64,
	ym domain.YearMonth,
) (*domain.MonthlyData, error) {
	incomeSources, err := r.ListIncomeSources(ctx, userID, ym)
	if err != nil {
		return nil, err
	}

	budgetSources, err := r.ListBudgetSources(ctx, userID, ym)
	if err != nil {
		return nil, err
	}

	expenses, err := r.ListExpenses(ctx, ym)
	if err != nil {
		return nil, err
	}

	var totalIncome, totalBudget, totalExpenses domain.Money
	for _, source := range incomeSources {
		totalIncome += source.AmountCents
	}
	for _, source := range budgetSources {
		totalBudget += source.AmountCents
	}
	for _, expense := range expenses {
		totalExpenses += expense.AmountCents
	}

	monthNames := []string{
		"", "January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December",
	}

	monthName := "Unknown"
	if ym.Month >= 1 && ym.Month <= 12 {
		monthName = monthNames[ym.Month]
	}

	return &domain.MonthlyData{
		YearMonth:     ym,
		MonthName:     monthName,
		IncomeSources: incomeSources,
		BudgetSources: budgetSources,
		Expenses:      expenses,
		TotalIncome:   totalIncome,
		TotalBudget:   totalBudget,
		TotalExpenses: totalExpenses,
		Remaining:     totalIncome - totalExpenses,
	}, nil
}

// Utility functions
func nullify(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func generateSessionID() string {
	bytes := make([]byte, 32)
	_, _ = rand.Read(bytes) // ignore error; non-crypto ID sufficient for sessions here
	return hex.EncodeToString(bytes)
}

// --- User management extensions ---

// ListUsers lists users optionally filtered by status (pending/approved/rejected) if status column exists.
func (r *Repository) ListUsers(ctx context.Context, status string) ([]domain.User, error) {
	base := "SELECT id, username, email, created_at, last_login"
	if r.hasIsAdmin {
		base += ", is_admin"
	}
	if r.hasStatus {
		base += ", status"
	}
	base += " FROM users"
	args := []any{}
	if status != "" && r.hasStatus {
		base += " WHERE status = ?"
		args = append(args, status)
	}
	base += " ORDER BY created_at DESC"
	rows, err := r.db.QueryContext(ctx, base, args...)
	if err != nil {
		return []domain.User{}, err
	}
	defer rows.Close()
	users := []domain.User{}
	for rows.Next() {
		var u domain.User
		var email sql.NullString
		var last sql.NullTime
		var isAdmin sql.NullInt64
		var st sql.NullString
		scan := []any{&u.ID, &u.Username, &email, &u.CreatedAt, &last}
		if r.hasIsAdmin {
			scan = append(scan, &isAdmin)
		}
		if r.hasStatus {
			scan = append(scan, &st)
		}
		if err := rows.Scan(scan...); err != nil {
			return []domain.User{}, err
		}
		u.Email = email.String
		if last.Valid {
			u.LastLogin = &last.Time
		}
		if r.hasIsAdmin {
			u.IsAdmin = isAdmin.Valid && isAdmin.Int64 != 0
		}
		if r.hasStatus {
			u.Status = st.String
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return []domain.User{}, err
	}
	return users, nil
}

// UpdateUserStatus updates status if supported.
func (r *Repository) UpdateUserStatus(ctx context.Context, userID int64, status string) error {
	if !r.hasStatus {
		return errors.New("status column not present")
	}
	switch status {
	case "pending", "approved", "rejected":
		// ok
	default:
		return errors.New("invalid status value")
	}
	_, err := r.db.ExecContext(ctx, `UPDATE users SET status = ? WHERE id = ?`, status, userID)
	return err
}

// DeleteUser removes a user by ID.
func (r *Repository) DeleteUser(ctx context.Context, userID int64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM users WHERE id = ?`, userID)
	return err
}
