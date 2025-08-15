function tabButtonClass(active: boolean, key: TabKey): string {
  if (!active) return 'btn btn-sm flex-fill btn-outline-secondary';
  switch (key) {
    case 'approved':
      return 'btn btn-sm flex-fill btn-success';
    case 'rejected':
      return 'btn btn-sm flex-fill btn-danger';
    case 'pending':
    case 'all':
    default:
      return 'btn btn-sm flex-fill btn-primary';
  }
}

function tabTranslationKey(key: TabKey): string {
  switch (key) {
    case 'pending':
      return 'nav.pendingUsers';
    case 'all':
      return 'nav.allUsers';
    case 'approved':
      return 'nav.approvedUsers';
    case 'rejected':
      return 'nav.rejectedUsers';
    default:
      return 'nav.pendingUsers';
  }
}

const TabButton: React.FC<{
  k: TabKey;
  active: boolean;
  setTab: (k: TabKey) => void;
  t: TranslationFn;
  count: number;
}> = ({ k, active, setTab, t, count }) => (
  <button type="button" className={tabButtonClass(active, k)} onClick={() => setTab(k)}>
    {t(tabTranslationKey(k))} ({count})
  </button>
);
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getLogs } from '../services/api';

interface AdminControlsProps {
  isDarkMode: boolean;
  user: { is_admin?: boolean } | null; // consumed in AdminControls wrapper for gating
  onApproveUser?: (userId: number) => void;
  onRejectUser?: (userId: number) => void;
  onDeleteUser?: (userId: number) => void;
  pendingUsers?: Array<{ id: number; username: string; email: string; created_at: string }>;
  allUsers?: Array<{
    id: number;
    username: string;
    email: string;
    created_at: string;
    is_admin: boolean;
    is_approved: boolean;
    status?: string;
  }>;
}

type AdminUser = {
  id: number;
  username: string;
  email: string;
  created_at: string;
  is_admin: boolean;
  is_approved: boolean;
  status?: string;
};

async function openLogsWindow() {
  const logs = await getLogs();
  const w = window.open('', '_blank', 'width=800,height=600');
  if (!w) return;
  w.document.write(
    `<html><head><title>Application Logs</title></head><body style="font-family:monospace;padding:20px;background:#1e1e1e;color:#fff;"><h2>Application Logs</h2><pre style="white-space:pre-wrap;font-size:12px;">${JSON.stringify(logs, null, 2)}</pre></body></html>`
  );
  w.document.close();
}

