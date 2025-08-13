package repository

import (
	"context"
	"database/sql"
	"testing"

	_ "github.com/glebarez/go-sqlite" // SQLite driver
	"github.com/mdco1990/webapp/internal/domain"
)

// Test database helper
func setupTestDB(tb testing.TB) (*Repository, func()) {
	tb.Helper()

	// Create in-memory SQLite database
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		tb.Fatalf("failed to open test database: %v", err)
	}

	// Create schema
	schema := `
	CREATE TABLE manual_budgets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		year INTEGER NOT NULL,
		month INTEGER NOT NULL,
		bank_amount_cents INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(user_id, year, month)
	);

	CREATE TABLE manual_budget_items (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		budget_id INTEGER NOT NULL,
		name TEXT NOT NULL,
		amount_cents INTEGER NOT NULL,
		FOREIGN KEY (budget_id) REFERENCES manual_budgets(id) ON DELETE CASCADE
	);
	`

	if _, err := db.Exec(schema); err != nil {
		tb.Fatalf("failed to create test schema: %v", err)
	}

	repo := &Repository{db: db}
	cleanup := func() {
		if err := db.Close(); err != nil {
			tb.Errorf("failed to close test database: %v", err)
		}
	}

	return repo, cleanup
}

func TestRepository_ManualBudget_CRUD(t *testing.T) {
	repo, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.Background()
	userID := int64(1)
	ym := domain.YearMonth{Year: 2024, Month: 1}

	t.Run("GetManualBudget_Empty", func(t *testing.T) {
		// Should return empty budget when none exists
		budget, err := repo.GetManualBudget(ctx, userID, ym)
		if err != nil {
			t.Fatalf("expected no error, got: %v", err)
		}

		if budget.UserID != userID {
			t.Errorf("expected UserID %d, got %d", userID, budget.UserID)
		}
		if budget.YearMonth != ym {
			t.Errorf("expected YearMonth %+v, got %+v", ym, budget.YearMonth)
		}
		if budget.BankAmountCents != 0 {
			t.Errorf("expected BankAmountCents 0, got %d", budget.BankAmountCents)
		}
		if len(budget.Items) != 0 {
			t.Errorf("expected empty items, got %d items", len(budget.Items))
		}
	})

	t.Run("UpsertManualBudget_Create", func(t *testing.T) {
		// Create new manual budget with items
		bankAmount := domain.Money(250000) // $2500
		items := []domain.ManualBudgetItem{
			{Name: "Salary", AmountCents: domain.Money(500000)},    // $5000
			{Name: "Rent", AmountCents: domain.Money(-120000)},     // -$1200
			{Name: "Groceries", AmountCents: domain.Money(-30000)}, // -$300
		}

		err := repo.UpsertManualBudget(ctx, userID, ym, bankAmount, items)
		if err != nil {
			t.Fatalf("failed to upsert manual budget: %v", err)
		}

		// Verify data was saved
		budget, err := repo.GetManualBudget(ctx, userID, ym)
		if err != nil {
			t.Fatalf("failed to get manual budget: %v", err)
		}

		if budget.BankAmountCents != bankAmount {
			t.Errorf("expected BankAmountCents %d, got %d", bankAmount, budget.BankAmountCents)
		}
		if len(budget.Items) != 3 {
			t.Errorf("expected 3 items, got %d", len(budget.Items))
		}

		// Verify items
		expectedItems := map[string]domain.Money{
			"Salary":    500000,
			"Rent":      -120000,
			"Groceries": -30000,
		}

		for _, item := range budget.Items {
			expectedAmount, exists := expectedItems[item.Name]
			if !exists {
				t.Errorf("unexpected item: %s", item.Name)
				continue
			}
			if item.AmountCents != expectedAmount {
				t.Errorf("item %s: expected amount %d, got %d",
					item.Name, expectedAmount, item.AmountCents)
			}
		}
	})

	t.Run("UpsertManualBudget_Update", func(t *testing.T) {
		// Update existing manual budget
		newBankAmount := domain.Money(300000) // $3000
		newItems := []domain.ManualBudgetItem{
			{Name: "Salary", AmountCents: domain.Money(550000)},    // Updated: $5500
			{Name: "Utilities", AmountCents: domain.Money(-15000)}, // New: -$150
		}

		err := repo.UpsertManualBudget(ctx, userID, ym, newBankAmount, newItems)
		if err != nil {
			t.Fatalf("failed to update manual budget: %v", err)
		}

		// Verify updates
		budget, err := repo.GetManualBudget(ctx, userID, ym)
		if err != nil {
			t.Fatalf("failed to get updated manual budget: %v", err)
		}

		if budget.BankAmountCents != newBankAmount {
			t.Errorf("expected updated BankAmountCents %d, got %d",
				newBankAmount, budget.BankAmountCents)
		}
		if len(budget.Items) != 2 {
			t.Errorf("expected 2 items after update, got %d", len(budget.Items))
		}

		// Verify old items are gone and new items exist
		itemNames := make(map[string]bool)
		for _, item := range budget.Items {
			itemNames[item.Name] = true
		}

		if !itemNames["Salary"] || !itemNames["Utilities"] {
			t.Error("expected Salary and Utilities items")
		}
		if itemNames["Rent"] || itemNames["Groceries"] {
			t.Error("old items (Rent, Groceries) should be removed")
		}
	})

	t.Run("UpsertManualBudget_EmptyItems", func(t *testing.T) {
		// Update with empty items list
		bankAmount := domain.Money(100000) // $1000
		var emptyItems []domain.ManualBudgetItem

		err := repo.UpsertManualBudget(ctx, userID, ym, bankAmount, emptyItems)
		if err != nil {
			t.Fatalf("failed to update manual budget with empty items: %v", err)
		}

		// Verify all items are removed
		budget, err := repo.GetManualBudget(ctx, userID, ym)
		if err != nil {
			t.Fatalf("failed to get manual budget: %v", err)
		}

		if budget.BankAmountCents != bankAmount {
			t.Errorf("expected BankAmountCents %d, got %d", bankAmount, budget.BankAmountCents)
		}
		if len(budget.Items) != 0 {
			t.Errorf("expected no items, got %d", len(budget.Items))
		}
	})

	t.Run("ManualBudget_MultipleUsers", func(t *testing.T) {
		// Test data isolation between users
		user1ID := int64(1)
		user2ID := int64(2)

		// Create budget for user 2
		user2BankAmount := domain.Money(500000)
		user2Items := []domain.ManualBudgetItem{
			{Name: "User2 Salary", AmountCents: domain.Money(600000)},
		}

		err := repo.UpsertManualBudget(ctx, user2ID, ym, user2BankAmount, user2Items)
		if err != nil {
			t.Fatalf("failed to create budget for user2: %v", err)
		}

		// Get budget for user 1 - should still exist with previous data
		user1Budget, err := repo.GetManualBudget(ctx, user1ID, ym)
		if err != nil {
			t.Fatalf("failed to get user1 budget: %v", err)
		}

		// Get budget for user 2
		user2Budget, err := repo.GetManualBudget(ctx, user2ID, ym)
		if err != nil {
			t.Fatalf("failed to get user2 budget: %v", err)
		}

		// Verify isolation
		if user1Budget.BankAmountCents == user2Budget.BankAmountCents {
			t.Error("user budgets should be different")
		}
		if len(user1Budget.Items) == len(user2Budget.Items) {
			t.Error("user budget items should be different")
		}

		// Verify user2 has correct data
		if user2Budget.BankAmountCents != user2BankAmount {
			t.Errorf("user2: expected BankAmountCents %d, got %d",
				user2BankAmount, user2Budget.BankAmountCents)
		}
	})

	t.Run("ManualBudget_MultipleMonths", func(t *testing.T) {
		// Test data isolation between months
		febYM := domain.YearMonth{Year: 2024, Month: 2}

		// Create budget for February
		febBankAmount := domain.Money(400000)
		febItems := []domain.ManualBudgetItem{
			{Name: "Feb Salary", AmountCents: domain.Money(500000)},
			{Name: "Feb Rent", AmountCents: domain.Money(-125000)},
		}

		err := repo.UpsertManualBudget(ctx, userID, febYM, febBankAmount, febItems)
		if err != nil {
			t.Fatalf("failed to create February budget: %v", err)
		}

		// Get January budget - should be unchanged
		janBudget, err := repo.GetManualBudget(ctx, userID, ym)
		if err != nil {
			t.Fatalf("failed to get January budget: %v", err)
		}

		// Get February budget
		febBudget, err := repo.GetManualBudget(ctx, userID, febYM)
		if err != nil {
			t.Fatalf("failed to get February budget: %v", err)
		}

		// Verify isolation
		if janBudget.BankAmountCents == febBudget.BankAmountCents {
			t.Error("different months should have different bank amounts")
		}
		if len(febBudget.Items) != 2 {
			t.Errorf("February should have 2 items, got %d", len(febBudget.Items))
		}

		// Verify February data
		if febBudget.BankAmountCents != febBankAmount {
			t.Errorf("February: expected BankAmountCents %d, got %d",
				febBankAmount, febBudget.BankAmountCents)
		}
	})
}

