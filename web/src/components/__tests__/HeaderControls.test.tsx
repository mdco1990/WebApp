import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HeaderControls, { HeaderControlsProps } from '../HeaderControls';
import * as api from '../../services/api';

// Mock i18n
vi.mock('react-i18next', () => {
  const changeLanguage = vi.fn();
  return {
    useTranslation: () => ({
      t: (k: string, opts?: any) => (opts?.defaultValue as string) ?? k,
      i18n: {
        language: 'en',
        changeLanguage,
      },
    }),
  };
});

// Mock toast
vi.mock('../../shared/toast', () => ({
  useToast: () => ({ push: vi.fn() }),
}));

const baseProps = (overrides: Partial<HeaderControlsProps> = {}): HeaderControlsProps => ({
  isDarkMode: false,
  onToggleDarkMode: vi.fn(),
  currency: 'USD',
  onSetCurrency: vi.fn(),
  navigateMonth: vi.fn(),
  goToToday: vi.fn(),
  monthInputValue: '2025-02',
  onMonthChange: vi.fn(),
  user: { id: 1, username: 'john', is_admin: true } as any,
  onChangePasswordClick: vi.fn(),
  onLogout: vi.fn(),
  onNavigateToUserManagement: vi.fn(),
  onNavigateToDBAdmin: vi.fn(),
  ...overrides,
});

describe('HeaderControls', () => {
  it('triggers month navigation and today', () => {
    const props = baseProps();
    render(<HeaderControls {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /previous month/i }));
    fireEvent.click(screen.getByRole('button', { name: /next month/i }));
    fireEvent.click(screen.getByRole('button', { name: /go to current month/i }));
    expect(props.navigateMonth).toHaveBeenCalledWith('prev');
    expect(props.navigateMonth).toHaveBeenCalledWith('next');
    expect(props.goToToday).toHaveBeenCalled();
  });

  it('changes month via input', () => {
    const props = baseProps({ monthInputValue: '2025-01' });
    render(<HeaderControls {...props} />);
    const monthInput = screen.getByLabelText('Month', { selector: 'input' });
    fireEvent.change(monthInput, { target: { value: '2025-03' } });
    expect(props.onMonthChange).toHaveBeenCalledWith('2025-03');
  });

  it('switches currency and theme', () => {
    const props = baseProps();
    render(<HeaderControls {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /switch to eur/i }));
    fireEvent.click(screen.getByRole('button', { name: /switch to dark mode/i }));
    expect(props.onSetCurrency).toHaveBeenCalledWith('EUR');
    expect(props.onToggleDarkMode).toHaveBeenCalled();
  });

  it('switches language and stores selection', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    render(<HeaderControls {...baseProps()} />);
    // Click FR
    fireEvent.click(screen.getByRole('button', { name: 'FR' }));
    expect(setItemSpy).toHaveBeenCalledWith('lang', 'fr');
    // Click EN
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(setItemSpy).toHaveBeenCalledWith('lang', 'en');
  });

  it('opens and downloads logs for admin user', async () => {
    const getLogsSpy = vi
      .spyOn(api, 'getLogs')
      .mockResolvedValue([{ level: 'info', msg: 'ok' } as any]);
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({
      document: { documentElement: { innerHTML: '' } },
    } as any);

    render(<HeaderControls {...baseProps()} />);

    fireEvent.click(screen.getByRole('button', { name: /john/i }));
    fireEvent.click(screen.getByRole('button', { name: /view logs/i }));

    await waitFor(() => expect(getLogsSpy).toHaveBeenCalled());
    expect(openSpy).toHaveBeenCalled();

    // Download logs
    // Stub URL.createObjectURL for JSDOM
    (globalThis as any).URL = (globalThis as any).URL || {};
    if (!(URL as any).createObjectURL) {
      (URL as any).createObjectURL = vi.fn(() => 'blob:1');
    }
    const createObjectURL = vi.spyOn(URL, 'createObjectURL');
    // Re-open dropdown in the same render
    fireEvent.click(screen.getByRole('button', { name: /john/i }));
    fireEvent.click(screen.getByRole('button', { name: /download logs/i }));

    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
  });

  it('logout and change password actions', () => {
    const props = baseProps();
    render(<HeaderControls {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /john/i }));
    fireEvent.click(screen.getByRole('button', { name: /change password/i }));
    expect(props.onChangePasswordClick).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /john/i }));
    fireEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(props.onLogout).toHaveBeenCalled();
  });

  it('non-admin does not see admin menu items', () => {
    const props = baseProps({ user: { id: 2, username: 'jane', is_admin: false } as any });
    render(<HeaderControls {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /jane/i }));
    expect(screen.queryByText(/admin panel/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /view logs/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /download logs/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clear cache/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /user management/i })).not.toBeInTheDocument();
  });

  it('admin navigation items call handlers', () => {
    const props = baseProps();
    render(<HeaderControls {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /john/i }));
    fireEvent.click(screen.getByRole('button', { name: /database admin/i }));
    expect(props.onNavigateToDBAdmin).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /john/i }));
    fireEvent.click(screen.getByRole('button', { name: /user management/i }));
    expect(props.onNavigateToUserManagement).toHaveBeenCalled();
  });

  it('clear cache confirms and triggers clears + reload', () => {
    const props = baseProps();
    // Mock confirm -> true
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const storageClear = vi.spyOn(Storage.prototype, 'clear');
    // Mock reload by replacing location object (jsdom limitation)
    const originalLocation = window.location;
    const reloadMock = vi.fn();
    delete (window as any).location;
    (window as any).location = { reload: reloadMock } as any;

    render(<HeaderControls {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /john/i }));
    fireEvent.click(screen.getByRole('button', { name: /clear cache/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(storageClear).toHaveBeenCalledTimes(2);
    expect(reloadMock).toHaveBeenCalled();

    // restore
    (window as any).location = originalLocation;
  });
});