async function downloadLogsJson() {
  const logs = await getLogs();
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'application-logs.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const userStatus = (u: AdminUser) => u.status || (u.is_approved ? 'approved' : 'pending');

// Tab rendering helpers kept small for low cognitive complexity
type TranslationFn = (key: string, opts?: Record<string, unknown>) => string;
const PendingList = ({
  list,
  t,
  onApprove,
  onReject,
}: {
  list: AdminControlsProps['pendingUsers'];
  t: TranslationFn;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
}) =>
  !list?.length ? (
    <span className="dropdown-item-text text-muted small">
      {t('nav.noPendingUsers', { defaultValue: 'No pending users' })}
    </span>
  ) : (
    <>
      {list.map((u) => (
        <div key={u.id} className="dropdown-item-text py-2">
          <div className="d-flex justify-content-between align-items-start">
            <div className="flex-grow-1">
              <strong className="d-block">{u.username}</strong>
              <small className="text-muted d-block">{u.email}</small>
              <small className="text-muted">{new Date(u.created_at).toLocaleDateString()}</small>
            </div>
            <div className="btn-group btn-group-sm ms-2">
              <button
                className="btn btn-success btn-sm"
                onClick={() => onApprove?.(u.id)}
                title={t('btn.approve', { defaultValue: 'Approve' })}
              >
                ✓
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => onReject?.(u.id)}
                title={t('btn.reject', { defaultValue: 'Reject' })}
              >
                ✗
              </button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
const SimpleUserLine = ({ u, t }: { u: AdminUser; t: TranslationFn }) => {
  const status = userStatus(u);
  let cls = 'bg-warning text-dark';
  if (status === 'approved') cls = 'bg-success';
  else if (status === 'rejected') cls = 'bg-danger';
  return (
    <div className="d-flex justify-content-between align-items-center py-1 border-bottom">
      <div className="flex-grow-1">
        <strong className="d-block">{u.username}</strong>
        <small className="text-muted d-block">{u.email}</small>
        <div>
          <span className={`badge ${u.is_admin ? 'bg-warning' : 'bg-secondary'}`}>
            {u.is_admin
              ? t('role.admin', { defaultValue: 'Admin' })
              : t('role.user', { defaultValue: 'User' })}
          </span>
          <span className={`badge ms-1 ${cls}`}>
            {t(`status.${status}`, { defaultValue: status })}
          </span>
        </div>
      </div>
      <small className="text-muted">{new Date(u.created_at).toLocaleDateString()}</small>
    </div>
  );
};
const AllUsers = ({ list, t }: { list: AdminUser[]; t: TranslationFn }) =>
  !list.length ? (
    <span className="dropdown-item-text text-muted small">
      {t('nav.noUsers', { defaultValue: 'No users found' })}
    </span>
  ) : (
    <div className="dropdown-item-text" style={{ maxHeight: '300px', overflowY: 'auto' }}>
      {list.map((u) => (
        <SimpleUserLine key={u.id} u={u} t={t} />
      ))}
    </div>
  );
const ApprovedUsers = ({ list, t }: { list: AdminUser[]; t: TranslationFn }) =>
  !list.length ? (
    <span className="dropdown-item-text text-muted small">∅</span>
  ) : (
    <div className="dropdown-item-text" style={{ maxHeight: '300px', overflowY: 'auto' }}>
      {list.map((u) => (
        <div key={u.id} className="py-1 border-bottom small d-flex justify-content-between">
          <span>{u.username}</span>
          <span className="badge bg-success">{t('btn.approve', { defaultValue: 'Approve' })}</span>
        </div>
      ))}
    </div>
  );
const RejectedUsers = ({
  list,
  t,
  onApprove,
  onDelete,
}: {
  list: AdminUser[];
  t: TranslationFn;
  onApprove?: (id: number) => void;
  onDelete?: (id: number) => void;
}) =>
  !list.length ? (
    <span className="dropdown-item-text text-muted small">∅</span>
  ) : (
    <div className="dropdown-item-text" style={{ maxHeight: '300px', overflowY: 'auto' }}>
      {list.map((u) => (
        <div
          key={u.id}
          className="py-1 border-bottom small d-flex justify-content-between align-items-center"
        >
          <span>{u.username}</span>
          <div className="btn-group btn-group-sm">
            <button className="btn btn-success" onClick={() => onApprove?.(u.id)}>
              ✓
            </button>
            <button
              className="btn btn-outline-danger"
              onClick={() => onDelete?.(u.id)}
              title={t('btn.deleteUser', { defaultValue: 'Delete User' })}
            >
              🗑
            </button>
          </div>
        </div>
      ))}
    </div>
  );

type TabKey = 'pending' | 'all' | 'approved' | 'rejected';

const AdminPanel: React.FC<AdminControlsProps & { t: TranslationFn }> = ({
  user,
  isDarkMode,
  pendingUsers = [],
  allUsers = [],
  onApproveUser,
  onRejectUser,
  onDeleteUser,
  t,
}) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>(
    () => (localStorage.getItem('adminTab') as TabKey) || 'pending'
  );
  useEffect(() => {
    localStorage.setItem('adminTab', tab);
  }, [tab]);
  // user prop currently only used for gating in parent; mild reference kept for potential future use
  if (user && user.is_admin === false) {
    // placeholder branch; keeps reference for lint without side effects
  }
  const approved = useMemo(() => allUsers.filter((u) => userStatus(u) === 'approved'), [allUsers]);
  const rejected = useMemo(() => allUsers.filter((u) => userStatus(u) === 'rejected'), [allUsers]);
  const tabNode = useMemo(() => {
    switch (tab) {
      case 'pending':
        return (
          <PendingList
            list={pendingUsers}
            t={t}
            onApprove={onApproveUser}
            onReject={onRejectUser}
          />
        );
      case 'all':
        return <AllUsers list={allUsers} t={t} />;
      case 'approved':
        return <ApprovedUsers list={approved} t={t} />;
      case 'rejected':
        return (
          <RejectedUsers list={rejected} t={t} onApprove={onApproveUser} onDelete={onDeleteUser} />
        );
      default:
        return null;
    }
  }, [
    tab,
    pendingUsers,
    allUsers,
    approved,
    rejected,
    t,
    onApproveUser,
    onRejectUser,
    onDeleteUser,
  ]);
  const apiDocLinks = [
    { href: '/api/', title: 'API Doc', label: t('nav.apiDocs', { defaultValue: 'API Docs' }) },
    {
      href: '/openapi.json',
      title: 'Open API',
      label: t('nav.openApi', { defaultValue: 'OpenAPI' }),
    },
    { href: '/scalar/', title: 'Scalar', label: t('nav.scalar', { defaultValue: 'Scalar Docs' }) },
    { href: '/redoc/', title: 'RE Doc', label: t('nav.reDocs', { defaultValue: 'ReDoc' }) },
    { href: '/rapidoc/', title: 'Rapi Doc', label: t('nav.RapiDocs', { defaultValue: 'RapiDoc' }) },
  ];
  const handleViewLogs = () =>
    openLogsWindow().catch((e) =>
      alert('Failed to fetch logs: ' + (e instanceof Error ? e.message : 'Unknown error'))
    );
  const handleDownload = () => downloadLogsJson().catch(() => alert('Failed to download logs'));
  return (
    <div className="dropdown">
      <button
        className="btn btn-outline-info btn-sm dropdown-toggle"
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {t('nav.adminPanel', { defaultValue: '⚙️ Admin Panel' })}
        {pendingUsers.length > 0 && (
          <span className="badge bg-danger ms-1">{pendingUsers.length}</span>
        )}
      </button>
      {open && (
        <div
          className={`dropdown-menu dropdown-menu-lg show ${isDarkMode ? 'dropdown-menu-dark' : ''}`}
        >
          <h6 className="dropdown-header">
            {t('nav.userManagement', { defaultValue: '👥 User Management' })}
          </h6>
          <div className="d-flex flex-wrap border-bottom mb-2 gap-1">
            <TabButton
              k="pending"
              active={tab === 'pending'}
              setTab={setTab}
              t={t}
              count={pendingUsers.length}
            />
            <TabButton
              k="all"
              active={tab === 'all'}
              setTab={setTab}
              t={t}
              count={allUsers.length}
            />
            <TabButton
              k="approved"
              active={tab === 'approved'}
              setTab={setTab}
              t={t}
              count={approved.length}
            />
            <TabButton
              k="rejected"
              active={tab === 'rejected'}
              setTab={setTab}
              t={t}
              count={rejected.length}
            />
          </div>
          {tabNode}
          <div className="dropdown-divider"></div>
          <h6 className="dropdown-header">
            {t('nav.apiDocs', { defaultValue: '📚 API Documentation' })}
          </h6>
          {apiDocLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="dropdown-item"
              title={l.title}
            >
              {l.label}
            </a>
          ))}
          <div className="dropdown-divider"></div>
          <h6 className="dropdown-header">
            {t('nav.adminTools', { defaultValue: '🛠️ Admin Tools' })}
          </h6>
          <a
            href="/db-admin/"
            target="_blank"
            rel="noreferrer"
            className="dropdown-item"
            title={t('nav.dbAdmin', { defaultValue: '🗃️ DB Admin' })}
          >
            {t('nav.dbAdmin', { defaultValue: '🗃️ DB Admin' })}
          </a>
          <button
            className="dropdown-item"
            onClick={handleViewLogs}
            title={t('nav.applicationLogs', { defaultValue: '📋 Application Logs' })}
          >
            {t('nav.applicationLogs', { defaultValue: '📋 Application Logs' })}
          </button>
          <button
            className="dropdown-item"
            onClick={handleDownload}
            title={t('nav.downloadLogs', { defaultValue: '💾 Download Logs' })}
          >
            {t('nav.downloadLogs', { defaultValue: '💾 Download Logs' })}
          </button>
          <div className="dropdown-divider"></div>
          <button
            className="dropdown-item text-danger"
            onClick={() => {
              if (
                window.confirm(
                  t('confirm.clearCache', { defaultValue: 'Clear application cache?' })
                )
              ) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }
            }}
          >
            {t('btn.clearCache', { defaultValue: '🗑️ Clear Cache' })}
          </button>
        </div>
      )}
    </div>
  );
};

const AdminControls: React.FC<AdminControlsProps> = (props) => {
  const { user } = props; // linter: used for conditional rendering
  const { t } = useTranslation();
  if (!user?.is_admin) return null;
  return <AdminPanel {...props} t={t} />;
};

export default AdminControls;
