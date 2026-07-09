import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LoginForm } from './LoginForm';
import { login } from '@/actions/auth';

vi.mock('@/actions/auth', () => ({
  login: vi.fn(),
}));

const mockedLogin = vi.mocked(login);

afterEach(() => {
  cleanup();
});

describe('LoginForm', () => {
  it('renders the email field, password field, and submit CTA', () => {
    mockedLogin.mockResolvedValue(null);
    render(<LoginForm callbackUrl="/novels" />);

    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Log In' })).toBeTruthy();
  });

  it('submits the callback URL alongside the credentials', () => {
    mockedLogin.mockResolvedValue(null);
    const { container } = render(<LoginForm callbackUrl="/account" />);

    const hidden = container.querySelector('input[name="callbackUrl"]');
    expect(hidden?.getAttribute('value')).toBe('/account');
  });

  it('does not render the error banner by default', () => {
    mockedLogin.mockResolvedValue(null);
    render(<LoginForm callbackUrl="/novels" />);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBeNull();
  });

  it('shows the error banner and marks fields invalid when the action returns an error', async () => {
    mockedLogin.mockResolvedValue('Invalid email or password.');
    render(<LoginForm callbackUrl="/novels" />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nicolas@booktracker.app' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log In' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Invalid email or password.');

    expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByLabelText('Email').getAttribute('aria-describedby')).toBe('login-error');
    expect(screen.getByLabelText('Password').getAttribute('aria-invalid')).toBe('true');
  });
});
