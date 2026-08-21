import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  AlertTriangle, 
  ChevronDown,
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
   CreditCard,
   Edit2,
   Tag,
   Star,
   Info,
   Plus
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

const enrichUserWithMockDetails = (u) => {
  // Map role
  const mappedRole = u.role === 'admin' ? 'ADMIN' : (u.role === 'editor' ? 'EDITOR' : 'MEMBER');
  
  // Status: ACTIVE or SUSPENDED
  const mappedStatus = u.status || 'ACTIVE'; 
  
  // Define default mock fields
  const mockPhone = u.phone || `+1 (555) 019-${1000 + Math.floor(Math.random() * 8999)}`;
  const mockJoinDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString();
  
  // Mock Payment Details (80% card linked status by default)
  const hasCard = u.hasCardAttached !== undefined ? u.hasCardAttached : (Math.random() > 0.2);
  const mockCardDetails = hasCard ? {
    cardBrand: Math.random() > 0.5 ? 'Visa' : 'Mastercard',
    last4: `${1000 + Math.floor(Math.random() * 9000)}`,
    expiry: `${1 + Math.floor(Math.random() * 11)}/28`,
    billingEmail: u.email || 'billing@example.com'
  } : null;

  const mockPlanName = u.plan === 'STARTER' ? 'Pro' : (u.plan === 'AGENCY_PRO' ? 'Enterprise' : 'Free');
  const mockPlanAmount = u.plan === 'STARTER' ? '$29 / mo' : (u.plan === 'AGENCY_PRO' ? '$99 / mo' : '$0');
  const mockRenewalDate = u.resetDate && u.resetDate !== 'N/A' ? u.resetDate : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString();

  const mockCompany = u.companyName && u.companyName !== 'N/A' ? u.companyName : `${u.fullName?.split(' ')[0] || 'User'} Corp`;
  const mockWebsite = u.companyWebsite && u.companyWebsite !== 'N/A' ? u.companyWebsite : `https://${mockCompany.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company'}.com`;
  const mockIndustry = Math.random() > 0.5 ? 'Tech SaaS' : 'Marketing & Sales';
  const mockCompanySize = Math.random() > 0.5 ? '11-50 employees' : '1-10 employees';

  return {
    ...u,
    name: u.fullName || 'User',
    phone: mockPhone,
    role: mappedRole,
    joinDate: mockJoinDate,
    status: mappedStatus,
    paymentMethod: mockCardDetails,
    company: {
      name: mockCompany,
      website: mockWebsite,
      industry: mockIndustry,
      size: mockCompanySize
    },
    subscription: {
      planName: mockPlanName,
      status: 'ACTIVE',
      amount: mockPlanAmount,
      renewalDate: mockRenewalDate
    },
    recentActivity: u.recentActivity || [
      { id: `${u.id}-1`, action: 'Logged In', ipAddress: '192.168.1.45', device: 'Chrome - macOS', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleString() },
      { id: `${u.id}-2`, action: 'API Key Created', ipAddress: '192.168.1.45', device: 'Chrome - macOS', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleString() },
      { id: `${u.id}-3`, action: 'Updated Lead Config', ipAddress: '192.168.1.45', device: 'Chrome - macOS', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleString() }
    ]
  };
};

