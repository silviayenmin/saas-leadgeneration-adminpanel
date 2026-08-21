import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import api from './services/api';
import './styles/main.scss';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Authenticate user on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('mapflow_admin_token') || sessionStorage.getItem('mapflow_admin_token');
      if (token) {
        try {
          const res = await api.get('/users/me');
          const allowedRoles = ['admin', 'super_admin', 'superadmin', 'super admin'];
          if (res.data.success && allowedRoles.includes(res.data.data.role?.toLowerCase())) {
            setUser(res.data.data);
          } else {
            // Log out if user is no longer an admin
            handleLogout();
          }
        } catch (err) {
          console.error("Auth check failed:", err);
          handleLogout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('mapflow_admin_token');
    localStorage.removeItem('mapflow_admin_user');
    sessionStorage.removeItem('mapflow_admin_token');
    sessionStorage.removeItem('mapflow_admin_user');
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        height: '100vh', 
        background: '#F5F7FA', 
        color: '#111827', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(14, 165, 164, 0.1)',
          borderTop: '3px solid #0EA5A4',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ fontSize: '0.9rem', color: '#94A3B8', fontWeight: 500 }}>Initializing Admin Console...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return <AdminPanel user={user} onLogout={handleLogout} />;
}

export default App;
