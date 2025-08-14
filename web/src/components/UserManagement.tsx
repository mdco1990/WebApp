import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getPendingUsers, getAllUsers, approveUser, rejectUser, deleteUser } from '../services/api';
import { useToast } from '../shared/toast';

type PendingUser = { id: number; username: string; email: string; created_at: string };
type AdminUser = { id: number; username: string; email: string; created_at: string; is_admin: boolean; is_approved: boolean; status?: string };

type TabKey = 'pending' | 'all' | 'approved' | 'rejected';

interface UserManagementProps {
  onBackToMain?: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onBackToMain }) => {
  const { t } = useTranslation();
  const { push } = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);

  // Load user data
  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      const [pending, all] = await Promise.all([getPendingUsers(), getAllUsers()]);
      setPendingUsers(pending || []);
      setAllUsers(all || []);
    } catch {
      push(t('toast.errorLoadUsers', { defaultValue: 'Failed to load users' }), 'error');
    } finally {
      setLoading(false);
    }
  }, [push, t]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // User action handlers
  const handleApproveUser = async (userId: number) => {
    try {
      setLoading(true);
      await approveUser(userId);
      push(t('toast.userApproved', { defaultValue: 'User approved successfully' }), 'success');
      await loadUserData();
    } catch {
      push(t('toast.errorApproveUser', { defaultValue: 'Failed to approve user' }), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectUser = async (userId: number) => {
    try {
      setLoading(true);
      await rejectUser(userId);
      push(t('toast.userRejected', { defaultValue: 'User rejected successfully' }), 'success');
      await loadUserData();
    } catch {
      push(t('toast.errorRejectUser', { defaultValue: 'Failed to reject user' }), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm(t('confirm.deleteUser', { defaultValue: 'Are you sure you want to delete this user?' }))) {
      return;
    }
    try {
      setLoading(true);
      await deleteUser(userId);
      push(t('toast.userDeleted', { defaultValue: 'User deleted successfully' }), 'success');
      await loadUserData();
    } catch {
      push(t('toast.errorDeleteUser', { defaultValue: 'Failed to delete user' }), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter users by status - handle both is_approved boolean and status string
  const approvedUsers = allUsers.filter(u => u.is_approved || u.status === 'approved');
  const rejectedUsers = allUsers.filter(u => u.status === 'rejected');

  // Tab button component
  const TabButton: React.FC<{ tab: TabKey; count: number }> = ({ tab, count }) => {
    const getTabClass = () => {
      if (activeTab !== tab) return 'btn btn-outline-secondary';
      switch (tab) {
        case 'approved': return 'btn btn-success';
        case 'rejected': return 'btn btn-danger';
        case 'pending':
        case 'all':
        default: return 'btn btn-primary';
      }
    };

    const getTabLabel = () => {
      switch (tab) {
        case 'pending': return t('nav.pendingUsers', { defaultValue: 'Pending Users' });
        case 'all': return t('nav.allUsers', { defaultValue: 'All Users' });
        case 'approved': return t('nav.approvedUsers', { defaultValue: 'Approved Users' });
        case 'rejected': return t('nav.rejectedUsers', { defaultValue: 'Rejected Users' });
      }
    };

    return (
      <button
        className={getTabClass()}
        onClick={() => setActiveTab(tab)}
      >
        {getTabLabel()} ({count})
      </button>
    );
  };

  // User list components
  const PendingUsersList = () => (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title mb-0">
          {t('nav.pendingUsers', { defaultValue: 'Pending Users' })} ({pendingUsers.length})
        </h5>
      </div>
      <div className="card-body">
        {pendingUsers.length === 0 ? (
          <div className="text-center text-muted py-4">
            {t('nav.noPendingUsers', { defaultValue: 'No pending users' })}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>{t('auth.username', { defaultValue: 'Username' })}</th>
                  <th>{t('auth.email', { defaultValue: 'Email' })}</th>
                  <th>{t('label.createdAt', { defaultValue: 'Created' })}</th>
                  <th>{t('table.action', { defaultValue: 'Actions' })}</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map(user => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-success"
                          onClick={() => handleApproveUser(user.id)}
                          title={t('btn.approve', { defaultValue: 'Approve' })}
                        >
                          ✓ {t('btn.approve', { defaultValue: 'Approve' })}
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleRejectUser(user.id)}
                          title={t('btn.reject', { defaultValue: 'Reject' })}
                        >
                          ✗ {t('btn.reject', { defaultValue: 'Reject' })}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const AllUsersList = () => (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title mb-0">
          {t('nav.allUsers', { defaultValue: 'All Users' })} ({allUsers.length})
        </h5>
      </div>
      <div className="card-body">
        {allUsers.length === 0 ? (
          <div className="text-center text-muted py-4">
            {t('nav.noUsers', { defaultValue: 'No users found' })}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>{t('auth.username', { defaultValue: 'Username' })}</th>
                  <th>{t('auth.email', { defaultValue: 'Email' })}</th>
                  <th>{t('label.status', { defaultValue: 'Status' })}</th>
                  <th>{t('label.role', { defaultValue: 'Role' })}</th>
                  <th>{t('label.createdAt', { defaultValue: 'Created' })}</th>
                  <th>{t('table.action', { defaultValue: 'Actions' })}</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map(user => {
                  const status = user.status || (user.is_approved ? 'approved' : 'pending');
                  let statusClass = 'bg-warning text-dark';
                  if (status === 'approved') statusClass = 'bg-success';
                  else if (status === 'rejected') statusClass = 'bg-danger';

                  return (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`badge ${statusClass}`}>
                          {t(`status.${status}`, { defaultValue: status })}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${user.is_admin ? 'bg-warning' : 'bg-secondary'}`}>
                          {user.is_admin ? t('role.admin', { defaultValue: 'Admin' }) : t('role.user', { defaultValue: 'User' })}
                        </span>
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        {status === 'rejected' && (
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-success"
                              onClick={() => handleApproveUser(user.id)}
                              title={t('btn.approve', { defaultValue: 'Approve' })}
                            >
                              ✓
                            </button>
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => handleDeleteUser(user.id)}
                              title={t('btn.deleteUser', { defaultValue: 'Delete User' })}
                            >
                              🗑
                            </button>
                          </div>
                        )}
                        {status === 'approved' && (
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => handleDeleteUser(user.id)}
                              title={t('btn.deleteUser', { defaultValue: 'Delete User' })}
                            >
                              🗑
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const ApprovedUsersList = () => (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title mb-0">
          {t('nav.approvedUsers', { defaultValue: 'Approved Users' })} ({approvedUsers.length})
        </h5>
      </div>
      <div className="card-body">
        {approvedUsers.length === 0 ? (
          <div className="text-center text-muted py-4">
            {t('nav.noApprovedUsers', { defaultValue: 'No approved users' })}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>{t('auth.username', { defaultValue: 'Username' })}</th>
                  <th>{t('auth.email', { defaultValue: 'Email' })}</th>
                  <th>{t('label.role', { defaultValue: 'Role' })}</th>
                  <th>{t('label.createdAt', { defaultValue: 'Created' })}</th>
                  <th>{t('table.action', { defaultValue: 'Actions' })}</th>
                </tr>
              </thead>
              <tbody>
                {approvedUsers.map(user => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${user.is_admin ? 'bg-warning' : 'bg-secondary'}`}>
                        {user.is_admin ? t('role.admin', { defaultValue: 'Admin' }) : t('role.user', { defaultValue: 'User' })}
                      </span>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => handleDeleteUser(user.id)}
                          title={t('btn.deleteUser', { defaultValue: 'Delete User' })}
                        >
                          🗑 {t('btn.deleteUser', { defaultValue: 'Delete' })}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const RejectedUsersList = () => (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title mb-0">
          {t('nav.rejectedUsers', { defaultValue: 'Rejected Users' })} ({rejectedUsers.length})
        </h5>
      </div>
      <div className="card-body">
        {rejectedUsers.length === 0 ? (
          <div className="text-center text-muted py-4">
            {t('nav.noRejectedUsers', { defaultValue: 'No rejected users' })}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>{t('auth.username', { defaultValue: 'Username' })}</th>
                  <th>{t('auth.email', { defaultValue: 'Email' })}</th>
                  <th>{t('label.createdAt', { defaultValue: 'Created' })}</th>
                  <th>{t('table.action', { defaultValue: 'Actions' })}</th>
                </tr>
              </thead>
              <tbody>
                {rejectedUsers.map(user => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-success"
                          onClick={() => handleApproveUser(user.id)}
                          title={t('btn.approve', { defaultValue: 'Approve' })}
                        >
                          ✓ {t('btn.approve', { defaultValue: 'Approve' })}
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => handleDeleteUser(user.id)}
                          title={t('btn.deleteUser', { defaultValue: 'Delete User' })}
                        >
                          🗑 {t('btn.deleteUser', { defaultValue: 'Delete' })}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'pending':
        return <PendingUsersList />;
      case 'all':
        return <AllUsersList />;
      case 'approved':
        return <ApprovedUsersList />;
      case 'rejected':
        return <RejectedUsersList />;
      default:
        return <PendingUsersList />;
    }
  };

  return (
    <div className="container-xl">
      <div className="page-header">
        <div className="container-xl">
          <div className="row g-2 align-items-center">
            <div className="col">
              <div className="page-pretitle">Admin</div>
              <h2 className="page-title">{t('nav.userManagement', { defaultValue: 'User Management' })}</h2>
            </div>
            <div className="col-auto ms-auto">
              <div className="btn-group">
                {onBackToMain && (
                  <button
                    className="btn btn-outline-secondary"
                    onClick={onBackToMain}
                  >
                    <span className="me-2">←</span>
                    {t('btn.back', { defaultValue: 'Back' })}
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  onClick={loadUserData}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                      {t('nav.loading', { defaultValue: 'Loading...' })}
                    </>
                  ) : (
                    <>
                      <span className="me-2">🔄</span>
                      {t('btn.refresh', { defaultValue: 'Refresh' })}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="container-xl">
          {/* Tab Navigation */}
          <div className="row mb-3">
            <div className="col">
              <div className="btn-group" role="group" aria-label="User Management Tabs">
                <TabButton tab="pending" count={pendingUsers.length} />
                <TabButton tab="all" count={allUsers.length} />
                <TabButton tab="approved" count={approvedUsers.length} />
                <TabButton tab="rejected" count={rejectedUsers.length} />
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="row">
            <div className="col">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
