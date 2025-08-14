package repository

import (
	"context"
	"testing"

	"github.com/mdco1990/webapp/internal/db"
	"github.com/mdco1990/webapp/internal/domain"
)

// TestBuilder implements Builder pattern for constructing test data
type TestBuilder struct {
	userID     int64
	yearMonth  domain.YearMonth
	bankAmount domain.Money
	items      []domain.ManualBudgetItem
}

// NewTestBuilder creates a new test builder
func NewTestBuilder() *TestBuilder {
	return &TestBuilder{
		userID:     1,
		yearMonth:  domain.YearMonth{Year: 2024, Month: 1},
		bankAmount: 0,
		items:      []domain.ManualBudgetItem{},
	}
}

// WithUserID sets the user ID
func (tb *TestBuilder) WithUserID(userID int64) *TestBuilder {
	tb.userID = userID
	return tb
}

// WithYearMonth sets the year/month
func (tb *TestBuilder) WithYearMonth(ym domain.YearMonth) *TestBuilder {
	tb.yearMonth = ym
	return tb
}

// WithBankAmount sets the bank amount
func (tb *TestBuilder) WithBankAmount(amount domain.Money) *TestBuilder {
	tb.bankAmount = amount
	return tb
}

// WithItems sets the budget items
func (tb *TestBuilder) WithItems(items []domain.ManualBudgetItem) *TestBuilder {
	tb.items = items
	return tb
}

// Build creates the test data
func (tb *TestBuilder) Build() (int64, domain.YearMonth, domain.Money, []domain.ManualBudgetItem) {
	return tb.userID, tb.yearMonth, tb.bankAmount, tb.items
}

// TestStrategy defines the strategy pattern for different test scenarios
type TestStrategy interface {
	Execute(ctx context.Context, t *testing.T, repo *Repository) error
	GetName() string
}

// BaseTestStrategy provides common functionality for test strategies
type BaseTestStrategy struct {
	builder *TestBuilder
}

// NewBaseTestStrategy creates a new base test strategy
func NewBaseTestStrategy(builder *TestBuilder) *BaseTestStrategy {
	return &BaseTestStrategy{
		builder: builder,
	}
}

// EmptyBudgetStrategy tests empty budget scenarios
type EmptyBudgetStrategy struct {
	*BaseTestStrategy
}

// NewEmptyBudgetStrategy creates a new empty budget test strategy
func NewEmptyBudgetStrategy(builder *TestBuilder) *EmptyBudgetStrategy {
	return &EmptyBudgetStrategy{
		BaseTestStrategy: NewBaseTestStrategy(builder),
	}
}

// GetName returns the strategy name
func (ebs *EmptyBudgetStrategy) GetName() string {
	return "EmptyBudget"
}

// Execute runs the empty budget test
func (ebs *EmptyBudgetStrategy) Execute(ctx context.Context, t *testing.T, repo *Repository) error {
	t.Helper()
	userID, ym, _, _ := ebs.builder.Build()

	budget, err := repo.GetManualBudget(ctx, userID, ym)
	if err != nil {
		return err
	}

	// Validate empty budget
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

	return nil
}

// CreateBudgetStrategy tests budget creation scenarios
type CreateBudgetStrategy struct {
	*BaseTestStrategy
}

// NewCreateBudgetStrategy creates a new create budget test strategy
func NewCreateBudgetStrategy(builder *TestBuilder) *CreateBudgetStrategy {
	return &CreateBudgetStrategy{
		BaseTestStrategy: NewBaseTestStrategy(builder),
	}
}

// GetName returns the strategy name
func (cbs *CreateBudgetStrategy) GetName() string {
	return "CreateBudget"
}

