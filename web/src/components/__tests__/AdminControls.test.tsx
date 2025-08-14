import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminControls from '../AdminControls';
import { I18nextProvider } from 'react-i18next';
import { createTestI18n } from '../../i18n/test-i18n';

describe('AdminControls', () => {
  const setup = (overrides: Partial<React.ComponentProps<typeof AdminControls>> = {}) => {
    const onApproveUser = jest.fn();
    const onRejectUser = jest.fn();
    const onDeleteUser = jest.fn();
    const i18n = createTestI18n('en');
    const utils = render(
      <I18nextProvider i18n={i18n}>
        <AdminControls
          isDarkMode={false}
          user={{ is_admin: true }}
          onApproveUser={onApproveUser}
          onRejectUser={onRejectUser}
          onDeleteUser={onDeleteUser}
          pendingUsers={[{ id: 1, username: 'alice', email: 'a@example.com', created_at: new Date().toISOString() }]}
          allUsers={[{ id: 1, username: 'alice', email: 'a@example.com', created_at: new Date().toISOString(), is_admin: false, is_approved: false }]}
          {...overrides}
        />
      </I18nextProvider>
    );
    return { onApproveUser, onRejectUser, onDeleteUser, ...utils };
  };

  test('renders admin panel button and opens dropdown', () => {
    setup();
    const btn = screen.getByRole('button', { name: /Admin Panel|Panneau Admin/i });
    fireEvent.click(btn);
    expect(screen.getByText(/User Management/i)).toBeInTheDocument();
  });

  test('reject pending user triggers handler', () => {
    const { onRejectUser } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Admin Panel|Panneau Admin/i }));
    // Reject button has title containing Reject (translated); using symbol ✗ may not have accessible name, so query by title attribute via getByTitle fallback
    const rejectBtn = screen.getByTitle(/Reject|Rejeter/i);
    fireEvent.click(rejectBtn);
    expect(onRejectUser).toHaveBeenCalledWith(1);
  });

  test('approve pending user triggers handler', () => {
    const { onApproveUser } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Admin Panel|Panneau Admin/i }));
    const approveBtn = screen.getByTitle(/Approve|Approuver/i);
    fireEvent.click(approveBtn);
    expect(onApproveUser).toHaveBeenCalledWith(1);
  });

  test('delete rejected user triggers handler', () => {
    const { onDeleteUser } = setup({
      pendingUsers: [],
      allUsers: [
        { id: 2, username: 'bob', email: 'b@example.com', created_at: new Date().toISOString(), is_admin: false, is_approved: false, status: 'rejected' }
      ]
    });
    fireEvent.click(screen.getByRole('button', { name: /Admin Panel|Panneau Admin/i }));
    // Fallback: label may show translation key if not in minimal test resource set
    const rejectedTab = screen.getByRole('button', { name: /rejected/i });
    fireEvent.click(rejectedTab);
    const deleteBtn = screen.getByTitle(/Delete User|Supprimer l'utilisateur/i);
    fireEvent.click(deleteBtn);
    expect(onDeleteUser).toHaveBeenCalledWith(2);
  });

  test('non-admin user renders nothing', () => {
    const { container } = render(
      <I18nextProvider i18n={createTestI18n('en')}>
        <AdminControls isDarkMode={false} user={{ is_admin: false }} />
      </I18nextProvider>
    );
    expect(container.querySelector('.dropdown')).toBeNull();
  });

  test('badge displays pending count', () => {
    render(
      <I18nextProvider i18n={createTestI18n('en')}>
        <AdminControls
          isDarkMode={false}
          user={{ is_admin: true }}
          pendingUsers={Array.from({ length: 3 }).map((_, i) => ({ id: i + 1, username: `u${i}`, email: `u${i}@e.com`, created_at: new Date().toISOString() }))}
          allUsers={[]}
        />
      </I18nextProvider>
    );
    const btn = screen.getByRole('button', { name: /Admin Panel/ });
    fireEvent.click(btn);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  test('tab switching updates active class and content', () => {
    render(
      <I18nextProvider i18n={createTestI18n('en')}>
        <AdminControls
          isDarkMode={false}
          user={{ is_admin: true }}
          pendingUsers={[]}
          allUsers={[]}
        />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /Admin Panel/ }));
    const approvedTab = screen.getByRole('button', { name: /Approved Users/ });
    fireEvent.click(approvedTab);
    expect(approvedTab.className).toMatch(/btn-success/);
  });

  test('tab persistence via localStorage', () => {
    // Pre-set stored tab
    window.localStorage.setItem('adminTab', 'approved');
    render(
      <I18nextProvider i18n={createTestI18n('en')}>
        <AdminControls isDarkMode={false} user={{ is_admin: true }} pendingUsers={[]} allUsers={[]} />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /Admin Panel/ }));
    const approvedTab = screen.getByRole('button', { name: /Approved Users/ });
    expect(approvedTab.className).toMatch(/btn-success|btn-primary/); // active style
  });

  test('logs buttons present', () => {
    render(
      <I18nextProvider i18n={createTestI18n('en')}>
        <AdminControls isDarkMode={false} user={{ is_admin: true }} pendingUsers={[]} allUsers={[]} />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /Admin Panel/ }));
    expect(screen.getByRole('button', { name: /Application Logs/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download Logs/ })).toBeInTheDocument();
  });

  test('clear cache confirmation triggers reload when confirmed', () => {
    // Monitor cache clear side-effects instead of reload override (readonly)
    const lsClear = jest.spyOn(window.localStorage.__proto__, 'clear');
    const ssClear = jest.spyOn(window.sessionStorage.__proto__, 'clear');
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <I18nextProvider i18n={createTestI18n('en')}>
        <AdminControls isDarkMode={false} user={{ is_admin: true }} pendingUsers={[]} allUsers={[]} />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /Admin Panel/ }));
    fireEvent.click(screen.getByRole('button', { name: /Clear Cache/ }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(lsClear).toHaveBeenCalled();
    expect(ssClear).toHaveBeenCalled();
    confirmSpy.mockRestore();
    lsClear.mockRestore();
    ssClear.mockRestore();
  });

  test('French localization displays French labels', () => {
    render(
      <I18nextProvider i18n={createTestI18n('fr')}>
        <AdminControls isDarkMode={false} user={{ is_admin: true }} pendingUsers={[]} allUsers={[]} />
      </I18nextProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /Panneau Admin/ }));
    expect(screen.getByText(/Gestion Utilisateurs/)).toBeInTheDocument();
  });
});
