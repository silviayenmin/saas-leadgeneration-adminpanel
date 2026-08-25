import React, { useState } from 'react';
import { Sparkles, Lock, Mail, AlertTriangle, Eye, EyeOff, CheckCircle, Key } from 'lucide-react';
import api from '../services/api';
import './Login.scss';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Forgot / Reset password flow views: 'login' | 'forgot' | 'reset'
  const [view, setView] = useState('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { email, password });
      
      if (res.data.success) {
        const userData = res.data.user;
        const token = res.data.token;

        // Verify user is actually an admin!
        const allowedRoles = ['admin', 'super_admin', 'superadmin', 'super admin'];
        if (!allowedRoles.includes(userData.role?.toLowerCase())) {
          setError('Access Denied: Admin privileges required to access this panel.');
          setLoading(false);
          return;
        }

        // Store credentials
        localStorage.setItem('mapflow_admin_token', token);
        localStorage.setItem('mapflow_admin_user', JSON.stringify(userData));

        onLoginSuccess(userData);
      } else if (res.data.requiresOtp) {
        setError('Verification required. Please verify your email on the main application first.');
      } else {
        setError(res.data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setError('Please enter your email.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.post('/auth/forgot-password', { email: resetEmail.trim() });
      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Verification code sent to your email.');
        setView('reset');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetCode || !newPassword || !confirmNewPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.post('/auth/reset-password', {
        email: resetEmail.trim().toLowerCase(),
        resetCode: resetCode.trim(),
        newPassword: newPassword.trim()
      });
      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Password reset successfully. You can now login.');
        // Clear inputs and return to login view
        setPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setResetCode('');
        setView('login');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="login-box animate-slide-in">
        <div className="brand-header">
          <div className="brand-logo">
            <Sparkles size={24} />
          </div>
          <h1>LeadGen AI</h1>
          <p className="subtitle">Admin Console</p>
        </div>

        {error && (
          <div className="error-banner animate-fade-in">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="success-banner animate-fade-in" style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            color: '#22C55E',
            padding: '12px',
            borderRadius: '8px',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start',
            fontSize: '0.85rem',
            lineHeight: '1.4'
          }}>
            <CheckCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {view === 'login' && (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Admin Email</label>
              <div className="input-with-icon">
                <Mail size={16} />
                <input
                  id="email"
                  type="email"
                  placeholder="admin@leadgen.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="password">Password</label>
                <button 
                  type="button" 
                  onClick={() => { setError(''); setSuccessMsg(''); setView('forgot'); }}
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    color: '#0ea5a4',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: 0
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <div className="input-with-icon">
                <Lock size={16} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="eye-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In to Console'}
            </button>
          </form>
        )}

        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="login-form">
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)', margin: '-8px 0 8px 0', textAlign: 'center', lineHeight: '1.5' }}>
              Enter your administrator email address below. We'll send you a 6-digit verification code to reset your password.
            </p>
            <div className="form-group">
              <label htmlFor="reset-email">Admin Email</label>
              <div className="input-with-icon">
                <Mail size={16} />
                <input
                  id="reset-email"
                  type="email"
                  placeholder="admin@leadgen.ai"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Sending Code...' : 'Send Reset Code'}
            </button>

            <button 
              type="button" 
              className="back-link-btn" 
              onClick={() => { setError(''); setSuccessMsg(''); setView('login'); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'center',
                marginTop: '8px',
                width: '100%'
              }}
            >
              Back to Sign In
            </button>
          </form>
        )}

        {view === 'reset' && (
          <form onSubmit={handleResetPassword} className="login-form">
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)', margin: '-8px 0 8px 0', textAlign: 'center', lineHeight: '1.5' }}>
              Enter the verification code sent to <strong>{resetEmail}</strong> and your new password below.
            </p>
            
            <div className="form-group">
              <label htmlFor="reset-code">Verification Code</label>
              <div className="input-with-icon">
                <Key size={16} />
                <input
                  id="reset-code"
                  type="text"
                  placeholder="6-digit code (e.g. 123456)"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="new-password">New Password</label>
              <div className="input-with-icon">
                <Lock size={16} />
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirm-new-password">Confirm Password</label>
              <div className="input-with-icon">
                <Lock size={16} />
                <input
                  id="confirm-new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Resetting Password...' : 'Save New Password'}
            </button>

            <button 
              type="button" 
              className="back-link-btn" 
              onClick={() => { setError(''); setSuccessMsg(''); setView('login'); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'center',
                marginTop: '8px',
                width: '100%'
              }}
            >
              Cancel and Return
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
