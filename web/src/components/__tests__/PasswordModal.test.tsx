import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PasswordModal, { type PasswordForm } from '../PasswordModal';

vi.mock('react-bootstrap', () => {
  const Modal = ({ show, onHide, children, ...rest }: any) => (
    <div data-testid="modal" hidden={!show} {...rest}>
      <button aria-label="close" onClick={onHide} />
      {children}
    </div>
  );
  (Modal as any).displayName = 'MockModal';
  function MockModalHeader({ children, ...props }: any) {
    return <div {...props}>{children}</div>;
  }
  function MockModalTitle({ children, ...props }: any) {
    return <h1 {...props}>{children}</h1>;
  }
  function MockModalBody({ children, ...props }: any) {
    return <div {...props}>{children}</div>;
  }
  function MockModalFooter({ children, ...props }: any) {
    return <div {...props}>{children}</div>;
  }
  (Modal as any).Header = MockModalHeader;
  (Modal as any).Title = MockModalTitle;
  (Modal as any).Body = MockModalBody;
  (Modal as any).Footer = MockModalFooter;
  const Button = ({ children, ...props }: any) => <button {...props}>{children}</button>;
  (Button as any).displayName = 'MockButton';
  const Form: any = ({ children, onSubmit, ...props }: any) => (
    <form onSubmit={onSubmit} {...props}>
      {children}
    </form>
  );
  function MockFormGroup({ children, controlId, ...props }: any) {
    const augmented = React.Children.map(children, (child: any) => {
      if (!React.isValidElement(child)) return child;
      // Link label and control for our mock components
      if (child.type === MockFormLabel) {
        return React.cloneElement(child as React.ReactElement<any>, { htmlFor: controlId });
      }
      if (child.type === MockFormControl) {
        return React.cloneElement(child as React.ReactElement<any>, { id: controlId });
      }
      return child;
    });
    return <div {...props}>{augmented}</div>;
  }
  function MockFormLabel({ children, ...props }: any) {
    return <label {...props}>{children}</label>;
  }
  function MockFormControl(props: any) {
    return <input {...props} />;
  }
  Form.Group = MockFormGroup;
  Form.Label = MockFormLabel;
  Form.Control = MockFormControl;
  return { Modal, Button, Form };
});

describe('PasswordModal', () => {
  const base = () => ({
    show: true,
    isDarkMode: false,
    values: { currentPassword: '', newPassword: '', confirmPassword: '' } as PasswordForm,
    onChange: vi.fn(),
    onClose: vi.fn(),
    onSubmit: vi.fn((e: any) => e.preventDefault()),
  });

  it('renders fields and updates values on change', () => {
    const props = base();
    render(<PasswordModal {...props} />);

    const current = screen.getByLabelText(/^current password$/i);
    const next = screen.getByLabelText(/^new password$/i);
    const confirm = screen.getByLabelText(/^confirm new password$/i);

    fireEvent.change(current, { target: { value: 'old' } });
    fireEvent.change(next, { target: { value: 'new1234' } });
    fireEvent.change(confirm, { target: { value: 'new1234' } });

    expect(props.onChange).toHaveBeenCalledTimes(3);
  });

  it('calls submit and close handlers', () => {
    const props = base();
    render(<PasswordModal {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /update password/i }));
    expect(props.onSubmit).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(props.onClose).toHaveBeenCalled();
  });
});
