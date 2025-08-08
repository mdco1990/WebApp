package repository

import (
	"context"
	"database/sql"

	"github.com/personal/webapp/internal/domain"
)

type Repository struct {
	db *sql.DB
}

func New(db *sql.DB) *Repository { return &Repository{db: db} }

func (r *Repository) UpsertSalary(ctx context.Context, ym domain.YearMonth, amount domain.Money) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO salary(year, month, amount_cents) VALUES(?, ?, ?)
		 ON CONFLICT(year, month) DO UPDATE SET amount_cents=excluded.amount_cents`,
		ym.Year, ym.Month, int64(amount))
	return err
}

func (r *Repository) UpsertBudget(ctx context.Context, ym domain.YearMonth, amount domain.Money) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO budget(year, month, amount_cents) VALUES(?, ?, ?)
		 ON CONFLICT(year, month) DO UPDATE SET amount_cents=excluded.amount_cents`,
		ym.Year, ym.Month, int64(amount))
	return err
}

func (r *Repository) AddExpense(ctx context.Context, e *domain.Expense) (int64, error) {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO expense(year, month, category, description, amount_cents)
		 VALUES(?, ?, ?, ?, ?)`, e.Year, e.Month, nullify(e.Category), e.Description, int64(e.AmountCents))
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (r *Repository) ListExpenses(ctx context.Context, ym domain.YearMonth) ([]domain.Expense, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, year, month, category, description, amount_cents FROM expense WHERE year=? AND month=? ORDER BY id DESC`,
		ym.Year, ym.Month)
	if err != nil { return nil, err }
	defer rows.Close()
	var out []domain.Expense
	for rows.Next() {
		var e domain.Expense
		var category sql.NullString
		var amount int64
		if err := rows.Scan(&e.ID, &e.Year, &e.Month, &category, &e.Description, &amount); err != nil { return nil, err }
		e.Category = category.String
		e.AmountCents = domain.Money(amount)
		out = append(out, e)
	}
	return out, rows.Err()
}

func (r *Repository) DeleteExpense(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM expense WHERE id=?`, id)
	return err
}

func (r *Repository) GetSalary(ctx context.Context, ym domain.YearMonth) (domain.Money, error) {
	var amount int64
	err := r.db.QueryRowContext(ctx, `SELECT amount_cents FROM salary WHERE year=? AND month=?`, ym.Year, ym.Month).Scan(&amount)
	if err == sql.ErrNoRows { return 0, nil }
	return domain.Money(amount), err
}

func (r *Repository) GetBudget(ctx context.Context, ym domain.YearMonth) (domain.Money, error) {
	var amount int64
	err := r.db.QueryRowContext(ctx, `SELECT amount_cents FROM budget WHERE year=? AND month=?`, ym.Year, ym.Month).Scan(&amount)
	if err == sql.ErrNoRows { return 0, nil }
	return domain.Money(amount), err
}

func (r *Repository) GetExpensesTotal(ctx context.Context, ym domain.YearMonth) (domain.Money, error) {
	var total int64
	err := r.db.QueryRowContext(ctx, `SELECT COALESCE(SUM(amount_cents),0) FROM expense WHERE year=? AND month=?`, ym.Year, ym.Month).Scan(&total)
	return domain.Money(total), err
}

func nullify(s string) any {
	if s == "" { return nil }
	return s
}
