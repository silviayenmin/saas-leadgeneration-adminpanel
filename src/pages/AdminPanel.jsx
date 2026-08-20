import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  ShieldAlert, 
  MapPin, 
  Trash2, 
  Key, 
  LogOut, 
  TrendingUp, 
  Database,
  Moon,
  Sun,
  X,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Smile,
  Zap,
  Award,
  Clock,
  Menu,
  Bell,
  Calendar,
   Wallet,
   Target,
   Coins,
   Compass,
   Percent,
   Code,
   Sparkles,
   CreditCard
 } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import api from '../services/api';
import './AdminPanel.scss';

const AdminPanel = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'scans'
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'user', 'admin'
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    freeTiers: 0,
    starterTiers: 0,
    agencyTiers: 0,
    totalScans: 0,
    totalLeads: 0,
    totalCreditsUsed: 0,
    dbMode: 'MONGODB',
    recentSignups: [],
    recentSubscriptions: []
  });
  const [usersList, setUsersList] = useState([]);
  const [scansList, setScansList] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [scanSearch, setScanSearch] = useState('');
  const [chartRange, setChartRange] = useState('daily'); // 'daily', 'weekly', 'annual'
  
  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('mapflow_admin_theme') || 'light';
  });

  // Credit Adjustment Modal State
  const [selectedUserForCredits, setSelectedUserForCredits] = useState(null);
  const [creditLimitInput, setCreditLimitInput] = useState(25);
  const [creditsUsedInput, setCreditsUsedInput] = useState(0);

  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const formatRelativeDate = (dateString) => {
    if (!dateString) return 'Joined recently';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      if (diffMs < 0) return 'Just now';
      
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 60) {
        return `${diffMins || 1}m ago`;
      }
      if (diffHrs < 24) {
        return `${diffHrs}h ago`;
      }
      if (diffDays === 1) {
        return 'Yesterday';
      }
      if (diffDays < 7) {
        return `${diffDays}d ago`;
      }
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return 'Recently';
    }
  };

  const formatDateLabel = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  // Fetch functions
  const fetchStats = async () => {
    try {
      const res = await api.get(`/admin/stats?_t=${Date.now()}`);
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get(`/admin/users?_t=${Date.now()}`);
      if (res.data.success) {
        setUsersList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const fetchScans = async () => {
    try {
      const res = await api.get(`/admin/scans?_t=${Date.now()}`);
      if (res.data.success) {
        setScansList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load scans:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchUsers(), fetchScans()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update theme helper
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mapflow_admin_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Admin Actions
  const handleToggleRole = async (targetUser) => {
    const nextRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const confirmMsg = `Are you sure you want to change ${targetUser.fullName}'s role from '${targetUser.role}' to '${nextRole}'?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await api.put(`/admin/users/${targetUser.id}/role`, { role: nextRole });
      if (res.data.success) {
        setSuccessMsg(res.data.message);
        fetchUsers();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update user role.');
    }
  };

  const handleDeleteUser = async (targetUser) => {
    const confirmMsg = `WARNING: Are you absolutely sure you want to delete user "${targetUser.fullName}" (${targetUser.email})?\n\nThis will cascade delete all their subscription records, scans, leads, and transaction histories permanently!`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await api.delete(`/admin/users/${targetUser.id}`);
      if (res.data.success) {
        setSuccessMsg(res.data.message);
        loadData(); // Reload stats & user list
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to delete user.');
    }
  };

  const handleOpenCreditModal = (targetUser) => {
    setSelectedUserForCredits(targetUser);
    setCreditLimitInput(targetUser.creditLimit);
    setCreditsUsedInput(targetUser.creditsUsed);
  };

  const handleSaveCredits = async (e) => {
    e.preventDefault();
    if (!selectedUserForCredits) return;

    try {
      const res = await api.put(`/admin/users/${selectedUserForCredits.id}/credits`, {
        creditLimit: parseInt(creditLimitInput),
        creditsUsed: parseInt(creditsUsedInput)
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message);
        setSelectedUserForCredits(null);
        fetchUsers();
        fetchStats();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update user credits.');
    }
  };

  // Close notifications after timeout
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(''), 5000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  // Search & Role filters
  const filteredUsers = usersList.filter(u => 
    u.fullName?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredUsersForDirectory = filteredUsers.filter(u => 
    roleFilter === 'all' ? true : u.role === roleFilter
  );

  const filteredUsersForSubscriptions = filteredUsers.filter(u => 
    u.role === 'user'
  );

  const filteredScans = scansList.filter(s => 
    s.keyword?.toLowerCase().includes(scanSearch.toLowerCase()) ||
    s.location?.toLowerCase().includes(scanSearch.toLowerCase()) ||
    s.userEmail?.toLowerCase().includes(scanSearch.toLowerCase())
  );

  return (
    <div className="admin-dashboard-container">
      
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="brand-left">
            <div className="brand-icon">
              <Sparkles size={20} />
            </div>
            <span className="brand-text">MAPFLOW AI</span>
          </div>
          <span className="admin-badge-pill">ADMIN</span>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <TrendingUp size={18} />
            <span>Overview Stats</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={18} />
            <span>User Directory</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'subscriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscriptions')}
          >
            <CreditCard size={18} />
            <span>Subscriptions</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'scans' ? 'active' : ''}`}
            onClick={() => setActiveTab('scans')}
          >
            <MapPin size={18} />
            <span>Platform Scans</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="admin-profile">
            <div className="avatar">A</div>
            <div className="details">
              <div className="name">{user?.fullName || 'Administrator'}</div>
              <div className="email">{user?.email || 'admin@mapflow.ai'}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout} title="Log Out of Console">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Work Area */}
      <div className="admin-main">
        
        {/* Header Bar */}
        <header className="admin-header">
          <div className="header-left-group">
            <div className="search-bar">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search users, leads, scans..." 
                value={activeTab === 'users' || activeTab === 'subscriptions' ? userSearch : (activeTab === 'scans' ? scanSearch : '')}
                onChange={(e) => {
                  if (activeTab === 'users' || activeTab === 'subscriptions') setUserSearch(e.target.value);
                  if (activeTab === 'scans') setScanSearch(e.target.value);
                }}
              />
            </div>
          </div>

          <div className="header-right-group">
            <div className="notification-bell">
              <Bell size={20} />
              <span className="bell-badge">8</span>
            </div>
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle Light/Dark Theme">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="admin-badge">
              <div className="avatar-circle">A</div>
              <div className="avatar-details">
                <span className="name">{user?.fullName || 'Admin User'}</span>
                <span className="sub">Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Global Notifications */}
        {successMsg && (
          <div className="notification success-toast animate-fade-in">
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="notification error-toast animate-fade-in">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content Container */}
        <main className="admin-content custom-scroll">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Fetching platform data...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="tab-pane animate-fade-in">
                  
                  {/* Top Welcome Title Grid */}
                  <div className="dashboard-welcome-row">
                    <div className="welcome-text">
                      <h2>Good morning, Admin</h2>
                      <p>Here's what's happening with your platform today.</p>
                    </div>
                  </div>

                  {/* Row 1: KPI Cards Grid */}
                  <div className="kpi-card-grid">
                    <div className="dashboard-kpi-card card-blue">
                      <div className="card-header">
                        <div className="icon-wrapper">
                          <Users size={20} />
                        </div>
                        <h3>Total Users</h3>
                      </div>
                      <div className="value">{stats.totalUsers}</div>
                      <div className="trend trend-up">
                        <span>↑ 25% vs last 7 days</span>
                      </div>
                    </div>

                    <div className="dashboard-kpi-card card-green">
                      <div className="card-header">
                        <div className="icon-wrapper">
                          <Wallet size={20} />
                        </div>
                        <h3>Active Subscriptions</h3>
                      </div>
                      <div className="value">{stats.starterTiers + stats.agencyTiers}</div>
                      <div className="trend trend-up">
                        <span>↑ 20% vs last 7 days</span>
                      </div>
                    </div>

                    <div className="dashboard-kpi-card card-purple">
                      <div className="card-header">
                        <div className="icon-wrapper">
                          <Target size={20} />
                        </div>
                        <h3>Leads Discovered</h3>
                      </div>
                      <div className="value">{stats.totalLeads}</div>
                      <div className="trend trend-up">
                        <span>↑ 18% vs last 7 days</span>
                      </div>
                    </div>

                    <div className="dashboard-kpi-card card-orange">
                      <div className="card-header">
                        <div className="icon-wrapper">
                          <Coins size={20} />
                        </div>
                        <h3>Credits Consumed</h3>
                      </div>
                      <div className="value">{stats.totalCreditsUsed}</div>
                      <div className="trend trend-up">
                        <span>↑ 32% vs last 7 days</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Charts Panel Group (Platform Activity & User Distribution) */}
                  {(() => {
                    const dailyData = [
                      { label: 'May 12', scans: 10, leads: 40 },
                      { label: 'May 13', scans: 25, leads: 90 },
                      { label: 'May 14', scans: 15, leads: 50 },
                      { label: 'May 15', scans: 8, leads: 38 },
                      { label: 'May 16', scans: 28, leads: 78 },
                      { label: 'May 17', scans: 20, leads: 60 },
                      { label: 'May 18', scans: Math.max(5, stats.totalScans), leads: Math.max(10, stats.totalLeads) }
                    ];

                    const weeklyData = [
                      { label: 'Week 1', scans: 12, leads: 180 },
                      { label: 'Week 2', scans: 18, leads: 270 },
                      { label: 'Week 3', scans: 15, leads: 220 },
                      { label: 'Week 4', scans: stats.totalScans * 2, leads: stats.totalLeads * 2 }
                    ];

                    const annualData = [
                      { label: 'Jan', scans: 40, leads: 600 },
                      { label: 'Feb', scans: 45, leads: 680 },
                      { label: 'Mar', scans: 50, leads: 750 },
                      { label: 'Apr', scans: 55, leads: 820 },
                      { label: 'May', scans: 60, leads: 900 },
                      { label: 'Jun', scans: 70, leads: 1050 },
                      { label: 'Jul', scans: 85, leads: 1270 },
                      { label: 'Aug', scans: stats.totalScans * 10, leads: stats.totalLeads * 10 }
                    ];

                    const chartData = chartRange === 'weekly' ? weeklyData : (chartRange === 'annual' ? annualData : dailyData);

                    // Donut Chart Data
                    const donutData = [
                      { name: 'Free Tier', value: stats.freeTiers, color: '#22C55E' },
                      { name: 'Starter Pro', value: stats.starterTiers, color: '#F59E0B' },
                      { name: 'Agency Pro', value: stats.agencyTiers, color: '#A855F7' },
                      { name: 'Other / Inactive', value: Math.max(0, 10 - stats.totalUsers), color: '#CBD5E1' }
                    ];
                    const totalDonutValue = donutData.reduce((a, b) => a + b.value, 0);

                    return (
                      <div className="analytics-split-layout">
                        {/* Platform Activity Area Chart */}
                        <div className="chart-panel platform-activity-panel">
                          <div className="panel-header">
                            <div className="panel-title-group">
                              <h3>Platform Activity Overview</h3>
                              <div className="chart-legend">
                                <span className="legend-dot dot-green"></span>
                                <span>Leads Discovered</span>
                                <span className="legend-dot dot-teal" style={{ marginLeft: '12px' }}></span>
                                <span>Maps Scans</span>
                              </div>
                            </div>
                            <div className="range-dropdown">
                              <select value={chartRange} onChange={(e) => setChartRange(e.target.value)}>
                                <option value="daily">Last 7 days</option>
                                <option value="weekly">Last 4 weeks</option>
                                <option value="annual">This year</option>
                              </select>
                            </div>
                          </div>
                          
                          <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorTealScans" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0EA5A4" stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor="#0EA5A4" stopOpacity={0}/>
                                  </linearGradient>
                                  <linearGradient id="colorGreenLeads" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.06)" />
                                <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: '#FFFFFF', 
                                    borderColor: '#E2E8F0',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                  }}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="scans" 
                                  stroke="#0EA5A4" 
                                  strokeWidth={2.5}
                                  fillOpacity={1} 
                                  fill="url(#colorTealScans)" 
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="leads" 
                                  stroke="#22C55E" 
                                  strokeWidth={2.5}
                                  fillOpacity={1} 
                                  fill="url(#colorGreenLeads)" 
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* User Distribution Donut Chart */}
                        <div className="chart-panel user-distribution-panel">
                          <div className="panel-header">
                            <h3>User Distribution</h3>
                          </div>
                          
                          <div className="donut-body">
                            <div className="donut-chart-container">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={donutData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={75}
                                    paddingAngle={3}
                                    dataKey="value"
                                  >
                                    {donutData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                </PieChart>
                              </ResponsiveContainer>
                              <div className="donut-labels-center">
                                <span className="total-val">{stats.totalUsers}</span>
                                <span className="label-text">Total Users</span>
                              </div>
                            </div>

                            <div className="donut-legend-list">
                              {donutData.map((d, idx) => (
                                <div key={idx} className="legend-item">
                                  <div className="dot" style={{ backgroundColor: d.color }}></div>
                                  <div className="legend-details">
                                    <span className="name">{d.name}</span>
                                    <span className="count">
                                      {d.value} ({totalDonutValue ? Math.round((d.value / totalDonutValue) * 100) : 0}%)
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Row 4: Recent Signups and Subscriptions Tables */}
                  <div className="split-tables-row">
                    <div className="dashboard-table-card">
                      <div className="card-header">
                        <h3>Recent Signups</h3>
                        <button className="view-all-link" onClick={() => setActiveTab('users')}>View all</button>
                      </div>
                      <div className="table-responsive">
                        <table className="compact-table">
                          <thead>
                            <tr>
                              <th>USER</th>
                              <th>EMAIL</th>
                              <th>TIER</th>
                              <th style={{ textAlign: 'right' }}>JOINED</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.recentSignups && stats.recentSignups.length > 0 ? (
                              stats.recentSignups.map(signup => (
                                <tr key={signup.id}>
                                  <td>
                                    <div className="user-profile-cell">
                                      <div className="avatar-mini">{signup.fullName ? signup.fullName.charAt(0).toUpperCase() : 'U'}</div>
                                      <span className="name">{signup.fullName}</span>
                                    </div>
                                  </td>
                                  <td className="muted-cell">{signup.email}</td>
                                  <td>
                                    <span className={`badge role-${signup.role}`}>
                                      {signup.role.toUpperCase()}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>{formatRelativeDate(signup.createdAt)}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="4" className="empty-cell">No recent registrations found.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="dashboard-table-card">
                      <div className="card-header">
                        <h3>Recent Subscription Upgrades</h3>
                        <button className="view-all-link" onClick={() => setActiveTab('users')}>View all</button>
                      </div>
                      <div className="table-responsive">
                        <table className="compact-table">
                          <thead>
                            <tr>
                              <th>USER</th>
                              <th>NEW PLAN</th>
                              <th style={{ textAlign: 'right' }}>DATE</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.recentSubscriptions && stats.recentSubscriptions.length > 0 ? (
                              stats.recentSubscriptions.map((sub, idx) => (
                                <tr key={idx}>
                                  <td>
                                    <div className="user-profile-cell">
                                      <div className="avatar-mini">{sub.fullName ? sub.fullName.charAt(0).toUpperCase() : 'U'}</div>
                                      <span className="name">{sub.fullName}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <span className={`badge plan-${sub.plan.toLowerCase()}`}>
                                      {sub.plan ? sub.plan.replace('_', ' ') : ''}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>{formatDateLabel(sub.updatedAt)}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="3" className="empty-cell">No subscription changes logged.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: USERS LIST */}
              {activeTab === 'users' && (
                <div className="tab-pane animate-fade-in">
                  <div className="table-container">
                    <div className="table-header-bar">
                      <h2>User Accounts ({filteredUsersForDirectory.length})</h2>
                      <div className="table-header-controls" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div className="table-filters">
                          <button className={`filter-btn ${roleFilter === 'all' ? 'active' : ''}`} onClick={() => setRoleFilter('all')}>All</button>
                          <button className={`filter-btn ${roleFilter === 'user' ? 'active' : ''}`} onClick={() => setRoleFilter('user')}>Users</button>
                          <button className={`filter-btn ${roleFilter === 'admin' ? 'active' : ''}`} onClick={() => setRoleFilter('admin')}>Admins</button>
                        </div>
                        <div className="search-input-wrapper">
                          <Search size={16} />
                          <input 
                            type="text" 
                            placeholder="Search users by name or email..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>User Profile</th>
                            <th>Email Address</th>
                            <th>Company Name</th>
                            <th>Company URL</th>
                            <th>Account Role</th>
                            <th>Email Verified</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsersForDirectory.length > 0 ? (
                            filteredUsersForDirectory.map(u => (
                              <tr key={u.id}>
                                <td>
                                  <div className="user-profile-cell">
                                    <div className="avatar-small">{u.fullName?.charAt(0) || 'U'}</div>
                                    <span className="name">{u.fullName}</span>
                                  </div>
                                </td>
                                <td>{u.email}</td>
                                <td style={{ fontWeight: '500', color: '#1E293B' }}>{u.companyName || 'N/A'}</td>
                                <td>
                                  {u.companyWebsite && u.companyWebsite !== 'N/A' ? (
                                    <a 
                                      href={u.companyWebsite.startsWith('http') ? u.companyWebsite : `https://${u.companyWebsite}`}
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="company-link"
                                    >
                                      {u.companyWebsite}
                                    </a>
                                  ) : (
                                    <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>N/A</span>
                                  )}
                                </td>
                                <td>
                                  <span className={`badge role-${u.role}`}>
                                    {u.role.toUpperCase()}
                                  </span>
                                </td>
                                <td>
                                  <span className={`badge ${u.isVerified ? 'success' : 'warning'}`}>
                                    {u.isVerified ? 'VERIFIED' : 'PENDING'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" className="empty-table">No users match the search query.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SUBSCRIPTIONS */}
              {activeTab === 'subscriptions' && (
                <div className="tab-pane animate-fade-in">
                  <div className="table-container">
                    <div className="table-header-bar">
                      <h2>User Subscriptions & Usage ({filteredUsersForSubscriptions.length})</h2>
                      <div className="search-input-wrapper">
                        <Search size={16} />
                        <input 
                          type="text" 
                          placeholder="Search subscriptions by name or email..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>User Profile</th>
                            <th>Active Plan</th>
                            <th>Limit / Used</th>
                            <th>Billing Cycle / Reset</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsersForSubscriptions.length > 0 ? (
                            filteredUsersForSubscriptions.map(u => (
                              <tr key={u.id}>
                                <td>
                                  <div className="user-profile-cell">
                                    <div className="avatar-small">{u.fullName?.charAt(0) || 'U'}</div>
                                    <span className="name">{u.fullName}</span>
                                  </div>
                                </td>
                                <td>
                                  <span className={`badge plan-${(u.plan || 'FREE').toLowerCase()}`}>
                                    {u.plan ? u.plan.replace('_', ' ') : 'FREE'}
                                  </span>
                                </td>
                                <td>
                                  <div className="credits-display">
                                    <span className="limit">{u.creditLimit} L</span>
                                    <span className="divider">/</span>
                                    <span className="used">{u.creditsUsed} U</span>
                                  </div>
                                </td>
                                <td>
                                  <span style={{ fontWeight: '500', color: '#64748B', fontSize: '0.85rem' }}>
                                    {u.resetDate && u.resetDate !== 'N/A' ? `Reset: ${u.resetDate}` : 'N/A'}
                                  </span>
                                </td>
                                <td>
                                  <div className="actions-cell">
                                    <button 
                                      className="action-btn key-btn" 
                                      title="Adjust User Credits"
                                      onClick={() => handleOpenCreditModal(u)}
                                    >
                                      <Key size={14} />
                                    </button>
                                    <button 
                                      className={`action-btn role-btn ${u.role === 'admin' ? 'is-admin' : ''}`}
                                      title="Toggle User/Admin Role"
                                      onClick={() => handleToggleRole(u)}
                                    >
                                      <UserCheck size={14} />
                                    </button>
                                    <button 
                                      className="action-btn delete-btn" 
                                      title="Cascade Delete User"
                                      onClick={() => handleDeleteUser(u)}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" className="empty-table">No subscriptions found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SCANS LIST */}
              {activeTab === 'scans' && (
                <div className="tab-pane animate-fade-in">
                  <div className="table-container">
                    <div className="table-header-bar">
                      <h2>Google Maps Searches ({filteredScans.length})</h2>
                      <div className="search-input-wrapper">
                        <Search size={16} />
                        <input 
                          type="text" 
                          placeholder="Search scans by keyword, town or user email..."
                          value={scanSearch}
                          onChange={(e) => setScanSearch(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Search ID</th>
                            <th>Search Keyword</th>
                            <th>Search Location</th>
                            <th>Leads Found</th>
                            <th>Executed By</th>
                            <th>Created Timestamp</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredScans.length > 0 ? (
                            filteredScans.map(s => (
                              <tr key={s.id}>
                                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', opacity: 0.7 }}>
                                  {s.id?.substring(0, 8)}...
                                </td>
                                <td style={{ fontWeight: '500' }}>{s.keyword}</td>
                                <td>{s.location}</td>
                                <td>
                                  <span className="badge primary">{s.businessesFound} leads</span>
                                </td>
                                <td>{s.userEmail}</td>
                                <td>{new Date(s.createdAt).toLocaleString()}</td>
                                <td>
                                  <span className={`badge ${s.status === 'Completed' ? 'success' : 'warning'}`}>
                                    {s.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="7" className="empty-table">No search records match the query.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* CREDIT ADJUSTMENT MODAL */}
      {selectedUserForCredits && (
        <div className="modal-backdrop">
          <div className="modal-content animate-slide-in">
            <div className="modal-header">
              <h3>Adjust User Credits</h3>
              <button className="close-btn" onClick={() => setSelectedUserForCredits(null)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSaveCredits}>
              <div className="modal-body">
                <div className="user-details-summary">
                  <div className="avatar-medium">{selectedUserForCredits.fullName?.charAt(0)}</div>
                  <div className="summary-text">
                    <h4>{selectedUserForCredits.fullName}</h4>
                    <p>{selectedUserForCredits.email}</p>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="creditLimitInput">Credit Limit</label>
                    <input 
                      id="creditLimitInput"
                      type="number" 
                      min="0"
                      value={creditLimitInput}
                      onChange={(e) => setCreditLimitInput(e.target.value)}
                      required
                    />
                    <small>Maximum credits this user is allowed to consume</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="creditsUsedInput">Credits Used</label>
                    <input 
                      id="creditsUsedInput"
                      type="number" 
                      min="0"
                      value={creditsUsedInput}
                      onChange={(e) => setCreditsUsedInput(e.target.value)}
                      required
                    />
                    <small>Amount of credits already consumed by this user</small>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setSelectedUserForCredits(null)}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