func TestRepository_ManualBudget_EdgeCases(t *testing.T) {
	repo, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.Background()
	userID := int64(1)
	ym := domain.YearMonth{Year: 2024, Month: 1}

	t.Run("UpsertManualBudget_ZeroAmounts", func(t *testing.T) {
		// Test with zero bank amount and zero item amounts
		bankAmount := domain.Money(0)
		items := []domain.ManualBudgetItem{
			{Name: "Zero Item", AmountCents: domain.Money(0)},
			{Name: "Negative Item", AmountCents: domain.Money(-100)},
			{Name: "Positive Item", AmountCents: domain.Money(100)},
		}

		err := repo.UpsertManualBudget(ctx, userID, ym, bankAmount, items)
		if err != nil {
			t.Fatalf("failed to upsert budget with zero amounts: %v", err)
		}

		budget, err := repo.GetManualBudget(ctx, userID, ym)
		if err != nil {
			t.Fatalf("failed to get budget: %v", err)
		}

		if budget.BankAmountCents != 0 {
			t.Errorf("expected BankAmountCents 0, got %d", budget.BankAmountCents)
		}
		if len(budget.Items) != 3 {
			t.Errorf("expected 3 items, got %d", len(budget.Items))
		}
	})

	t.Run("UpsertManualBudget_LargeAmounts", func(t *testing.T) {
		// Test with large amounts
		bankAmount := domain.Money(999999999) // $9,999,999.99
		items := []domain.ManualBudgetItem{
			{Name: "Large Positive", AmountCents: domain.Money(999999999)},
			{Name: "Large Negative", AmountCents: domain.Money(-999999999)},
		}

		err := repo.UpsertManualBudget(ctx, userID, ym, bankAmount, items)
		if err != nil {
			t.Fatalf("failed to upsert budget with large amounts: %v", err)
		}

		budget, err := repo.GetManualBudget(ctx, userID, ym)
		if err != nil {
			t.Fatalf("failed to get budget: %v", err)
		}

		if budget.BankAmountCents != bankAmount {
			t.Errorf("expected BankAmountCents %d, got %d", bankAmount, budget.BankAmountCents)
		}
	})

	t.Run("UpsertManualBudget_EmptyNames", func(t *testing.T) {
		// Test with empty item names (should be handled at service/handler level)
		bankAmount := domain.Money(100000)
		items := []domain.ManualBudgetItem{
			{Name: "", AmountCents: domain.Money(50000)}, // Empty name
			{Name: "Valid Item", AmountCents: domain.Money(-25000)},
		}

		// Repository should accept empty names (validation is elsewhere)
		err := repo.UpsertManualBudget(ctx, userID, ym, bankAmount, items)
		if err != nil {
			t.Fatalf("repository should accept empty names: %v", err)
		}

		budget, err := repo.GetManualBudget(ctx, userID, ym)
		if err != nil {
			t.Fatalf("failed to get budget: %v", err)
		}

		if len(budget.Items) != 2 {
			t.Errorf("expected 2 items, got %d", len(budget.Items))
		}
	})

	t.Run("UpsertManualBudget_TransactionRollback", func(t *testing.T) {
		// This test would require more complex setup to force transaction failures
		// For now, we test that successful transactions work correctly

		bankAmount := domain.Money(200000)
		items := []domain.ManualBudgetItem{
			{Name: "Transaction Test", AmountCents: domain.Money(100000)},
		}

		err := repo.UpsertManualBudget(ctx, userID, ym, bankAmount, items)
		if err != nil {
			t.Fatalf("transaction test failed: %v", err)
		}

		// Verify data exists
		budget, err := repo.GetManualBudget(ctx, userID, ym)
		if err != nil {
			t.Fatalf("failed to verify transaction: %v", err)
		}

		if len(budget.Items) == 0 {
			t.Error("transaction should have committed data")
		}
	})
}

