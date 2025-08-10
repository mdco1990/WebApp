package service

import (
	"context"
	"database/sql"
	"testing"

	"github.com/personal/webapp/internal/db"
	"github.com/personal/webapp/internal/domain"
	"github.com/personal/webapp/internal/repository"
)

func newTestService(t *testing.T) *Service {
	t.Helper()
	dbConn, err := db.Open("sqlite", ":memory:", "")
	if err != nil {
		t.Fatalf("db open: %v", err)
	}
	if err := db.Migrate(dbConn); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	repo := repository.New(dbConn)
	return New(repo)
}

func TestSummary(t *testing.T) {
	svc := newTestService(t)
	ctx := context.Background()
	ym := domain.YearMonth{Year: 2025, Month: 8}
	if err := svc.SetSalary(ctx, ym, 500000); err != nil {
		t.Fatal(err)
	}
	if err := svc.SetBudget(ctx, ym, 200000); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.AddExpense(ctx, &domain.Expense{YearMonth: ym, Description: "Coffee", AmountCents: 500}); err != nil {
		t.Fatal(err)
	}
	sum, err := svc.Summary(ctx, ym)
	if err != nil {
		t.Fatal(err)
	}
	if sum.Remaining != 699500 {
		t.Fatalf("unexpected remaining: %v", sum.Remaining)
	}
}

func TestValidation(t *testing.T) {
	svc := newTestService(t)
	ctx := context.Background()
	err := svc.SetSalary(ctx, domain.YearMonth{Year: 1800, Month: 1}, 100)
	if err == nil {
		t.Fatal("expected validation error")
	}
}

func BenchmarkInsertExpense(b *testing.B) {
	dbConn, _ := db.Open("sqlite", ":memory:", "")
	_ = db.Migrate(dbConn)
	repo := repository.New(dbConn)
	s := New(repo)
	ctx := context.Background()
	ym := domain.YearMonth{Year: 2025, Month: 8}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = s.AddExpense(ctx, &domain.Expense{YearMonth: ym, Description: "exp", AmountCents: 1})
	}
}

// Ensure the sqlite driver is linked in tests.
var _ sql.DB
