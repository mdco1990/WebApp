import React from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

export type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type Props = {
  show: boolean;
  isDarkMode: boolean;
  values: PasswordForm;
  onChange: (values: PasswordForm) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
};

const PasswordModal: React.FC<Props> = ({
  show,
  isDarkMode,
  values,
  onChange,
  onClose,
  onSubmit,
}) => {
  return (
    <Modal show={show} onHide={onClose} centered data-bs-theme={isDarkMode ? 'dark' : 'light'}>
      <Form onSubmit={onSubmit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title>Change Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3" controlId="currentPassword">
            <Form.Label>Current password</Form.Label>
            <Form.Control
              type="password"
              value={values.currentPassword}
              onChange={(e) => onChange({ ...values, currentPassword: e.target.value })}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="newPassword">
            <Form.Label>New password</Form.Label>
            <Form.Control
              type="password"
              minLength={6}
              value={values.newPassword}
              onChange={(e) => onChange({ ...values, newPassword: e.target.value })}
              required
            />
          </Form.Group>
          <Form.Group className="mb-0" controlId="confirmPassword">
            <Form.Label>Confirm new password</Form.Label>
            <Form.Control
              type="password"
              minLength={6}
              value={values.confirmPassword}
              onChange={(e) => onChange({ ...values, confirmPassword: e.target.value })}
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="warning">
            Update password
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default PasswordModal;