// Execute runs the create budget test
func (cbs *CreateBudgetStrategy) Execute(
	ctx context.Context,
	t *testing.T,
	repo *Repository,
) error {
	t.Helper()
	userID, ym, bankAmount, items := cbs.builder.Build()

	err := repo.UpsertManualBudget(ctx, userID, ym, bankAmount, items)
	if err != nil {
		return err
	}

	// Verify data was saved
	budget, err := repo.GetManualBudget(ctx, userID, ym)
	if err != nil {
		return err
	}

	if budget.BankAmountCents != bankAmount {
		t.Errorf("expected BankAmountCents %d, got %d", bankAmount, budget.BankAmountCents)
	}
	if len(budget.Items) != len(items) {
		t.Errorf("expected %d items, got %d", len(items), len(budget.Items))
	}

	// Verify items
	expectedItems := make(map[string]domain.Money)
	for _, item := range items {
		expectedItems[item.Name] = item.AmountCents
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

	return nil
}

// UpdateBudgetStrategy tests budget update scenarios
type UpdateBudgetStrategy struct {
	*BaseTestStrategy
}

// NewUpdateBudgetStrategy creates a new update budget test strategy
func NewUpdateBudgetStrategy(builder *TestBuilder) *UpdateBudgetStrategy {
	return &UpdateBudgetStrategy{
		BaseTestStrategy: NewBaseTestStrategy(builder),
	}
}

// GetName returns the strategy name
func (ubs *UpdateBudgetStrategy) GetName() string {
	return "UpdateBudget"
}

// Execute runs the update budget test
func (ubs *UpdateBudgetStrategy) Execute(
	ctx context.Context,
	t *testing.T,
	repo *Repository,
) error {
	t.Helper()
	userID, ym, bankAmount, items := ubs.builder.Build()

	err := repo.UpsertManualBudget(ctx, userID, ym, bankAmount, items)
	if err != nil {
		return err
	}

	// Verify updates
	budget, err := repo.GetManualBudget(ctx, userID, ym)
	if err != nil {
		return err
	}

	if budget.BankAmountCents != bankAmount {
		t.Errorf("expected BankAmountCents %d, got %d", bankAmount, budget.BankAmountCents)
	}
	if len(budget.Items) != len(items) {
		t.Errorf("expected %d items, got %d", len(items), len(budget.Items))
	}

	return nil
}

// EdgeCaseStrategy tests edge case scenarios
type EdgeCaseStrategy struct {
	*BaseTestStrategy
	edgeCaseType string
}

// NewEdgeCaseStrategy creates a new edge case test strategy
func NewEdgeCaseStrategy(builder *TestBuilder, edgeCaseType string) *EdgeCaseStrategy {
	return &EdgeCaseStrategy{
		BaseTestStrategy: NewBaseTestStrategy(builder),
		edgeCaseType:     edgeCaseType,
	}
}

// GetName returns the strategy name
func (ecs *EdgeCaseStrategy) GetName() string {
	return "EdgeCase_" + ecs.edgeCaseType
}

// Execute runs the edge case test
func (ecs *EdgeCaseStrategy) Execute(ctx context.Context, t *testing.T, repo *Repository) error {
	t.Helper()
	userID, ym, bankAmount, items := ecs.builder.Build()

	err := repo.UpsertManualBudget(ctx, userID, ym, bankAmount, items)
	if err != nil {
		return err
	}

	budget, err := repo.GetManualBudget(ctx, userID, ym)
	if err != nil {
		return err
	}

	// Validate based on edge case type
	switch ecs.edgeCaseType {
	case "ZeroAmounts":
		if budget.BankAmountCents != 0 {
			t.Errorf("expected BankAmountCents 0, got %d", budget.BankAmountCents)
		}
		if len(budget.Items) != len(items) {
			t.Errorf("expected %d items, got %d", len(items), len(budget.Items))
		}
	case "LargeAmounts":
		if budget.BankAmountCents != bankAmount {
			t.Errorf("expected BankAmountCents %d, got %d", bankAmount, budget.BankAmountCents)
		}
	case "EmptyNames":
		if len(budget.Items) != len(items) {
			t.Errorf("expected %d items, got %d", len(items), len(budget.Items))
		}
	}

	return nil
}

// TestCommand implements Command pattern for test operations
type TestCommand interface {
	Execute(ctx context.Context, t *testing.T, repo *Repository) error
}

// RunTestCommand executes a test command
func RunTestCommand(ctx context.Context, t *testing.T, repo *Repository, cmd TestCommand) {
	t.Helper()
	if err := cmd.Execute(ctx, t, repo); err != nil {
		t.Fatalf("test command failed: %v", err)
	}
}

// TestTemplate implements Template Method pattern for common test structure
type TestTemplate struct {
	strategies []TestStrategy
}

// NewTestTemplate creates a new test template
func NewTestTemplate(strategies []TestStrategy) *TestTemplate {
	return &TestTemplate{
		strategies: strategies,
	}
}

// RunAll executes all test strategies
func (tt *TestTemplate) RunAll(ctx context.Context, t *testing.T, repo *Repository) {
	t.Helper()
	for _, strategy := range tt.strategies {
		t.Run(strategy.GetName(), func(t *testing.T) {
			if err := strategy.Execute(ctx, t, repo); err != nil {
				t.Fatalf("strategy %s failed: %v", strategy.GetName(), err)
			}
		})
	}
}

// setupTestDB creates a test database and repository
func setupTestDB(tb testing.TB) (*Repository, func()) {
	tb.Helper()
	database, err := db.Open("sqlite", ":memory:", "")
	if err != nil {
		tb.Fatalf("failed to open test database: %v", err)
	}

	if err := db.Migrate(database); err != nil {
		tb.Fatalf("failed to migrate test database: %v", err)
	}

	repo := New(database)

	cleanup := func() {
		if err := database.Close(); err != nil {
			tb.Errorf("failed to close test database: %v", err)
		}
	}

	return repo, cleanup
}

// TestRepository_ManualBudget_CRUD tests CRUD operations with reduced complexity
func TestRepository_ManualBudget_CRUD(t *testing.T) {
	repo, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.Background()

	// Create test strategies using Builder pattern
	emptyStrategy := NewEmptyBudgetStrategy(NewTestBuilder())

	createStrategy := NewCreateBudgetStrategy(
		NewTestBuilder().
			WithBankAmount(250000).
			WithItems([]domain.ManualBudgetItem{
				{Name: "Salary", AmountCents: domain.Money(500000)},
				{Name: "Rent", AmountCents: domain.Money(-120000)},
				{Name: "Groceries", AmountCents: domain.Money(-30000)},
			}),
	)

	updateStrategy := NewUpdateBudgetStrategy(
		NewTestBuilder().
			WithBankAmount(300000).
			WithItems([]domain.ManualBudgetItem{
				{Name: "Salary", AmountCents: domain.Money(550000)},
				{Name: "Utilities", AmountCents: domain.Money(-15000)},
			}),
	)

	// Use Template Method pattern to run all strategies
	template := NewTestTemplate([]TestStrategy{
		emptyStrategy,
		createStrategy,
		updateStrategy,
	})

	template.RunAll(ctx, t, repo)
}

// TestRepository_ManualBudget_EdgeCases tests edge cases with reduced complexity
func TestRepository_ManualBudget_EdgeCases(t *testing.T) {
	repo, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.Background()

	// Create edge case strategies
	zeroAmountsStrategy := NewEdgeCaseStrategy(
		NewTestBuilder().
			WithBankAmount(0).
			WithItems([]domain.ManualBudgetItem{
				{Name: "Zero Item", AmountCents: domain.Money(0)},
				{Name: "Negative Item", AmountCents: domain.Money(-100)},
				{Name: "Positive Item", AmountCents: domain.Money(100)},
			}),
		"ZeroAmounts",
	)

	largeAmountsStrategy := NewEdgeCaseStrategy(
		NewTestBuilder().
			WithBankAmount(999999999).
			WithItems([]domain.ManualBudgetItem{
				{Name: "Large Positive", AmountCents: domain.Money(999999999)},
				{Name: "Large Negative", AmountCents: domain.Money(-999999999)},
			}),
		"LargeAmounts",
	)

	emptyNamesStrategy := NewEdgeCaseStrategy(
		NewTestBuilder().
			WithBankAmount(100000).
			WithItems([]domain.ManualBudgetItem{
				{Name: "", AmountCents: domain.Money(50000)},
				{Name: "Valid Item", AmountCents: domain.Money(-25000)},
			}),
		"EmptyNames",
	)

	// Use Template Method pattern to run all edge case strategies
	template := NewTestTemplate([]TestStrategy{
		zeroAmountsStrategy,
		largeAmountsStrategy,
		emptyNamesStrategy,
	})

	template.RunAll(ctx, t, repo)
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