const CustomSelect = ({ value, onChange, options, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div 
      className={`custom-select-wrapper ${isOpen ? 'is-open' : ''} ${className}`}
      tabIndex={0}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <div className="custom-select-trigger" onClick={() => setIsOpen(!isOpen)}>
        <span>{selectedOption ? selectedOption.label : ''}</span>
        <ChevronDown size={14} className={`arrow-icon ${isOpen ? 'rotate' : ''}`} />
      </div>
      {isOpen && (
        <div className="custom-select-options-list">
          {options.map(opt => (
            <div 
              key={opt.value} 
              className={`custom-select-option-item ${value === opt.value ? 'is-selected' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminPanel = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'scans'
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'ADMIN', 'EDITOR', 'MEMBER'
  const [verificationFilter, setVerificationFilter] = useState('all'); // 'all', 'PENDING', 'VERIFIED', 'REJECTED'
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
  
  // State variables for detailed modal, rejection reasoning, and pagination
  const [selectedUser, setSelectedUser] = useState(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activityFilter, setActivityFilter] = useState('all'); // 'all', 'Logged In', 'API Key Created', 'Updated Lead Config'
  const [activityPage, setActivityPage] = useState(1);

  // Global pricing plans management states
  const [plansList, setPlansList] = useState([]);
  const [subTab, setSubTab] = useState('subscribers'); // 'subscribers', 'plans'
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  
  // Plan form states
  const [planSlug, setPlanSlug] = useState('');
  const [planName, setPlanName] = useState('');
  const [planAmount, setPlanAmount] = useState('');
  const [planCreditLimit, setPlanCreditLimit] = useState(25);
  const [planFeaturesText, setPlanFeaturesText] = useState('');
  const [planIsPopular, setPlanIsPopular] = useState(false);
  const [planBadge, setPlanBadge] = useState('');

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('mapflow_admin_theme') || 'light';
  });

  useEffect(() => {
    if (selectedUser) {
      console.log("SELECTED USER OBJ:", selectedUser);
    }
  }, [selectedUser]);

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
        const enriched = res.data.data.map(u => enrichUserWithMockDetails(u));
        setUsersList(enriched);
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

  const fetchPlans = async () => {
    try {
      const res = await api.get(`/admin/plans?_t=${Date.now()}`);
      if (res.data.success) {
        setPlansList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load pricing plans:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchUsers(), fetchScans(), fetchPlans()]);
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

  // Detailed User Verification & Status Actions
  const updateVerificationStatus = (userId, status, reason = '') => {
    setUsersList(prev => prev.map(u => {
      if (u.id === userId) {
        const updated = {
          ...u,
          profile: {
            ...u.profile,
            verificationStatus: status,
            rejectionReason: reason
          }
        };
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser(updated);
        }
        return updated;
      }
      return u;
    }));
    setSuccessMsg(`Verification status updated to ${status}.`);
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const backendRole = newRole.toLowerCase() === 'admin' ? 'admin' : 'user';
      const res = await api.put(`/admin/users/${userId}/role`, { role: backendRole });
      if (res.data.success) {
        setUsersList(prev => prev.map(u => {
          if (u.id === userId) {
            const updated = { ...u, role: newRole };
            if (selectedUser && selectedUser.id === userId) {
              setSelectedUser(updated);
            }
            return updated;
          }
          return u;
        }));
        setSuccessMsg(`User role updated to ${newRole} successfully.`);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update user role.');
    }
  };

  const toggleUserStatus = (userId) => {
    let nextStatus = 'ACTIVE';
    setUsersList(prev => prev.map(u => {
      if (u.id === userId) {
        nextStatus = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        const updated = { ...u, status: nextStatus };
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser(updated);
        }
        return updated;
      }
      return u;
    }));
    setSuccessMsg(`User successfully ${nextStatus === 'ACTIVE' ? 'activated' : 'suspended'}.`);
  };

  const handleTogglePaymentCard = async () => {
    if (!selectedUser) return;
    try {
      const hasCardNow = !!selectedUser.paymentMethod;
      const nextCard = hasCardNow ? null : {
        cardBrand: Math.random() > 0.5 ? 'Visa' : 'Mastercard',
        last4: `${1000 + Math.floor(Math.random() * 9000)}`,
        expiry: `${1 + Math.floor(Math.random() * 11)}/28`,
        billingEmail: selectedUser.email
      };

      const payload = {
        hasCardAttached: !hasCardNow,
        cardBrand: nextCard ? nextCard.cardBrand : null,
        cardLast4: nextCard ? nextCard.last4 : null,
        cardExpiry: nextCard ? nextCard.expiry : null
      };

      const res = await api.put(`/admin/users/${selectedUser.id}/payment-method`, payload);
      if (res.data.success) {
        setSuccessMsg(hasCardNow ? 'Credit card details removed.' : 'Mock card details linked to user profile.');
        // Update local state instantly
        const updatedUser = {
          ...selectedUser,
          paymentMethod: nextCard,
          hasCardAttached: !hasCardNow,
          cardBrand: nextCard ? nextCard.cardBrand : null,
          cardLast4: nextCard ? nextCard.last4 : null,
          cardExpiry: nextCard ? nextCard.expiry : null
        };
        setSelectedUser(updatedUser);
        // Refresh users list from database
        fetchUsers();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update user payment profile.');
    }
  };

  const handleUpgradePlan = async () => {
    if (!selectedUser) return;
    try {
      const nextResetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();
      const payload = {
        plan: 'STARTER',
        creditLimit: 500,
        resetDate: nextResetDate
      };

      const res = await api.put(`/admin/users/${selectedUser.id}/subscription`, payload);
      if (res.data.success) {
        setSuccessMsg(`User ${selectedUser.name} upgraded to Pro tier successfully.`);
        // Update local state instantly
        const updatedUser = {
          ...selectedUser,
          plan: 'STARTER',
          creditLimit: 500,
          subscription: {
            ...selectedUser.subscription,
            planName: 'Pro',
            amount: '$29 / mo',
            renewalDate: nextResetDate
          }
        };
        setSelectedUser(updatedUser);
        // Refresh tables and stats
        fetchUsers();
        fetchStats();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to upgrade user subscription.');
    }
  };

  const handleCancelPlan = async () => {
    if (!selectedUser) return;
    const confirmMsg = `Are you sure you want to cancel the subscription plan for ${selectedUser.name}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const payload = {
        plan: 'FREE',
        creditLimit: 25,
        resetDate: 'N/A'
      };

      const res = await api.put(`/admin/users/${selectedUser.id}/subscription`, payload);
      if (res.data.success) {
        setSuccessMsg(`Subscription cancelled. User downgraded to Free tier.`);
        // Update local state instantly
        const updatedUser = {
          ...selectedUser,
          plan: 'FREE',
          creditLimit: 25,
          subscription: {
            ...selectedUser.subscription,
            planName: 'Free',
            amount: '$0',
            renewalDate: 'N/A'
          }
        };
        setSelectedUser(updatedUser);
        // Refresh tables and stats
        fetchUsers();
        fetchStats();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to cancel user subscription.');
    }
  };

  // Pricing Plans Configuration Actions
  const handleOpenCreatePlanModal = () => {
    setEditingPlan(null);
    setPlanSlug('');
    setPlanName('');
    setPlanAmount('');
    setPlanCreditLimit(25);
    setPlanFeaturesText('');
    setPlanIsPopular(false);
    setPlanBadge('');
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlanModal = (plan) => {
    setEditingPlan(plan);
    setPlanSlug(plan.id);
    setPlanName(plan.planName);
    setPlanAmount(plan.amount);
    setPlanCreditLimit(plan.creditLimit);
    setPlanFeaturesText(plan.features ? plan.features.join(', ') : '');
    setPlanIsPopular(!!plan.isPopular);
    setPlanBadge(plan.badge || '');
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!planSlug.trim() || !planName.trim() || !planAmount.trim()) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    const payload = {
      id: planSlug.trim().toLowerCase(),
      planName: planName.trim(),
      amount: planAmount.trim(),
      creditLimit: parseInt(planCreditLimit, 10) || 25,
      features: planFeaturesText.split(',').map(f => f.trim()).filter(Boolean),
      isPopular: !!planIsPopular,
      badge: planBadge.trim()
    };

    try {
      if (editingPlan) {
        const res = await api.put(`/admin/plans/${editingPlan.id}`, payload);
        if (res.data.success) {
          setSuccessMsg(`Pricing plan '${planName}' updated successfully.`);
          fetchPlans();
          setIsPlanModalOpen(false);
        }
      } else {
        const res = await api.post('/admin/plans', payload);
        if (res.data.success) {
          setSuccessMsg(`Pricing plan '${planName}' created successfully.`);
          fetchPlans();
          setIsPlanModalOpen(false);
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to save pricing plan.');
    }
  };

  const handleDeletePlan = async (plan) => {
    const confirmMsg = `Are you sure you want to delete the pricing plan '${plan.planName}'? This action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await api.delete(`/admin/plans/${plan.id}`);
      if (res.data.success) {
        setSuccessMsg(`Pricing plan '${plan.planName}' deleted successfully.`);
        fetchPlans();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to delete pricing plan.');
    }
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

  // Search, Role, and Verification filters for User Directory
  const filteredUsersForDirectory = usersList.filter(u => {
    const nameMatch = u.name?.toLowerCase().includes(userSearch.toLowerCase()) || false;
    const emailMatch = u.email?.toLowerCase().includes(userSearch.toLowerCase()) || false;
    const phoneMatch = u.phone?.toLowerCase().includes(userSearch.toLowerCase()) || false;
    const searchMatch = !userSearch || nameMatch || emailMatch || phoneMatch;

    const roleMatch = roleFilter === 'all' || u.role === roleFilter;
    const verificationMatch = verificationFilter === 'all' || 
      (verificationFilter === 'LINKED' && u.paymentMethod !== null) ||
      (verificationFilter === 'UNLINKED' && u.paymentMethod === null);

    return searchMatch && roleMatch && verificationMatch;
  });

  const filteredUsersForSubscriptions = usersList.filter(u => {
    const isBasicUser = u.role === 'MEMBER' || u.role === 'EDITOR' || u.role === 'user' || u.role === 'MEMBER';
    const nameMatch = u.name?.toLowerCase().includes(userSearch.toLowerCase()) || false;
    const emailMatch = u.email?.toLowerCase().includes(userSearch.toLowerCase()) || false;
    const searchMatch = !userSearch || nameMatch || emailMatch;
    return isBasicUser && searchMatch;
  });

  const filteredScans = scansList.filter(s => 
    s.keyword?.toLowerCase().includes(scanSearch.toLowerCase()) ||
    s.location?.toLowerCase().includes(scanSearch.toLowerCase()) ||
    s.userEmail?.toLowerCase().includes(scanSearch.toLowerCase())
  );

  // Aggregate and filter global activity logs
  const allActivityLogs = usersList.flatMap(u => 
    (u.recentActivity || []).map(act => ({
      ...act,
      userId: u.id,
      userName: u.name,
      userEmail: u.email
    }))
  ).sort((a, b) => {
    try {
      const parseDate = (ts) => {
        const parts = ts.split(', ');
        if (parts.length === 2) {
          const dateParts = parts[0].split('/');
          if (dateParts.length === 3) {
            return new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]} ${parts[1]}`);
          }
        }
        return new Date(ts);
      };
      return parseDate(b.timestamp) - parseDate(a.timestamp);
    } catch (e) {
      return b.id - a.id;
    }
  });

  const filteredActivityLogs = allActivityLogs.filter(log => {
    const searchString = userSearch.toLowerCase();
    const nameMatch = log.userName?.toLowerCase().includes(searchString) || false;
    const emailMatch = log.userEmail?.toLowerCase().includes(searchString) || false;
    const actionMatch = log.action?.toLowerCase().includes(searchString) || false;
    const ipMatch = log.ipAddress?.toLowerCase().includes(searchString) || false;
    const deviceMatch = log.device?.toLowerCase().includes(searchString) || false;
    const matchesSearch = !userSearch || nameMatch || emailMatch || actionMatch || ipMatch || deviceMatch;

    const matchesActionFilter = activityFilter === 'all' || log.action === activityFilter;

    return matchesSearch && matchesActionFilter;
  });

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

          {/* Hiding Platform Scans page for now
          <button 
            className={`nav-item ${activeTab === 'scans' ? 'active' : ''}`}
            onClick={() => setActiveTab('scans')}
          >
            <MapPin size={18} />
            <span>Platform Scans</span>
          </button>
          */}

          <button 
            className={`nav-item ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('activity');
              setActivityPage(1);
            }}
          >
            <Clock size={18} />
            <span>Activity Logs</span>
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
                placeholder="Search users, leads, scans, logs..." 
                value={activeTab === 'users' || activeTab === 'subscriptions' || activeTab === 'activity' ? userSearch : (activeTab === 'scans' ? scanSearch : '')}
                onChange={(e) => {
                  if (activeTab === 'users' || activeTab === 'subscriptions' || activeTab === 'activity') setUserSearch(e.target.value);
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
                              <CustomSelect 
                                value={chartRange} 
                                onChange={setChartRange} 
                                options={[
                                  { value: 'daily', label: 'Last 7 days' },
                                  { value: 'weekly', label: 'Last 4 weeks' },
                                  { value: 'annual', label: 'This year' }
                                ]} 
                              />
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
              {/* TAB 2: USERS LIST (USER DIRECTORY) */}
              {activeTab === 'users' && (() => {
                const itemsPerPage = 10;
                const totalUsersCount = filteredUsersForDirectory.length;
                const totalPages = Math.ceil(totalUsersCount / itemsPerPage) || 1;
                
                // Adjust current page if filters change and make count less
                const activePage = currentPage > totalPages ? totalPages : currentPage;
                
                const startIndex = totalUsersCount === 0 ? 0 : (activePage - 1) * itemsPerPage + 1;
                const endIndex = Math.min(activePage * itemsPerPage, totalUsersCount);
                const paginatedUsers = filteredUsersForDirectory.slice(
                  (activePage - 1) * itemsPerPage,
                  activePage * itemsPerPage
                );

                return (
                  <div className="tab-pane animate-fade-in user-directory-pane">
                    
                    {/* Header Section */}
                    <div className="directory-header-row">
                      <div className="header-title-group">
                        <h2>Users</h2>
                        <p className="subtitle">Manage and track user accounts, billing profiles, and activity logs</p>
                      </div>
                    </div>

                    <div className="table-container">
                      {/* Controls & Filters */}
                      <div className="directory-controls-bar">
                        <div className="search-input-wrapper">
                          <Search size={16} />
                          <input 
                            type="text" 
                            placeholder="Search globally by name, email, or phone..."
                            value={userSearch}
                            onChange={(e) => {
                              setUserSearch(e.target.value);
                              setCurrentPage(1); // Reset page on search
                            }}
                          />
                        </div>

                        <div className="filters-group-row">
                          <div className="filter-dropdown-wrapper">
                            <CustomSelect 
                              value={verificationFilter} 
                              onChange={(val) => {
                                setVerificationFilter(val);
                                setCurrentPage(1);
                              }}
                              options={[
                                { value: 'all', label: 'All Payment States' },
                                { value: 'LINKED', label: 'Card Linked' },
                                { value: 'UNLINKED', label: 'No Card Linked' }
                              ]}
                            />
                          </div>

                          <div className="filter-dropdown-wrapper">
                            <CustomSelect 
                              value={roleFilter} 
                              onChange={(val) => {
                                setRoleFilter(val);
                                setCurrentPage(1);
                              }}
                              options={[
                                { value: 'all', label: 'All Roles' },
                                { value: 'ADMIN', label: 'Admin' },
                                { value: 'EDITOR', label: 'Editor' },
                                { value: 'MEMBER', label: 'Member' }
                              ]}
                            />
                          </div>
                        </div>
                      </div>

                      {/* User Directory Table */}
                      <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table interactive-table">
                          <thead>
                            <tr>
                              <th>User</th>
                              <th>Phone</th>
                              <th>Role</th>
                              <th>Join Date</th>
                              <th>Status</th>
                              <th>Payment Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedUsers.length > 0 ? (
                              paginatedUsers.map(u => (
                                <tr 
                                  key={u.id} 
                                  onClick={() => setSelectedUser(u)} 
                                  className="clickable-row"
                                >
                                  <td>
                                    <div className="user-profile-cell">
                                      <div className="avatar-small">{u.name?.charAt(0).toUpperCase() || 'U'}</div>
                                      <div className="user-info-text">
                                        <span className="name">{u.name}</span>
                                        <span className="email">{u.email}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td>{u.phone}</td>
                                  <td>
                                    <span className={`badge role-${u.role.toLowerCase()}`}>
                                      {u.role}
                                    </span>
                                  </td>
                                  <td>{u.joinDate}</td>
                                  <td>
                                    <span className={`badge status-${u.status.toLowerCase()}`}>
                                      {u.status}
                                    </span>
                                  </td>
                                  <td>
                                    {u.paymentMethod ? (
                                      <span className="badge verification-verified" style={{ fontSize: '0.78rem', textTransform: 'none' }}>
                                        {u.paymentMethod.cardBrand} •••• {u.paymentMethod.last4}
                                      </span>
                                    ) : (
                                      <span className="badge verification-rejected" style={{ fontSize: '0.78rem' }}>
                                        No Card
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="6" className="empty-table">No users found matching the selected filters.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Clean Pagination Controls */}
                      <div className="pagination-bar">
                        <div className="pagination-info">
                          Showing {startIndex} to {endIndex} of {totalUsersCount} users
                        </div>
                        <div className="pagination-buttons">
                          <button 
                            className="pagination-btn"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={activePage === 1}
                          >
                            Previous
                          </button>
                          <span className="page-indicator">
                            Page {activePage} of {totalPages}
                          </span>
                          <button 
                            className="pagination-btn"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={activePage === totalPages}
                          >
                            Next
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })()}
              {/* TAB 3: SUBSCRIPTIONS */}
              {activeTab === 'subscriptions' && (
                <div className="tab-pane animate-fade-in user-directory-pane">
                  <div className="directory-header-row">
                    <div className="header-title-group">
                      <h2>Subscriptions</h2>
                      <p className="subtitle">Manage billing plans, active subscriptions, and pricing models</p>
                    </div>
                  </div>
                  <div className="table-container">
                    <div className="table-header-bar subscription-header-bar">
                      <div className="header-tabs-group">
                        <button 
                          className={`sub-tab-btn ${subTab === 'subscribers' ? 'active' : ''}`}
                          onClick={() => setSubTab('subscribers')}
                        >
                          Active Subscribers ({filteredUsersForSubscriptions.length})
                        </button>
                        <button 
                          className={`sub-tab-btn ${subTab === 'plans' ? 'active' : ''}`}
                          onClick={() => setSubTab('plans')}
                        >
                          Pricing Plans Config ({plansList.length})
                        </button>
                      </div>

                      {subTab === 'subscribers' ? (
                        <div className="search-input-wrapper">
                          <Search size={16} />
                          <input 
                            type="text" 
                            placeholder="Search subscriptions by name or email..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                          />
                        </div>
                      ) : (
                        <button className="add-plan-btn" onClick={handleOpenCreatePlanModal}>
                          + Create Custom Tier
                        </button>
                      )}
                    </div>

                    {subTab === 'subscribers' ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>User Profile</th>
                              <th>Active Plan</th>
                              <th>Monthly Cost</th>
                              <th>Credits Usage</th>
                              <th>Next Renewal</th>
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
                                      <div className="user-info-text">
                                        <span className="name">{u.fullName}</span>
                                        <span className="email">{u.email}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <span className={`badge plan-${(u.plan || 'FREE').toLowerCase()}`}>
                                      {u.plan ? u.plan.replace('_', ' ') : 'FREE'}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="billing-amount-cell">
                                      {u.subscription?.amount || (u.plan === 'STARTER' ? '$29 / mo' : (u.plan === 'AGENCY_PRO' ? '$149 / mo' : '$0'))}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="table-credits-usage">
                                      <div className="usage-numbers">
                                        <strong>{u.creditsUsed || 0}</strong> <span className="muted">/ {u.creditLimit || 25} Credits</span>
                                      </div>
                                      {(() => {
                                        const pct = Math.min(100, Math.max(0, Math.round(((u.creditsUsed || 0) / (u.creditLimit || 25)) * 100)));
                                        return (
                                          <div className="mini-progress-bar-track">
                                            <div 
                                              className={`mini-progress-bar-fill ${pct > 85 ? 'fill-danger' : (pct > 60 ? 'fill-warning' : 'fill-safe')}`} 
                                              style={{ width: `${pct}%` }}
                                            ></div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="renewal-date-cell">
                                      <span className="date-text">{u.resetDate && u.resetDate !== 'N/A' ? u.resetDate : 'N/A'}</span>
                                      <span className="interval-text">Monthly billing</span>
                                    </div>
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
                                <td colSpan="6" className="empty-table">No subscriptions found.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="plans-config-grid">
                        {plansList.map(plan => (
                          <div key={plan.id} className={`plan-config-card plan-theme-${plan.id} ${plan.isPopular ? 'is-popular' : ''}`}>
                            <button className="card-delete-icon-btn" title="Delete Pricing Tier" onClick={() => handleDeletePlan(plan)}>
                              <Trash2 size={15} />
                            </button>
                            {plan.badge && (
                              <span className={`plan-badge-top ${plan.isPopular ? 'popular' : 'best-value'}`}>
                                {(() => {
                                  const badgeLower = plan.badge.toLowerCase();
                                  if (badgeLower.includes('popular')) return <Zap size={12} />;
                                  if (badgeLower.includes('value') || badgeLower.includes('best')) return <Award size={12} />;
                                  if (badgeLower.includes('current')) return <Star size={12} />;
                                  return <Sparkles size={12} />;
                                })()}
                                {plan.badge}
                              </span>
                            )}
                            <div className="plan-card-header">
                              <h4>{plan.planName}</h4>
                              {(() => {
                                const amt = plan.amount || "$0";
                                const parts = amt.split('/');
                                return (
                                  <div className="price-wrapper">
                                    <span className="price-value">{parts[0].trim()}</span>
                                    {parts[1] && <span className="price-interval">/ {parts[1].trim() === 'mo' ? 'month' : parts[1].trim()}</span>}
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="plan-card-body">
                              <div className="plan-credits-limit">
                                <Tag size={13} style={{ marginRight: '6px', flexShrink: 0 }} />
                                {plan.creditLimit?.toLocaleString()} Lead Discovery Credits
                              </div>
                              <ul className="plan-features-list">
                                {plan.features?.map((feat, idx) => (
                                  <li key={idx} className="feature-item">
                                    <CheckCircle size={14} className="feature-check-icon" style={{ flexShrink: 0 }} />
                                    <span className="feature-text">{feat}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="plan-card-actions">
                              <button className="edit-btn" onClick={() => handleOpenEditPlanModal(plan)}>
                                <Edit2 size={13} style={{ marginRight: '6px' }} /> Edit Tier
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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

              {/* TAB 5: ACTIVITY LOGS */}
              {activeTab === 'activity' && (() => {
                const itemsPerPage = 10;
                const totalLogsCount = filteredActivityLogs.length;
                const totalPages = Math.ceil(totalLogsCount / itemsPerPage) || 1;
                const activePage = activityPage > totalPages ? totalPages : activityPage;
                
                const startIndex = totalLogsCount === 0 ? 0 : (activePage - 1) * itemsPerPage + 1;
                const endIndex = Math.min(activePage * itemsPerPage, totalLogsCount);
                const paginatedLogs = filteredActivityLogs.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

                return (
                  <div className="tab-pane animate-fade-in user-directory-pane">
                    <div className="directory-header-row">
                      <div className="header-title-group">
                        <h2>Activity Logs</h2>
                        <p className="subtitle">Monitor system actions, administrative changes, and database operations</p>
                      </div>
                    </div>
                    <div className="table-container">
                      <div className="table-header-bar">
                        <h2>System Activity Logs ({filteredActivityLogs.length})</h2>
                        <div className="activity-controls-bar" style={{ gap: '16px', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div className="control-group">
                            <CustomSelect 
                              value={activityFilter} 
                              onChange={(val) => {
                                setActivityFilter(val);
                                setActivityPage(1);
                              }}
                              options={[
                                { value: 'all', label: 'All Events' },
                                { value: 'Logged In', label: 'Logged In' },
                                { value: 'API Key Created', label: 'API Key Created' },
                                { value: 'Updated Lead Config', label: 'Updated Lead Config' }
                              ]}
                            />
                          </div>
                          <div className="search-input-wrapper">
                            <Search size={16} />
                            <input 
                              type="text" 
                              placeholder="Search logs..."
                              value={userSearch}
                              onChange={(e) => {
                                setUserSearch(e.target.value);
                                setActivityPage(1);
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>User Details</th>
                              <th>Action Event</th>
                              <th>IP Address</th>
                              <th>Device / Browser</th>
                              <th>Timestamp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedLogs.length > 0 ? (
                              paginatedLogs.map((log, idx) => (
                                <tr key={`${log.userId}-${log.id || idx}-${idx}`}>
                                  <td>
                                    <div className="user-profile-cell">
                                      <div className="avatar-small">{log.userName ? log.userName.charAt(0).toUpperCase() : 'U'}</div>
                                      <div className="user-info-text">
                                        <span className="name">{log.userName}</span>
                                        <span className="email" style={{ fontSize: '0.75rem', opacity: 0.6 }}>{log.userEmail}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <span className={`badge ${
                                      log.action === 'Logged In' ? 'success' : 
                                      (log.action === 'API Key Created' ? 'primary' : 'warning')
                                    }`}>
                                      {log.action}
                                    </span>
                                  </td>
                                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{log.ipAddress}</td>
                                  <td style={{ fontSize: '0.85rem', color: '#64748B' }}>{log.device}</td>
                                  <td style={{ fontWeight: '500', fontSize: '0.85rem' }}>{log.timestamp}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="5" className="empty-table">No activity records match the query.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls */}
                      <div className="pagination-bar">
                        <div className="pagination-info">
                          Showing {startIndex} to {endIndex} of {totalLogsCount} events
                        </div>
                        <div className="pagination-buttons">
                          <button 
                            className="pagination-btn"
                            onClick={() => setActivityPage(prev => Math.max(prev - 1, 1))}
                            disabled={activePage === 1}
                          >
                            Previous
                          </button>
                          <span className="page-indicator">
                            Page {activePage} of {totalPages}
                          </span>
                          <button 
                            className="pagination-btn"
                            onClick={() => setActivityPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={activePage === totalPages}
                          >
                            Next
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </main>
      </div>

      {/* CREDIT ADJUSTMENT MODAL */}
      {selectedUserForCredits && (
        <div className="modal-backdrop sub-modal-backdrop" onClick={() => setSelectedUserForCredits(null)}>
          <div className="modal-content sub-modal-content credits-modal animate-slide-in" onClick={(e) => e.stopPropagation()}>
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

      {/* USER DETAIL MODAL */}
      {selectedUser && (
        <div className="modal-backdrop" onClick={() => setSelectedUser(null)}>
          <div className="modal-content admin-user-detail-modal animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="user-header-info">
                <div className="avatar-large">{selectedUser.name?.charAt(0).toUpperCase() || 'U'}</div>
                <div className="user-header-details">
                  <h3>{selectedUser.name}</h3>
                  <p>{selectedUser.email}</p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setSelectedUser(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-split">
              {/* SECTION A: Payment Settings & Billing */}
              <div className="modal-section section-a">
                <h4>Payment Settings & Billing</h4>
                
                {selectedUser.paymentMethod ? (
                  <div className="detail-card payment-method-card">
                    <div className="card-branding-row">
                      <CreditCard size={28} className="card-icon" />
                      <span className="card-brand-name">{selectedUser.paymentMethod.cardBrand}</span>
                    </div>
                    <div className="card-number-display">
                      •••• •••• •••• {selectedUser.paymentMethod.last4}
                    </div>
                    <div className="card-footer-row">
                      <div className="card-meta">
                        <span className="label">Expires</span>
                        <span className="value">{selectedUser.paymentMethod.expiry}</span>
                      </div>
                      <div className="card-meta">
                        <span className="label">Status</span>
                        <span className="badge verification-verified" style={{ padding: '2px 8px', fontSize: '0.65rem' }}>Active</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="no-payment-banner">
                    <AlertTriangle size={24} className="warning-icon" />
                    <div>
                      <h5>No Payment Method</h5>
                      <p>This user has not configured a credit or debit card. Accounts without a linked card are limited to Free scans.</p>
                    </div>
                  </div>
                )}

                <div className="billing-info-box">
                  <h5>Billing Details</h5>
                  <div className="detail-row">
                    <span className="label">Billing Email</span>
                    <span className="value">{selectedUser.paymentMethod?.billingEmail || selectedUser.email}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Billing Frequency</span>
                    <span className="value">Monthly</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Processor</span>
                    <span className="value">Stripe Gateway</span>
                  </div>
                </div>

                <div className="payment-action-buttons">
                  <button 
                    className="toggle-payment-card-btn"
                    onClick={handleTogglePaymentCard}
                  >
                    {selectedUser.paymentMethod ? 'Remove Card Details' : 'Link Mock Card Details'}
                  </button>

                  <button 
                    className="request-billing-update-btn"
                    onClick={() => {
                      setSuccessMsg(`Sent payment update reminder to ${selectedUser.email}.`);
                    }}
                  >
                    Request Payment Update
                  </button>
                </div>

                {/* 4. Relocated Subscription Section */}
                {(() => {
                  const planClass = (selectedUser.subscription?.planName || 'Free').toLowerCase(); // 'pro', 'enterprise', 'free'
                  const creditsLimit = selectedUser.creditLimit || 25;
                  const creditsUsed = selectedUser.creditsUsed || 0;
                  const percentUsed = Math.min(100, Math.max(0, Math.round((creditsUsed / creditsLimit) * 100)));

                  return (
                    <div className="sub-section subscription-premium-section" style={{ marginTop: '20px' }}>
                      <h5>Subscription Plan</h5>
                      <div className={`subscription-plan-card plan-theme-${planClass}`}>
                        <div className="card-header-row">
                          <div className="plan-badge-group">
                            <Sparkles size={16} className="sparkle-icon" />
                            <span className="plan-title-text">{selectedUser.subscription?.planName || 'Free'} Plan</span>
                          </div>
                          <div className="status-pulsar-badge">
                            <span className="pulse-dot"></span>
                            <span className="status-text">Active</span>
                          </div>
                        </div>

                        <div className="pricing-renewal-row">
                          <div className="pricing-item">
                            <span className="card-label">Billing Amount</span>
                            <span className="pricing-value">{selectedUser.subscription?.amount || '$0'}</span>
                          </div>
                          <div className="renewal-item">
                            <span className="card-label">Next Renewal</span>
                            <span className="renewal-value">{selectedUser.subscription?.renewalDate || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Credits Usage Progress Bar */}
                        <div className="usage-progress-container">
                          <div className="usage-labels-row">
                            <span className="card-label">Credits Balance</span>
                            <span className="usage-value-text">{creditsUsed} / {creditsLimit} Used ({percentUsed}%)</span>
                          </div>
                          <div className="progress-bar-track">
                            <div 
                              className={`progress-bar-fill ${percentUsed > 85 ? 'fill-danger' : (percentUsed > 60 ? 'fill-warning' : 'fill-safe')}`} 
                              style={{ width: `${percentUsed}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Action buttons inside the card footer */}
                        <div className="card-actions-row">
                          <button 
                            className="card-action-btn btn-stripe-sync"
                            onClick={() => {
                              setSuccessMsg(`Synchronized Stripe metadata for user ${selectedUser.email}.`);
                            }}
                          >
                            Sync Stripe
                          </button>
                          {planClass === 'free' ? (
                            <button 
                              className="card-action-btn btn-plan-upgrade"
                              onClick={handleUpgradePlan}
                            >
                              Upgrade Plan
                            </button>
                          ) : (
                            <button 
                              className="card-action-btn btn-plan-cancel"
                              onClick={handleCancelPlan}
                            >
                              Cancel Plan
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* SECTION B: Profile, Subscription & Activity */}
              <div className="modal-section section-b">
                <h4>Profile & Account Details</h4>
                
                {/* 2. Personal Details */}
                <div className="sub-section">
                  <h5>Personal Details</h5>
                  <div className="sub-card">
                    <div className="detail-row">
                      <span className="label">Full Name</span>
                      <span className="value">{selectedUser.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Email Address</span>
                      <span className="value">{selectedUser.email}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Phone Number</span>
                      <span className="value">{selectedUser.phone}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Join Date</span>
                      <span className="value">{selectedUser.joinDate}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Company & Platform Details */}
                <div className="sub-section">
                  <h5>Company Details</h5>
                  <div className="sub-card">
                    <div className="detail-row">
                      <span className="label">Company Name</span>
                      <span className="value">{selectedUser.company?.name || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Website</span>
                      <span className="value">
                        {selectedUser.company?.website && selectedUser.company.website !== 'N/A' ? (
                          <a 
                            href={selectedUser.company.website} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="company-link-modal"
                          >
                            {selectedUser.company.website.replace('https://', '').replace('http://', '')}
                          </a>
                        ) : 'N/A'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Industry</span>
                      <span className="value">{selectedUser.company?.industry || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Company Size</span>
                      <span className="value">{selectedUser.company?.size || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION SUB-MODAL */}
      {isRejectModalOpen && (
        <div className="modal-backdrop sub-modal-backdrop">
          <div className="modal-content sub-modal-content animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reason for Rejection</h3>
              <button className="close-btn" onClick={() => setIsRejectModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="sub-modal-tip">Please explain why this user's identity verification document is being rejected. This explanation will be displayed to the user.</p>
              <div className="form-group">
                <textarea
                  id="rejection-reason-textarea"
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="e.g., Document is expired or name does not match the profile..."
                  rows={4}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="cancel-btn" onClick={() => setIsRejectModalOpen(false)}>
                Cancel
              </button>
              <button 
                type="button" 
                className="save-btn btn-reject-confirm"
                onClick={() => {
                  if (!rejectionReasonInput.trim()) {
                    setErrorMsg('Please enter a rejection reason.');
                    return;
                  }
                  updateVerificationStatus(selectedUser.id, 'REJECTED', rejectionReasonInput);
                  setIsRejectModalOpen(false);
                }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ADD/EDIT PLAN MODAL */}
      {isPlanModalOpen && (
        <div className="modal-backdrop sub-modal-backdrop" onClick={() => setIsPlanModalOpen(false)}>
          <div className="modal-content sub-modal-content pricing-plan-modal animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPlan ? 'Edit Pricing Plan Tier' : 'Create Custom Pricing Plan'}</h3>
              <button className="close-btn" onClick={() => setIsPlanModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSavePlan}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="plan-slug-input">Plan Unique ID (Slug)</label>
                  <input
                    type="text"
                    id="plan-slug-input"
                    value={planSlug}
                    onChange={(e) => setPlanSlug(e.target.value)}
                    placeholder="e.g. starter, enterprise, growth"
                    disabled={!!editingPlan}
                    required
                  />
                  <small className="field-hint">Must be a unique lowercase identifier. Cannot be changed later.</small>
                </div>

                <div className="form-group">
                  <label htmlFor="plan-name-input">Plan Display Name</label>
                  <input
                    type="text"
                    id="plan-name-input"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="e.g. Pro, Premium Growth, Enterprise"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="plan-amount-input">Price Details (Display Label)</label>
                  <input
                    type="text"
                    id="plan-amount-input"
                    value={planAmount}
                    onChange={(e) => setPlanAmount(e.target.value)}
                    placeholder="e.g. $29 / mo, Custom Pricing, $299 / year"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="plan-limit-input">Credit Limit Quota</label>
                  <input
                    type="number"
                    id="plan-limit-input"
                    value={planCreditLimit}
                    onChange={(e) => setPlanCreditLimit(e.target.value)}
                    placeholder="e.g. 500, 2500"
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="plan-badge-input">Card Badge Tag Label (Optional)</label>
                  <input
                    type="text"
                    id="plan-badge-input"
                    value={planBadge}
                    onChange={(e) => setPlanBadge(e.target.value)}
                    placeholder="e.g. Popular, Best Value, Super Discount"
                  />
                  <small className="field-hint">Displays a custom badge over the card on the client pricing page.</small>
                </div>

                <div className="form-group checkbox-group">
                  <label htmlFor="plan-is-popular-input" className="checkbox-label">
                    <input
                      type="checkbox"
                      id="plan-is-popular-input"
                      checked={planIsPopular}
                      onChange={(e) => setPlanIsPopular(e.target.checked)}
                      style={{ marginRight: '8px', cursor: 'pointer' }}
                    />
                    Set as Most Popular (Featured Plan)
                  </label>
                </div>

                <div className="form-group">
                  <label htmlFor="plan-features-input">Plan Features (Comma-Separated)</label>
                  <textarea
                    id="plan-features-input"
                    value={planFeaturesText}
                    onChange={(e) => setPlanFeaturesText(e.target.value)}
                    placeholder="e.g. Unlimited scans, CSV Export, Priority Support"
                    rows={4}
                  />
                  <small className="field-hint">Enter features separated by commas.</small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setIsPlanModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  {editingPlan ? 'Save Plan' : 'Create Plan'}
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
