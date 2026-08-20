import React, { useState } from 'react';
import { Sparkles, Lock, Mail, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import './Login.scss';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        if (userData.role !== 'admin') {
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

  return (
    <div className="admin-login-wrapper">
      <div className="login-box animate-slide-in">
        <div className="brand-header">
          <div className="brand-logo">
            <Sparkles size={24} />
          </div>
          <h1>MapFlow AI</h1>
          <p className="subtitle">Admin Console</p>
        </div>

        {error && (
          <div className="error-banner animate-fade-in">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Admin Email</label>
            <div className="input-with-icon">
              <Mail size={16} />
              <input
                id="email"
                type="email"
                placeholder="admin@mapflow.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
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
      </div>
    </div>
  );
};

export default Login;
