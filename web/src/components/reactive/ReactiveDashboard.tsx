import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, ProgressBar, Alert, Spinner } from 'react-bootstrap';
import {
  useReactiveExpenseAnalytics,
  useReactiveFinancialSummary,
  useReactiveExpenseTrends,
  useReactiveCategoryInsights,
  useReactiveBudgetComparison,
  useReactiveNotifications,
  useReactiveFilteredExpenses,
} from '../../hooks/useReactiveData';
import { useAppStore, useCurrentMonth, useFilters } from '../../state/Store';

// Reactive Dashboard Component
export const ReactiveDashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState(30);

  // Reactive data hooks
  const analytics = useReactiveExpenseAnalytics();
  const financialSummary = useReactiveFinancialSummary();
  const trends = useReactiveExpenseTrends(selectedTimeframe);
  const insights = useReactiveCategoryInsights();
  const budgetComparison = useReactiveBudgetComparison();
  const notifications = useReactiveNotifications();
  const filteredExpenses = useReactiveFilteredExpenses(searchTerm, categoryFilter);

  // Store state
  const currentMonth = useCurrentMonth();
  const filters = useFilters();
  const { setFilters, clearFilters } = useAppStore();

  // Auto-refresh effect
  useEffect(() => {
    const interval = setInterval(() => {
      // Trigger reactive updates
      setFilters({ ...filters });
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [filters, setFilters]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'under_budget':
        return 'success';
      case 'over_budget':
        return 'danger';
      default:
        return 'info';
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return '📈';
    if (trend < 0) return '📉';
    return '➡️';
  };

  return (
    <div className="reactive-dashboard">
      {/* Header with current month and notifications */}
      <Row className="mb-4">
        <Col>
          <h2>
            Reactive Dashboard - {currentMonth.month}/{currentMonth.year}
            <Badge bg="primary" className="ms-2">
              Real-time
            </Badge>
          </h2>
        </Col>
        <Col xs="auto">
          <div className="notification-badge">
            {notifications.length > 0 && (
              <Badge bg="warning" text="dark">
                {notifications.length} new
              </Badge>
            )}
          </div>
        </Col>
      </Row>

      {/* Notifications */}
      {notifications.length > 0 && (
        <Row className="mb-3">
          <Col>
            {notifications.slice(0, 3).map((notification) => (
              <Alert
                key={notification.id}
                variant={notification.severity}
                dismissible
                className="mb-2"
              >
                <small>{notification.message}</small>
              </Alert>
            ))}
          </Col>
        </Row>
      )}

      {/* Financial Summary Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Total Income</Card.Title>
              <Card.Text className="h3 text-success">
                {formatCurrency(financialSummary.totalIncome)}
              </Card.Text>
              <small className="text-muted">This month</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Total Expenses</Card.Title>
              <Card.Text className="h3 text-danger">
                {formatCurrency(financialSummary.totalExpenses)}
              </Card.Text>
              <small className="text-muted">This month</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Remaining</Card.Title>
              <Card.Text className={`h3 ${financialSummary.remaining >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(financialSummary.remaining)}
              </Card.Text>
              <small className="text-muted">Available</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Savings Rate</Card.Title>
              <Card.Text className="h3 text-info">
                {formatPercentage(financialSummary.savingsRate)}
              </Card.Text>
              <ProgressBar
                variant={financialSummary.savingsRate >= 20 ? 'success' : 'warning'}
                now={Math.min(financialSummary.savingsRate, 100)}
                className="mt-2"
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Analytics and Trends */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Expense Analytics</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col>
                  <div className="text-center">
                    <h4>{formatCurrency(analytics.total)}</h4>
                    <small className="text-muted">Total Expenses</small>
                  </div>
                </Col>
                <Col>
                  <div className="text-center">
                    <h4>{formatCurrency(analytics.average)}</h4>
                    <small className="text-muted">Average per Expense</small>
                  </div>
                </Col>
              </Row>
              <hr />
              <h6>Top Categories</h6>
              {analytics.topCategories.map((category, _index) => (
                <div key={category.category} className="d-flex justify-content-between align-items-center mb-2">
                  <span>{category.category}</span>
                  <Badge bg="primary">{formatCurrency(category.amount)}</Badge>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Expense Trends ({selectedTimeframe} days)</h5>
            </Card.Header>
            <Card.Body>
              <div className="text-center mb-3">
                <h3>{getTrendIcon(trends.trend)}</h3>
                <h4>{formatCurrency(trends.averageDaily)}</h4>
                <small className="text-muted">Average Daily Spending</small>
              </div>
              <div className="d-flex justify-content-between">
                <span>Trend: {formatCurrency(trends.trend)}</span>
                <span>Total: {formatCurrency(trends.totalPeriod)}</span>
              </div>
              <div className="mt-3">
                <label className="form-label">Timeframe:</label>
                <select
                  className="form-select"
                  value={selectedTimeframe}
                  onChange={(e) => setSelectedTimeframe(Number(e.target.value))}
                >
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Budget Comparison */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>
              <h5>Budget vs Actual</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span>Overall Status:</span>
                <Badge bg={getStatusColor(budgetComparison.overallStatus)}>
                  {budgetComparison.overallStatus.replace('_', ' ')}
                </Badge>
              </div>
              <div className="row">
                <div className="col-md-4">
                  <div className="text-center">
                    <h5>Actual</h5>
                    <h4 className="text-danger">{formatCurrency(budgetComparison.totalActual)}</h4>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="text-center">
                    <h5>Budgeted</h5>
                    <h4 className="text-primary">{formatCurrency(budgetComparison.totalBudgeted)}</h4>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="text-center">
                    <h5>Variance</h5>
                    <h4 className={budgetComparison.totalVariance >= 0 ? 'text-success' : 'text-danger'}>
                      {formatCurrency(budgetComparison.totalVariance)}
                    </h4>
                  </div>
                </div>
              </div>
              <hr />
              <h6>Category Breakdown</h6>
              {budgetComparison.comparisons.slice(0, 5).map((comparison) => (
                <div key={comparison.category} className="mb-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <span>{comparison.category}</span>
                    <Badge bg={getStatusColor(comparison.status)}>
                      {formatPercentage(comparison.variancePercent)}
                    </Badge>
                  </div>
                  <ProgressBar
                    variant={getStatusColor(comparison.status)}
                    now={Math.min((comparison.actual / comparison.budgeted) * 100, 100)}
                    className="mt-1"
                  />
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Category Insights */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Category Insights</h5>
            </Card.Header>
            <Card.Body>
              <h6>Top Spending Categories</h6>
              {insights.topCategories.map(([category, stats]) => (
                <div key={category} className="d-flex justify-content-between align-items-center mb-2">
                  <span>{category}</span>
                  <div className="text-end">
                    <div>{formatCurrency(stats.total)}</div>
                    <small className="text-muted">{stats.count} transactions</small>
                  </div>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Recent Expenses</h5>
            </Card.Header>
            <Card.Body>
              {analytics.recentExpenses.slice(0, 5).map((expense) => (
                <div key={expense.id} className="d-flex justify-content-between align-items-center mb-2">
                  <div>
                    <div>{expense.description}</div>
                    <small className="text-muted">{expense.category}</small>
                  </div>
                  <Badge bg="secondary">{formatCurrency(expense.amount_cents)}</Badge>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Search and Filters */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>
              <h5>Search & Filters</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <label className="form-label">Search Expenses</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by description or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </Col>
                <Col md={4}>
                  <label className="form-label">Category Filter</label>
                  <select
                    className="form-select"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {Object.keys(insights.categoryStats).map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </Col>
                <Col md={4} className="d-flex align-items-end">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </button>
                </Col>
              </Row>
              <div className="mt-3">
                <small className="text-muted">
                  Showing {filteredExpenses.length} of {analytics.total} expenses
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Real-time Status */}
      <Row>
        <Col>
          <Card>
            <Card.Body className="text-center">
              <Spinner animation="border" size="sm" className="me-2" />
              <span className="text-muted">Real-time updates active</span>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// Reactive Chart Component
export const ReactiveChart: React.FC<{ data: Record<string, unknown> | unknown[]; type: 'line' | 'bar' | 'pie' }> = ({ data, type }) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [data]);

  if (isLoading) {
    return (
      <div className="text-center p-4">
        <Spinner animation="border" />
        <div className="mt-2">Updating chart...</div>
      </div>
    );
  }

  return (
    <div className="reactive-chart">
      <div className="chart-placeholder">
        <h6>Chart Type: {type}</h6>
        <p className="text-muted">Chart data would be rendered here</p>
        <small>Data points: {Array.isArray(data) ? data.length : Object.keys(data).length}</small>
      </div>
    </div>
  );
};

// Reactive Notification Component
export const ReactiveNotification: React.FC<{ notification: { severity: string; message: string; timestamp: string | number } }> = ({ notification }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <Alert
      variant={notification.severity}
      dismissible
      onClose={() => setIsVisible(false)}
      className="notification-toast"
    >
      <div className="d-flex align-items-center">
        <div className="me-2">
          {notification.severity === 'success' && '✅'}
          {notification.severity === 'warning' && '⚠️'}
          {notification.severity === 'error' && '❌'}
          {notification.severity === 'info' && 'ℹ️'}
        </div>
        <div>
          <div>{notification.message}</div>
          <small className="text-muted">
            {new Date(notification.timestamp).toLocaleTimeString()}
          </small>
        </div>
      </div>
    </Alert>
  );
};

// Reactive Loading Component
export const ReactiveLoading: React.FC<{ isLoading: boolean; message?: string }> = ({ 
  isLoading, 
  message = "Loading..." 
}) => {
  if (!isLoading) return null;

  return (
    <div className="reactive-loading">
      <div className="loading-overlay">
        <Spinner animation="border" />
        <div className="mt-2">{message}</div>
      </div>
    </div>
  );
};