// Benchmark tests for performance
func BenchmarkRepository_UpsertManualBudget(b *testing.B) {
	repo, cleanup := setupTestDB(b)
	defer cleanup()

	ctx := context.Background()
	userID := int64(1)
	ym := domain.YearMonth{Year: 2024, Month: 1}

	bankAmount := domain.Money(250000)
	items := []domain.ManualBudgetItem{
		{Name: "Salary", AmountCents: domain.Money(500000)},
		{Name: "Rent", AmountCents: domain.Money(-120000)},
		{Name: "Groceries", AmountCents: domain.Money(-30000)},
		{Name: "Utilities", AmountCents: domain.Money(-15000)},
		{Name: "Transportation", AmountCents: domain.Money(-25000)},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if err := repo.UpsertManualBudget(ctx, userID, ym, bankAmount, items); err != nil {
			b.Fatalf("benchmark failed: %v", err)
		}
	}
}

func BenchmarkRepository_GetManualBudget(b *testing.B) {
	repo, cleanup := setupTestDB(b)
	defer cleanup()

	ctx := context.Background()
	userID := int64(1)
	ym := domain.YearMonth{Year: 2024, Month: 1}

	// Setup test data
	bankAmount := domain.Money(250000)
	items := []domain.ManualBudgetItem{
		{Name: "Salary", AmountCents: domain.Money(500000)},
		{Name: "Rent", AmountCents: domain.Money(-120000)},
		{Name: "Groceries", AmountCents: domain.Money(-30000)},
	}

	if err := repo.UpsertManualBudget(ctx, userID, ym, bankAmount, items); err != nil {
		b.Fatalf("setup failed: %v", err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if _, err := repo.GetManualBudget(ctx, userID, ym); err != nil {
			b.Fatalf("benchmark failed: %v", err)
		}
	}
}
