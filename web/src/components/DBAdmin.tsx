import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../shared/toast';

interface DBAdminProps {
  onBackToMain?: () => void;
}

interface DatabaseStats {
  totalUsers: number;
  pendingUsers: number;
  approvedUsers: number;
  rejectedUsers: number;
  totalIncomeSources: number;
  totalBudgetSources: number;
  totalExpenses: number;
  totalManualBudgets: number;
}

const DBAdmin: React.FC<DBAdminProps> = ({ onBackToMain }) => {
  const { t } = useTranslation();
  const { push } = useToast();
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sqlite-web'>('dashboard');

  // Load database statistics
  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch stats from API endpoints
      const [users, incomeSources, budgetSources, expenses, manualBudgets] = await Promise.all([
        fetch('/api/v1/admin/users').then(res => res.json()).catch(() => []),
        fetch('/api/v1/income-sources').then(res => res.json()).catch(() => []),
        fetch('/api/v1/budget-sources').then(res => res.json()).catch(() => []),
        fetch('/api/v1/expenses').then(res => res.json()).catch(() => []),
        fetch('/api/v1/manual-budgets').then(res => res.json()).catch(() => [])
      ]);

      interface User {
        status?: string;
        is_approved?: boolean;
      }

      const pendingUsers = users.filter((u: User) => u.status === 'pending' || !u.is_approved);
      const approvedUsers = users.filter((u: User) => u.is_approved || u.status === 'approved');
      const rejectedUsers = users.filter((u: User) => u.status === 'rejected');

      setStats({
        totalUsers: users.length,
        pendingUsers: pendingUsers.length,
        approvedUsers: approvedUsers.length,
        rejectedUsers: rejectedUsers.length,
        totalIncomeSources: incomeSources.length,
        totalBudgetSources: budgetSources.length,
        totalExpenses: expenses.length,
        totalManualBudgets: manualBudgets.length
      });
    } catch (_error) {
      push(t('toast.errorLoadStats', { defaultValue: 'Failed to load database statistics' }), 'error');
    } finally {
      setLoading(false);
    }
  }, [push, t]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const StatCard: React.FC<{ title: string; value: number; icon: string; color: string; description?: string }> = ({
    title, value, icon, color, description
  }) => (
    <div className="col-md-6 col-lg-3 mb-4">
      <div className={`card border-0 shadow-sm h-100 bg-gradient bg-${color} text-white`}>
        <div className="card-body">
          <div className="d-flex align-items-center">
            <div className="flex-shrink-0">
              <div className={`bg-white bg-opacity-25 rounded-circle p-3`}>
                <span className="fs-4">{icon}</span>
              </div>
            </div>
            <div className="flex-grow-1 ms-3">
              <h6 className="card-title mb-1 opacity-75">{title}</h6>
              <h6 className="mb-0 fw-bold">{value.toLocaleString()}</h6>
              {description && <small className="opacity-75">{description}</small>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const QuickActionCard: React.FC<{ title: string; description: string; icon: string; action: () => void; color: string }> = ({
    title, description, icon, action, color
  }) => (
    <div className="col-md-6 col-lg-4 mb-4">
      <div className={`card border-0 shadow-sm h-100 card-hover`} onClick={action}>
        <div className="card-body text-center p-4">
          <div className={`bg-${color} bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3`} style={{ width: '60px', height: '60px' }}>
            <span className="fs-3">{icon}</span>
          </div>
          <h6 className="card-title mb-2">{title}</h6>
          <p className="card-text text-muted small">{description}</p>
        </div>
      </div>
    </div>
  );

  const DashboardTab = () => (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-1">
                <span className="text-primary">🗄️</span> {t('nav.dbAdmin', { defaultValue: 'Database Administration' })}
              </h1>
              <p className="text-muted mb-0">
                {t('nav.dbAdminDescription', { defaultValue: 'Monitor and manage your application database' })}
              </p>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-primary"
                onClick={loadStats}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                    {t('btn.loading', { defaultValue: 'Loading...' })}
                  </>
                ) : (
                  <>
                    <span className="me-2">🔄</span>
                    {t('btn.refresh', { defaultValue: 'Refresh' })}
                  </>
                )}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setActiveTab('sqlite-web')}
              >
                <span className="me-2">🔧</span>
                {t('btn.openSQLiteWeb', { defaultValue: 'Open SQLite Web' })}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="row mb-4">
        {stats ? (
          <>
            <StatCard
              title={t('stats.totalUsers', { defaultValue: 'Total Users' })}
              value={stats.totalUsers}
              icon="👥"
              color="primary"
              description={t('stats.usersDescription', { defaultValue: 'Registered users' })}
            />
            <StatCard
              title={t('stats.pendingUsers', { defaultValue: 'Pending Users' })}
              value={stats.pendingUsers}
              icon="⏳"
              color="warning"
              description={t('stats.pendingDescription', { defaultValue: 'Awaiting approval' })}
            />
            <StatCard
              title={t('stats.approvedUsers', { defaultValue: 'Approved Users' })}
              value={stats.approvedUsers}
              icon="✅"
              color="success"
              description={t('stats.approvedDescription', { defaultValue: 'Active users' })}
            />
            <StatCard
              title={t('stats.rejectedUsers', { defaultValue: 'Rejected Users' })}
              value={stats.rejectedUsers}
              icon="❌"
              color="danger"
              description={t('stats.rejectedDescription', { defaultValue: 'Rejected accounts' })}
            />
          </>
        ) : (
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="text-muted">{t('nav.loading', { defaultValue: 'Loading database statistics...' })}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Data Statistics */}
      {stats && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-light border-0">
                <h5 className="card-title mb-0">
                  <span className="me-2">📊</span>
                  {t('stats.dataOverview', { defaultValue: 'Data Overview' })}
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-3 col-6 mb-3">
                    <div className="d-flex align-items-center">
                      <div className="bg-info bg-opacity-10 rounded p-2 me-3">
                        <span className="text-info fs-5">💰</span>
                      </div>
                      <div>
                        <div className="fw-bold">{stats.totalIncomeSources}</div>
                        <small className="text-muted">{t('stats.incomeSources', { defaultValue: 'Income Sources' })}</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 col-6 mb-3">
                    <div className="d-flex align-items-center">
                      <div className="bg-success bg-opacity-10 rounded p-2 me-3">
                        <span className="text-success fs-5">📋</span>
                      </div>
                      <div>
                        <div className="fw-bold">{stats.totalBudgetSources}</div>
                        <small className="text-muted">{t('stats.budgetSources', { defaultValue: 'Budget Sources' })}</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 col-6 mb-3">
                    <div className="d-flex align-items-center">
                      <div className="bg-warning bg-opacity-10 rounded p-2 me-3">
                        <span className="text-warning fs-5">💸</span>
                      </div>
                      <div>
                        <div className="fw-bold">{stats.totalExpenses}</div>
                        <small className="text-muted">{t('stats.expenses', { defaultValue: 'Expenses' })}</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3 col-6 mb-3">
                    <div className="d-flex align-items-center">
                      <div className="bg-primary bg-opacity-10 rounded p-2 me-3">
                        <span className="text-primary fs-5">🏦</span>
                      </div>
                      <div>
                        <div className="fw-bold">{stats.totalManualBudgets}</div>
                        <small className="text-muted">{t('stats.manualBudgets', { defaultValue: 'Manual Budgets' })}</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-light border-0">
              <h5 className="card-title mb-0">
                <span className="me-2">⚡</span>
                {t('nav.quickActions', { defaultValue: 'Quick Actions' })}
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <QuickActionCard
                  title={t('nav.userManagement', { defaultValue: 'User Management' })}
                  description={t('nav.userManagementDesc', { defaultValue: 'Manage user accounts and permissions' })}
                  icon="👥"
                  color="primary"
                  action={() => {
                    // Navigate to user management
                    window.location.href = '/';
                    // Trigger user management navigation after a short delay
                    setTimeout(() => {
                      const event = new CustomEvent('navigateToUserManagement');
                      window.dispatchEvent(event);
                    }, 100);
                  }}
                />
                <QuickActionCard
                  title={t('nav.viewLogs', { defaultValue: 'View Logs' })}
                  description={t('nav.viewLogsDesc', { defaultValue: 'Check application logs and errors' })}
                  icon="📋"
                  color="info"
                  action={() => {
                    // Open logs in new window
                    const w = window.open('', '_blank');
                    if (w) {
                      w.document.write(`
                        <html>
                          <head>
                            <title>Application Logs</title>
                            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                          </head>
                          <body class="bg-light">
                            <div class="container-fluid p-4">
                              <h3>Application Logs</h3>
                              <div id="logs" class="bg-dark text-light p-3 rounded" style="font-family: monospace; height: 70vh; overflow-y: auto;"></div>
                            </div>
                            <script>
                              fetch('/api/v1/admin/logs')
                                .then(res => res.json())
                                .then(data => {
                                  document.getElementById('logs').innerHTML = data.logs.join('<br>') || 'No logs available';
                                })
                                .catch(err => {
                                  document.getElementById('logs').innerHTML = 'Error loading logs: ' + err.message;
                                });
                            </script>
                          </body>
                        </html>
                      `);
                      w.document.close();
                    }
                  }}
                />
                <QuickActionCard
                  title={t('nav.clearCache', { defaultValue: 'Clear Cache' })}
                  description={t('nav.clearCacheDesc', { defaultValue: 'Clear browser cache and storage' })}
                  icon="🧹"
                  color="warning"
                  action={() => {
                    if (window.confirm(t('confirm.clearCache', { defaultValue: 'Clear application cache?' }))) {
                      localStorage.clear();
                      sessionStorage.clear();
                      window.location.reload();
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const SQLiteWebTab = () => (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-1">
                <span className="text-primary">🔧</span> SQLite Web Interface
              </h1>
              <p className="text-muted mb-0">
                {t('nav.sqliteWebDescription', { defaultValue: 'Direct database management interface' })}
              </p>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-secondary"
                onClick={() => setActiveTab('dashboard')}
              >
                <span className="me-2">←</span>
                {t('btn.backToDashboard', { defaultValue: 'Back to Dashboard' })}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CSP Restriction Notice */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <div className="mb-4">
                <div className="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
                  <span className="fs-1">🔒</span>
                </div>
                <h3 className="h5 mb-3">{t('csp.title', { defaultValue: 'Security Policy Restriction' })}</h3>
                <p className="text-muted mb-4">
                  {t('csp.description', { defaultValue: 'The SQLite Web interface cannot be embedded due to Content Security Policy restrictions. Please use the button below to open it in a new tab for direct database access.' })}
                </p>
              </div>

              <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center align-items-center">
                <button
                  className="btn btn-primary btn-lg px-4"
                  onClick={() => window.open('/db-admin/', '_blank')}
                >
                  <span className="me-2">🔗</span>
                  {t('btn.openSQLiteWeb', { defaultValue: 'Open SQLite Web Interface' })}
                </button>
                <a
                  href="/db-admin/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-secondary"
                >
                  <span className="me-2">↗️</span>
                  {t('btn.directLink', { defaultValue: 'Direct Link' })}
                </a>
              </div>

              <div className="mt-4 pt-4 border-top">
                <small className="text-muted">
                  {t('csp.techNote', { defaultValue: 'Technical note: This restriction is due to the frame-ancestors directive in the Content Security Policy header, which prevents embedding in iframes for security reasons.' })}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container-fluid">
      {/* Top Navigation */}
      <div className="row mb-4">
        <div className="col-12">
          <nav className="navbar navbar-expand-lg navbar-light bg-light rounded shadow-sm">
            <div className="container-fluid">
              <div className="navbar-brand d-flex align-items-center">
                <span className="text-primary fs-4 me-2">🗄️</span>
                <span className="fw-bold">{t('nav.dbAdmin', { defaultValue: 'Database Admin' })}</span>
              </div>

              <div className="navbar-nav ms-auto">
                <div className="nav-item dropdown">
                  <button
                    className="btn btn-outline-primary dropdown-toggle"
                    type="button"
                    data-bs-toggle="dropdown"
                  >
                    <span className="me-2">📊</span>
                    {activeTab === 'dashboard' ? 'Dashboard' : 'SQLite Web'}
                  </button>
                  <ul className="dropdown-menu">
                    <li>
                      <button
                        className={`dropdown-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                      >
                        <span className="me-2">📊</span>
                        {t('nav.dashboard', { defaultValue: 'Dashboard' })}
                      </button>
                    </li>
                    <li>
                      <button
                        className={`dropdown-item ${activeTab === 'sqlite-web' ? 'active' : ''}`}
                        onClick={() => setActiveTab('sqlite-web')}
                      >
                        <span className="me-2">🔧</span>
                        {t('nav.sqliteWeb', { defaultValue: 'SQLite Web' })}
                      </button>
                    </li>
                  </ul>
                </div>

                {onBackToMain && (
                  <button
                    className="btn btn-secondary ms-2"
                    onClick={onBackToMain}
                  >
                    <span className="me-2">←</span>
                    {t('btn.back', { defaultValue: 'Back' })}
                  </button>
                )}
              </div>
            </div>
          </nav>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'dashboard' ? <DashboardTab /> : <SQLiteWebTab />}
    </div>
  );
};

export default DBAdmin;
