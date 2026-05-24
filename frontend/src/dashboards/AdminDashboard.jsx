import { useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';
import { useTranslation } from 'react-i18next';
import avocatImage from '../assets/avocat.png'; 
import {
  ClipboardList, Building2, Users, HandHeart, Tags, Scale, LogOut, 
  UserRoundCog, BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, CartesianGrid, XAxis, YAxis, LineChart, Line,
} from 'recharts';
import AdminCategoriesPanel from '../pages/AdminCategoriesPanel';

const API_BASE = 'http://localhost:5000';

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [demandes, setDemandes] = useState([]);
  const [associations, setAssociations] = useState([]);
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [donneurs, setDonneurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('demandes');
  const [showCreateAvocat, setShowCreateAvocat] = useState(false);
  const [avocatNom, setAvocatNom] = useState('');
  const [avocatEmail, setAvocatEmail] = useState('');
  const [avocatMessage, setAvocatMessage] = useState('');
  const [searchAssociations, setSearchAssociations] = useState('');
  const [searchBeneficiaires, setSearchBeneficiaires] = useState('');
  const [searchDemandes, setSearchDemandes] = useState('');
  const [searchDonneurs, setSearchDonneurs] = useState('');
  const [expandedDocsId, setExpandedDocsId] = useState(null);
  
  // Users tab
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState('all');
  const [usersSearch, setUsersSearch] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      logout();
      navigate('/login');
      return;
    }
    const fetchData = async () => {
      try {
        const [demandesRes, associationsRes, beneficiairesRes, donneursRes] = await Promise.all([
          axios.get(`${API_BASE}/demandes`, { headers: { Authorization: `Bearer ${user.token}` } }),
          axios.get(`${API_BASE}/admin/associations`, { headers: { Authorization: `Bearer ${user.token}` } }),
          axios.get(`${API_BASE}/admin/beneficiaires`, { headers: { Authorization: `Bearer ${user.token}` } }),
          axios.get(`${API_BASE}/admin/donneurs`, { headers: { Authorization: `Bearer ${user.token}` } }),
        ]);
        setDemandes(demandesRes.data);
        setAssociations(associationsRes.data);
        setBeneficiaires(beneficiairesRes.data);
        setDonneurs(donneursRes.data);
      } catch (err) {
        console.error(err);
        logout();
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, logout, navigate]);

  const getDonorAmount = useCallback((d) => {
    const n = Number(d?.montant_total ?? 0);
    return Number.isFinite(n) ? n : 0;
  }, []);

  const formatMoneyDT = useCallback((n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return '0 DT';
    return `${num.toLocaleString(i18n.language === 'ar' ? 'ar-TN' : 'fr-FR', { maximumFractionDigits: 2 })} DT`;
  }, [i18n.language]);

  const stats = useMemo(() => {
    const pendingDemandes = demandes.filter((d) => (d.statut_admin || 'pending') === 'pending').length;
    const blockedAssociations = associations.filter((a) => !!a.blocked).length;
    const totalMontantDonne = (Array.isArray(donneurs) ? donneurs : []).reduce((acc, d) => acc + getDonorAmount(d), 0);
    return {
      totalDemandes: demandes.length,
      pendingDemandes,
      totalAssociations: associations.length,
      blockedAssociations,
      totalBeneficiaires: beneficiaires.length,
      totalDonneurs: donneurs.length,
      totalMontantDonne,
    };
  }, [demandes, associations, beneficiaires, donneurs, getDonorAmount]);

  const tabMeta = useMemo(() => ({
    analytics: {
      title: t('dashboardAdmin.sidebar_reports'),
      subtitle: t('dashboardAdmin.tab_analytics_sub'),
    },
    demandes: {
      title: t('dashboardAdmin.sidebar_requests'),
      subtitle: t('dashboardAdmin.tab_requests_sub'),
    },
    associations: {
      title: t('dashboardAdmin.sidebar_associations'),
      subtitle: t('dashboardAdmin.tab_assoc_sub'),
    },
    beneficiaires: {
      title: t('dashboardAdmin.sidebar_beneficiaries'),
      subtitle: t('dashboardAdmin.tab_benef_sub'),
    },
    donneurs: {
      title: t('dashboardAdmin.sidebar_donors'),
      subtitle: t('dashboardAdmin.tab_donors_sub'),
    },
    users: {
      title: t('dashboardAdmin.sidebar_users'),
      subtitle: t('dashboardAdmin.tab_users_sub'),
    },
    categories: {
      title: t('dashboardAdmin.sidebar_categories'),
      subtitle: t('dashboardAdmin.tab_categories_sub') || 'Ajoutez / modifiez / supprimez les catégories.',
    },
    avocat: {
      title: t('dashboardAdmin.sidebar_lawyer'),
      subtitle: t('dashboardAdmin.tab_lawyer_sub'),
    },
  }), [t]);

  const currentTitle = tabMeta[activeTab]?.title || 'Dashboard';
  const currentSubtitle = tabMeta[activeTab]?.subtitle || 'Administration';

  // ============================================================================
  // ✅ FONCTION : Vérifier si l'avocat a marqué la demande comme illégale
  // ============================================================================
  const isAvocatIllegal = useCallback((statutAvocat) => {
    const s = (statutAvocat || '').toString().trim().toLowerCase();
    return ['illegal', 'illégal', 'illegale', 'illégale', 'ilegal', 'ilegale'].includes(s);
  }, []);

  const handleChangeStatutDemande = async (id, statut) => {
    const demande = demandes.find((d) => d.id === id);

    // 🔒 Bloquer la validation si l'avocat a mis "illégal"
    if (statut === 'acceptee' && isAvocatIllegal(demande?.statut_avocat)) {
      alert(t('dashboardAdmin.error_illegal_validation') || 
        '⚠️ Impossible de valider : cette demande a été marquée ILLÉGALE par l\'avocat.');
      return;
    }

    const confirmMsg = statut === 'acceptee' ? t('common.confirm_accept') : t('common.confirm_refuse');
    if (!window.confirm(confirmMsg)) return;

    try {
      await axios.put(
        `${API_BASE}/demandes/status/${id}`,
        { statut_admin: statut },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      setDemandes((prev) => prev.map((d) => (d.id === id ? { ...d, statut_admin: statut } : d)));
    } catch {
      alert(t('common.error_update'));
    }
  };
 
  const downloadFile = async (id, field) => {
    try {
      const res = await axios.get(`${API_BASE}/demandes/download/${id}/${field}`, {
        headers: { Authorization: `Bearer ${user.token}` },
        responseType: 'blob',
      });
      const disposition = res.headers['content-disposition'];
      let fileName = field;
      if (disposition && disposition.includes('filename=')) {
        fileName = disposition.split('filename=')[1].replace(/"/g, '').trim();
      }
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(t('common.error_download'));
    }
  };

  const toggleBlockAssociation = async (id, currentStatus) => {
    const action = currentStatus ? t('dashboardAdmin.btn_unblock') : t('dashboardAdmin.btn_block');
    if (!window.confirm(`${t('common.are_you_sure')} ${action} ?`)) return;
    try {
      await axios.put(
        `${API_BASE}/admin/block/${id}`,
        { blocked: !currentStatus },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      setAssociations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, blocked: !currentStatus } : a))
      );
    } catch (err) {
      console.error(err);
      alert(t('common.error_update'));
    }
  };

  const normalize = (s) => (s ?? '').toString().trim().toLowerCase();

  const fetchUsers = useCallback(async () => {
    if (!user?.token) return;
    setUsersLoading(true);
    setUsersError('');
    try {
      const [associationsRes, beneficiairesRes, donneursRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/associations`, { headers: { Authorization: `Bearer ${user.token}` } }),
        axios.get(`${API_BASE}/admin/beneficiaires`, { headers: { Authorization: `Bearer ${user.token}` } }),
        axios.get(`${API_BASE}/admin/donneurs`, { headers: { Authorization: `Bearer ${user.token}` } }),
      ]);
      const associationsList = Array.isArray(associationsRes.data) ? associationsRes.data : [];
      const beneficiairesList = Array.isArray(beneficiairesRes.data) ? beneficiairesRes.data : [];
      const donneursList = Array.isArray(donneursRes.data) ? donneursRes.data : [];
      
      const normalizedAssociations = associationsList.map((a) => ({
        id: a.id,
        nom: a.nom || '',
        prenom: '',
        email: a.email || '',
        role: 'association',
        created_at: a.created_at || a.date_creation || null,
      }));
      const normalizedBeneficiaires = beneficiairesList.map((b) => ({
        id: b.id,
        nom: b.nom || '',
        prenom: b.prenom || '',
        email: b.email || '',
        role: 'beneficiaire',
        created_at: b.created_at || b.date_creation || null,
      }));
      const normalizedDonneurs = donneursList.map((d) => ({
        id: d.id,
        nom: d.nom || '',
        prenom: d.prenom || '',
        email: d.email || '',
        role: 'donneur',
        created_at: d.created_at || d.date_creation || null,
      }));
      
      const combined = [...normalizedAssociations, ...normalizedBeneficiaires, ...normalizedDonneurs];
      combined.sort((x, y) => {
        const dx = x.created_at ? new Date(x.created_at).getTime() : 0;
        const dy = y.created_at ? new Date(y.created_at).getTime() : 0;
        return dy - dx;
      });
      setUsersList(combined);
    } catch (err) {
      console.error('[AdminDashboard] fetchUsers error', err);
      setUsersError(err.response?.data?.message || t('common.error_loading_users'));
      setUsersList([]);
    } finally {
      setUsersLoading(false);
    }
  }, [user?.token, t]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, fetchUsers]);

  const filteredUsers = useMemo(() => {
    const q = normalize(usersSearch);
    return (Array.isArray(usersList) ? usersList : [])
      .filter((u) => {
        if (usersRoleFilter === 'all') return true;
        return normalize(u?.role) === normalize(usersRoleFilter);
      })
      .filter((u) => {
        const name = `${u?.nom || ''} ${u?.prenom || ''}`.trim();
        return normalize(name).includes(q) || normalize(u?.email).includes(q) || normalize(u?.role).includes(q);
      });
  }, [usersList, usersRoleFilter, usersSearch]);

  const ROLE_UI = {
    association: { label: t('dashboardAdmin.role_association'), color: '#7c3aed', css: 'role-association' },
    donneur: { label: t('dashboardAdmin.role_donor'), color: '#16a34a', css: 'role-donneur' },
    beneficiaire: { label: t('dashboardAdmin.role_beneficiary'), color: '#2563eb', css: 'role-beneficiaire' },
  };

  const roleBreakdown = useMemo(() => {
    const associationCount = Array.isArray(associations) ? associations.length : 0;
    const donneurCount = Array.isArray(donneurs) ? donneurs.length : 0;
    const beneficiaireCount = Array.isArray(beneficiaires) ? beneficiaires.length : 0;
    const total = associationCount + donneurCount + beneficiaireCount;
    const rows = [
      { key: 'association', count: associationCount },
      { key: 'donneur', count: donneurCount },
      { key: 'beneficiaire', count: beneficiaireCount },
    ].map((r) => ({
      ...r,
      percentage: total > 0 ? (r.count / total) * 100 : 0,
    }));
    return { total, rows };
  }, [associations, donneurs, beneficiaires, t]);

  const analyticsData = useMemo(() => {
    const countByStatus = (s) => demandes.filter((d) => (d.statut_admin || 'pending') === s).length;
    const pending = countByStatus('pending');
    const acceptee = countByStatus('acceptee');
    const refusee = countByStatus('refusee');
    const blocked = associations.filter((a) => !!a.blocked).length;
    const active = Math.max(0, (Array.isArray(associations) ? associations.length : 0) - blocked);
    
    const statusPie = [
      { name: t('dashboardAdmin.status_pending'), value: pending, color: '#f59e0b' },
      { name: t('dashboardAdmin.status_accepted'), value: acceptee, color: '#16a34a' },
      { name: t('dashboardAdmin.status_refused'), value: refusee, color: '#dc2626' },
    ];
    
    const associationsBar = [
      { name: t('dashboardAdmin.status_active'), value: active, color: '#16a34a' },
      { name: t('dashboardAdmin.status_blocked'), value: blocked, color: '#dc2626' },
    ];
    
    const usersPie = [
      { name: ROLE_UI.association.label, value: associations.length, color: ROLE_UI.association.color },
      { name: ROLE_UI.donneur.label, value: donneurs.length, color: ROLE_UI.donneur.color },
      { name: ROLE_UI.beneficiaire.label, value: beneficiaires.length, color: ROLE_UI.beneficiaire.color },
    ];
    
    const activityLine = [
      { name: t('dashboardAdmin.sidebar_requests'), value: demandes.length },
      { name: t('dashboardAdmin.sidebar_associations'), value: associations.length },
      { name: t('dashboardAdmin.sidebar_donors'), value: donneurs.length },
      { name: t('dashboardAdmin.sidebar_beneficiaries'), value: beneficiaires.length },
    ];
    
    const amountByDonor = (Array.isArray(donneurs) ? donneurs : [])
      .map((d) => ({
        name: (d?.nom || d?.email || `Donneur ${d?.id || ''}`).toString().slice(0, 18),
        value: getDonorAmount(d),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
      
    return { statusPie, associationsBar, usersPie, activityLine, amountByDonor };
  }, [demandes, associations, donneurs, beneficiaires, getDonorAmount, ROLE_UI, t]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const p = payload[0];
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip__title">{label || p.name}</div>
        <div className="chart-tooltip__value">{p.value}</div>
      </div>
    );
  };

  // ✅ FIX : getStatusBadge — gère tous les statuts possibles (admin + avocat)
  const getStatusBadge = (status, type) => {
    const s = (status || '').toString().trim().toLowerCase();
    
    // ── Statuts ADMIN ──
    if (s === 'acceptee' || s === 'accepted' || s === 'accepté') {
      return (
        <div className="status-badge acceptee admin">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
          <span>{t('dashboardAdmin.status_accepted')}</span>
        </div>
      );
    }
    if (s === 'refusee' || s === 'refused' || s === 'rejected' || s === 'refusé') {
      return (
        <div className="status-badge refusee admin">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          <span>{t('dashboardAdmin.status_refused')}</span>
        </div>
      );
    }
    
    // ── Statuts AVOCAT ──
    if (s === 'legal' || s === 'légal' || s === 'legale' || s === 'légale') {
      return (
        <div className="status-badge acceptee avocat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
          <span>Légal</span>
        </div>
      );
    }
    if (['illegal', 'illégal', 'illegale', 'illégale', 'ilegal', 'ilegale'].includes(s)) {
      return (
        <div className="status-badge refusee avocat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          <span>Illégal</span>
        </div>
      );
    }
    
    // ── Fallback : EN ATTENTE ──
    return (
      <div className={`status-badge pending ${type}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
        </svg>
        <span>{t('dashboardAdmin.status_pending')}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-shell">
          <div className="admin-main">
            <div className="admin-loading">{t('common.loading')}...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="admin-shell">
        {/* SIDEBAR */}
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <div className="admin-brand__logo">DA</div>
            <div className="admin-brand__text">
              <div className="admin-brand__title">DON'ACT</div>
              <div className="admin-brand__sub">{t('common.admin_panel')}</div>
            </div>
          </div>
          <nav className="admin-nav admin-nav--icons">
            <button
              className={`admin-nav__item ${activeTab === 'demandes' ? 'is-active' : ''}`}
              onClick={() => { setActiveTab('demandes'); setShowCreateAvocat(false); setExpandedDocsId(null); }}
              type="button"
            >
              <ClipboardList className="nav-ic" />
              <span>{t('dashboardAdmin.sidebar_requests')}</span>
            </button>
            <button
              className={`admin-nav__item ${activeTab === 'associations' ? 'is-active' : ''}`}
              onClick={() => { setActiveTab('associations'); setShowCreateAvocat(false); setExpandedDocsId(null); }}
              type="button"
            >
              <Building2 className="nav-ic" />
              <span>{t('dashboardAdmin.sidebar_associations')}</span>
            </button>
            <button
              className={`admin-nav__item ${activeTab === 'beneficiaires' ? 'is-active' : ''}`}
              onClick={() => { setActiveTab('beneficiaires'); setShowCreateAvocat(false); setExpandedDocsId(null); }}
              type="button"
            >
              <Users className="nav-ic" />
              <span>{t('dashboardAdmin.sidebar_beneficiaries')}</span>
            </button>
            <button
              className={`admin-nav__item ${activeTab === 'donneurs' ? 'is-active' : ''}`}
              onClick={() => { setActiveTab('donneurs'); setShowCreateAvocat(false); setExpandedDocsId(null); }}
              type="button"
            >
              <HandHeart className="nav-ic" />
              <span>{t('dashboardAdmin.sidebar_donors')}</span>
            </button>
            <button
              className={`admin-nav__item ${activeTab === 'users' ? 'is-active' : ''}`}
              onClick={() => { setActiveTab('users'); setShowCreateAvocat(false); setExpandedDocsId(null); }}
              type="button"
            >
              <UserRoundCog className="nav-ic" />
              <span>{t('dashboardAdmin.sidebar_users')}</span>
            </button>
            <button
              className={`admin-nav__item ${activeTab === 'categories' ? 'is-active' : ''}`}
              onClick={() => { setActiveTab('categories'); setShowCreateAvocat(false); setExpandedDocsId(null); }}
              type="button"
            >
              <Tags className="nav-ic" />
              <span>{t('dashboardAdmin.sidebar_categories')}</span>
            </button>
            <button
              className={`admin-nav__item ${activeTab === 'avocat' ? 'is-active' : ''}`}
              onClick={() => { setActiveTab('avocat'); setShowCreateAvocat(true); setExpandedDocsId(null); }}
              type="button"
            >
              <Scale className="nav-ic" />
              <span>{t('dashboardAdmin.sidebar_lawyer')}</span>
            </button>
            <button
              className={`admin-nav__item ${activeTab === 'analytics' ? 'is-active' : ''}`}
              onClick={() => { setActiveTab('analytics'); setShowCreateAvocat(false); setExpandedDocsId(null); }}
              type="button"
            >
              <BarChart3 className="nav-ic" />
              <span>{t('dashboardAdmin.sidebar_reports')}</span>
            </button>
          </nav>
          <div className="admin-sidebar__footer">
            <div className="admin-user">
              <div className="admin-user__avatar">
                {(user?.nom?.[0] || user?.email?.[0] || 'A').toUpperCase()}
              </div>
              <div className="admin-user__meta">
                <div className="admin-user__name">{user?.nom || 'Admin'}</div>
                <div className="admin-user__role">{user?.email}</div>
              </div>
            </div>
            <button
              className="btn btn--danger btn--block btn--withIcon"
              onClick={() => { logout(); navigate('/login'); }}
              type="button"
            >
              <LogOut className="btn-ic" />
              <span>{t('dashboardAdmin.sidebar_logout')}</span>
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="admin-main">
          <section className="admin-card">
            
            {/* ✅ ANALYTICS */}
            {activeTab === 'analytics' && (
              <>
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">{t('dashboardAdmin.tab_analytics_title')}</h2>
                    <p className="admin-card__desc">{t('dashboardAdmin.tab_analytics_sub')}</p>
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="kpi-grid-modern">
                  <div className="kpi-card kpi-blue">
                    <div className="kpi-icon-box">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    </div>
                    <div className="kpi-content">
                      <span className="kpi-label">{t('dashboardAdmin.kpi_total_requests')}</span>
                      <span className="kpi-value">{stats.totalDemandes}</span>
                      <span className="kpi-trend warning">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        {stats.pendingDemandes} {t('dashboardAdmin.kpi_pending')}
                      </span>
                    </div>
                  </div>

                  <div className="kpi-card kpi-purple">
                    <div className="kpi-icon-box">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4 8 4v14M8 21v-4h8v4"/></svg>
                    </div>
                    <div className="kpi-content">
                      <span className="kpi-label">{t('dashboardAdmin.kpi_associations')}</span>
                      <span className="kpi-value">{stats.totalAssociations}</span>
                      <span className={`kpi-trend ${stats.blockedAssociations > 0 ? 'danger' : 'success'}`}>
                         {stats.blockedAssociations} {t('dashboardAdmin.kpi_blocked')}
                      </span>
                    </div>
                  </div>

                  <div className="kpi-card kpi-green">
                    <div className="kpi-icon-box">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </div>
                    <div className="kpi-content">
                      <span className="kpi-label">{t('dashboardAdmin.kpi_collected')}</span>
                      <span className="kpi-value">{formatMoneyDT(stats.totalMontantDonne)}</span>
                      <span className="kpi-trend neutral">{t('dashboardAdmin.kpi_volume')}</span>
                    </div>
                  </div>

                  <div className="kpi-card kpi-indigo">
                    <div className="kpi-icon-box">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <div className="kpi-content">
                      <span className="kpi-label">{t('dashboardAdmin.kpi_active_donors')}</span>
                      <span className="kpi-value">{stats.totalDonneurs}</span>
                      <span className="kpi-trend neutral">{t('dashboardAdmin.kpi_registered')}</span>
                    </div>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="charts-grid-modern">
                  <div className="chart-card-v2">
                    <div className="chart-header-v2">
                      <h3>{t('dashboardAdmin.chart_status_title')}</h3>
                    </div>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie data={analyticsData.statusPie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4} cornerRadius={4}>
                            {analyticsData.statusPie.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="chart-card-v2">
                    <div className="chart-header-v2">
                      <h3>{t('dashboardAdmin.chart_assoc_status_title')}</h3>
                    </div>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={analyticsData.associationsBar}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={60}>
                            {analyticsData.associationsBar.map((entry, index) => (
                              <Cell key={`cellb-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="chart-card-v2">
                    <div className="chart-header-v2">
                      <h3>{t('dashboardAdmin.chart_users_title')}</h3>
                    </div>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie data={analyticsData.usersPie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4} cornerRadius={4}>
                            {analyticsData.usersPie.map((entry, index) => (
                              <Cell key={`cellu-${index}`} fill={entry.color} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="chart-card-v2">
                    <div className="chart-header-v2">
                      <h3>{t('dashboardAdmin.chart_activity_title')}</h3>
                    </div>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={analyticsData.activityLine}>
                          <defs>
                            <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={4} dot={{ r: 4, fill: '#fff', strokeWidth: 2, stroke: '#0ea5e9' }} activeDot={{ r: 6 }} fill="url(#colorActivity)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="chart-card-v2 full-width">
                    <div className="chart-header-v2">
                      <h3>{t('dashboardAdmin.chart_top_donors_title')}</h3>
                    </div>
                    <div className="chart-container tall">
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={analyticsData.amountByDonor} margin={{ top: 20, right: 20, left: 10, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" height={60} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                          <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                          <defs>
                            <linearGradient id="colorDonor" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#0ea5e9" stopOpacity={1}/>
                            </linearGradient>
                          </defs>
                          <Bar dataKey="value" fill="url(#colorDonor)" radius={[6, 6, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ✅ DEMANDES */}
            {activeTab === 'demandes' && (
              <>
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">{t('dashboardAdmin.tab_requests_title')}</h2>
                    <p className="admin-card__desc">{t('dashboardAdmin.tab_requests_sub')}</p>
                  </div>
                  <div className="admin-card__tools">
                    <input
                      className="input"
                      placeholder={t('dashboardAdmin.search_placeholder')}
                      value={searchDemandes}
                      onChange={(e) => setSearchDemandes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="demandes-grid-modern">
                  {[...demandes]
                    .sort((a, b) => {
                      const statusA = a.statut_admin || 'pending';
                      const statusB = b.statut_admin || 'pending';
                      if (statusA === 'pending' && statusB !== 'pending') return -1;
                      if (statusB === 'pending' && statusA !== 'pending') return 1;
                      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                    })
                    .filter(
                      (d) =>
                        (d.nom_association || '').toLowerCase().includes(searchDemandes.toLowerCase()) ||
                        (d.email || '').toLowerCase().includes(searchDemandes.toLowerCase())
                    )
                    .map((d) => {
                      const isExpanded = expandedDocsId === d.id;
                      
                      // ✅ Vérifier si l'avocat a marqué cette demande comme illégale
                      const avocatIllegal = isAvocatIllegal(d.statut_avocat);
                      
                      return (
                        <div key={d.id} className={`demande-card-modern ${isExpanded ? 'is-expanded' : ''}`}>
                          <div className="demande-header-modern">
                            <div className="demande-logo-wrapper">
                              {d.logo ? (
                                <img src={`${API_BASE}/upload/${d.logo}`} alt="Logo" className="demande-logo-img" />
                              ) : (
                                <div className="demande-logo-placeholder">
                                  {(d.nom_association?.[0] || 'A').toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="demande-main-info">
                              <h3 className="demande-assoc-name">{d.nom_association}</h3>
                              <p className="demande-assoc-email">{d.email}</p>
                              <div className="demande-date-mini">
                                {d.created_at ? new Date(d.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-TN' : 'fr-FR') : '-'}
                              </div>
                            </div>
                          </div>

                         <div className="demande-body-modern">
  <div className="status-row">
    {/* 👇 STATUT ADMIN */}
    <div className="status-col">
      <span className="status-label">{t('dashboardAdmin.sidebar_requests')} Admin</span>
      <span 
        className={`status-badge status-admin-${d.statut_admin}`}
        style={{ 
          backgroundColor: d.statut_admin === 'acceptee' ? '#10b981' : 
                           d.statut_admin === 'rejete' ? '#ef4444' : '#f59e0b',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '0.8rem',
          fontWeight: '500',
          textTransform: 'capitalize'
        }}
      >
        {d.statut_admin === 'acceptee' ? 'Acceptée' : 
         d.statut_admin === 'rejete' ? 'Refusée' : 'En attente'}
      </span>
    </div>
    
    <div className="status-divider"></div>
    
    {/* 👇 STATUT AVOCAT (inchangé) */}
    <div className="status-col">
      <span className="status-label">{t('dashboardAdmin.sidebar_lawyer')}</span>
      {getStatusBadge(d.statut_avocat, 'avocat')}
    </div>
  </div>
</div>

                          <div className="demande-footer-modern">
                            <button
                              className={`btn-toggle-docs ${isExpanded ? 'active' : ''}`}
                              onClick={() => setExpandedDocsId((prev) => (prev === d.id ? null : d.id))}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                              <span>{isExpanded ? t('dashboardAdmin.btn_hide_docs') : t('dashboardAdmin.btn_view_docs')}</span>
                            </button>

                           <div className="action-buttons-group">
  {/* Bouton Refuser */}
  <button
    className="btn-action refuse"
    onClick={() => handleChangeStatutDemande(d.id, 'rejete')}  // 👈 'rejete' et non 'refusee'
    title={t('dashboardAdmin.btn_refuse')}
    disabled={d.statut_admin === 'rejete' || d.statut_admin === 'acceptee'}  // 👈 Désactiver si déjà traité
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  </button>
  
  {/* ✅ Bouton Valider */}
  <button
    className={`btn-action accept${avocatIllegal ? ' disabled-illegal' : ''}`}
    onClick={() => !avocatIllegal && handleChangeStatutDemande(d.id, 'acceptee')}
    title={avocatIllegal 
      ? (t('dashboardAdmin.tooltip_illegal_blocked') || 'Bloqué : demande marquée illégale par l\'avocat')
      : t('dashboardAdmin.btn_validate')}
    disabled={avocatIllegal || d.statut_admin === 'acceptee' || d.statut_admin === 'rejete'}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>{t('dashboardAdmin.btn_validate')}</span>
  </button>
</div>
                          </div>

                          {isExpanded && (
                            <div className="docs-panel-modern">
                              <div className="docs-grid">
                                <button className="doc-item" onClick={() => downloadFile(d.id, 'doc_statut')}>
                                  <div className="doc-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
                                  <span>{t('dashboardAdmin.doc_statut')}</span>
                                </button>
                                <button className="doc-item" onClick={() => downloadFile(d.id, 'doc_autorisation')}>
                                  <div className="doc-icon purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                                  <span>{t('dashboardAdmin.doc_autorisation')}</span>
                                </button>
                                <button className="doc-item" onClick={() => downloadFile(d.id, 'doc_registre')}>
                                  <div className="doc-icon orange"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
                                  <span>{t('dashboardAdmin.doc_registre')}</span>
                                </button>
                                <button className="doc-item" onClick={() => downloadFile(d.id, 'doc_cin')}>
                                  <div className="doc-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>
                                  <span>{t('dashboardAdmin.doc_cin')}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </>
            )}

            {/* ✅ USERS TAB */}
            {activeTab === 'users' && (
              <>
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">{t('dashboardAdmin.tab_users_title')}</h2>
                    <p className="admin-card__desc">{t('dashboardAdmin.tab_users_sub')}</p>
                  </div>
                  <div className="admin-card__tools admin-users-tools">
                    <select
                      className="input admin-users-select"
                      value={usersRoleFilter}
                      onChange={(e) => setUsersRoleFilter(e.target.value)}
                    >
                      <option value="all">{t('dashboardAdmin.filter_all_roles')}</option>
                      <option value="association">{t('dashboardAdmin.role_association')}</option>
                      <option value="donneur">{t('dashboardAdmin.role_donor')}</option>
                      <option value="beneficiaire">{t('dashboardAdmin.role_beneficiary')}</option>
                    </select>
                    <input
                      className="input"
                      placeholder={t('dashboardAdmin.search_placeholder')}
                      value={usersSearch}
                      onChange={(e) => setUsersSearch(e.target.value)}
                    />
                  </div>
                </div>

                <section className="admin-breakdown admin-breakdown--insideUsers">
                  <div className="breakdown-header">
                    <h3 className="admin-breakdown__title">{t('dashboardAdmin.breakdown_title')}</h3>
                    <span className="total-count">{roleBreakdown.total} {t('dashboardAdmin.total_users')}</span>
                  </div>
                  <div className="admin-breakdown__rows">
                    {roleBreakdown.rows.map((r) => {
                      const ui = ROLE_UI[r.key];
                      return (
                        <div key={r.key} className="admin-breakdown__row">
                          <div className="admin-breakdown__rowHead">
                            <div className="role-indicator" style={{ backgroundColor: ui.color }}></div>
                            <span className="admin-breakdown__label">{ui.label}</span>
                            <span className="admin-breakdown__count">
                              {r.count} <span className="percentage">({r.percentage.toFixed(0)}%)</span>
                            </span>
                          </div>
                          <div className="admin-breakdown__bar">
                            <div
                              className={`admin-breakdown__barFill`}
                              style={{ 
                                width: `${Math.max(0, Math.min(100, r.percentage))}%`,
                                backgroundColor: ui.color 
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {usersError && <div className="admin-users-error">{usersError}</div>}
                {!usersLoading && !usersError && filteredUsers.length === 0 && (
                  <div className="empty-state-users">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <p>{t('dashboardAdmin.no_users_found')}</p>
                  </div>
                )}

                {filteredUsers.length > 0 && (
                  <div className="users-grid-modern">
                    {filteredUsers.map((u) => {
                      const name = `${u?.nom || ''} ${u?.prenom || ''}`.trim() || 'Utilisateur';
                      const roleKey = u?.role || 'default';
                      const uiConfig = ROLE_UI[roleKey] || { label: 'Inconnu', color: '#94a3b8' };
                      
                      const RoleIcon = () => {
                        if (roleKey === 'association') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4 8 4v14M8 21v-4h8v4"/></svg>;
                        if (roleKey === 'donneur') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
                        if (roleKey === 'beneficiaire') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
                        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
                      };

                      return (
                        <div key={`${roleKey}-${u?.id || u?.email}`} className={`user-card-v2 user-role-${roleKey}`}>
                          <div className="user-card-accent" style={{ backgroundColor: uiConfig.color }}></div>
                          <div className="user-card-content">
                            <div className="user-header-v2">
                              <div className="user-avatar-v2" style={{ borderColor: uiConfig.color }}>
                                {(name?.[0] || 'U').toUpperCase()}
                              </div>
                              <div className="user-role-icon" style={{ color: uiConfig.color }}>
                                <RoleIcon />
                              </div>
                            </div>
                            <div className="user-info-v2">
                              <h3 className="user-name-v2">{name}</h3>
                              <p className="user-email-v2">{u?.email || '—'}</p>
                            </div>
                            <div className="user-role-pill" style={{ backgroundColor: `${uiConfig.color}15`, color: uiConfig.color }}>
                              {uiConfig.label}
                            </div>
                            <div className="user-footer-v2">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                              <span>{t('dashboardAdmin.member_since')} {u?.created_at ? new Date(u.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-TN' : 'fr-FR', { month: 'short', year: 'numeric' }) : '-'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ASSOCIATIONS */}
            {activeTab === 'associations' && (
              <>
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">{t('dashboardAdmin.tab_assoc_title')}</h2>
                    <p className="admin-card__desc">{t('dashboardAdmin.tab_assoc_sub')}</p>
                  </div>
                  <div className="admin-card__tools">
                    <input
                      className="input"
                      placeholder={t('dashboardAdmin.search_placeholder')}
                      value={searchAssociations}
                      onChange={(e) => setSearchAssociations(e.target.value)}
                    />
                  </div>
                </div>

                <div className="assoc-grid-modern">
                  {associations
                    .filter(
                      (a) =>
                        (a.nom || '').toLowerCase().includes(searchAssociations.toLowerCase()) ||
                        (a.email || '').toLowerCase().includes(searchAssociations.toLowerCase()) ||
                        (a.telephone || '').includes(searchAssociations)
                    )
                    .map((a) => {
                      const isBlocked = !!a.blocked;
                      return (
                        <div key={a.id} className={`assoc-card-v2 ${isBlocked ? 'is-blocked' : ''}`}>
                          <div className="assoc-header-v2">
                            <div className="assoc-logo-container">
                              {a.logo ? (
                                <img src={`${API_BASE}/upload/${a.logo}`} alt="Logo" className="assoc-logo-img" />
                              ) : (
                                <div className="assoc-logo-placeholder">
                                  {(a.nom?.[0] || 'A').toUpperCase()}
                                </div>
                              )}
                              <div className={`status-indicator ${isBlocked ? 'blocked' : 'active'}`}></div>
                            </div>
                            <div className="assoc-status-badge">
                              {isBlocked ? (
                                <span className="badge-text blocked">{t('dashboardAdmin.status_blocked')}</span>
                              ) : (
                                <span className="badge-text active">{t('dashboardAdmin.status_active')}</span>
                              )}
                            </div>
                          </div>

                          <div className="assoc-body-v2">
                            <h3 className="assoc-name-v2">{a.nom}</h3>
                            <div className="assoc-details-list">
                              <div className="detail-item">
                                <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                <span className="detail-text">{a.email || '-'}</span>
                              </div>
                              {a.telephone && (
                                <div className="detail-item">
                                  <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                  <span className="detail-text">{a.telephone}</span>
                                </div>
                              )}
                              {a.adresse && (
                                <div className="detail-item">
                                  <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                  <span className="detail-text truncate">{a.adresse}</span>
                                </div>
                              )}
                            </div>
                            {a.description && (
                              <p className="assoc-desc-v2">{a.description}</p>
                            )}
                          </div>

                          <div className="assoc-footer-v2">
                            <div className="assoc-date">
                               {t('dashboardAdmin.registered_on')} {a.created_at ? new Date(a.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-TN' : 'fr-FR', { month: 'short', year: 'numeric' }) : '-'}
                            </div>
                            <button
                              className={`btn-toggle-block ${isBlocked ? 'unblock' : 'block'}`}
                              onClick={() => toggleBlockAssociation(a.id, a.blocked)}
                            >
                              {isBlocked ? (
                                <>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                  {t('dashboardAdmin.btn_unblock')}
                                </>
                              ) : (
                                <>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                                  {t('dashboardAdmin.btn_block')}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            )}

            {/* DONNEURS */}
            {activeTab === 'donneurs' && (
              <>
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">{t('dashboardAdmin.tab_donors_title')}</h2>
                    <p className="admin-card__desc">{t('dashboardAdmin.tab_donors_sub')}</p>
                  </div>
                  <div className="admin-card__tools">
                    <input
                      className="input"
                      placeholder={t('dashboardAdmin.search_placeholder')}
                      value={searchDonneurs}
                      onChange={(e) => setSearchDonneurs(e.target.value)}
                    />
                  </div>
                </div>
                <div className="donors-grid">
                  {donneurs
                    .filter(
                      (d) =>
                        (d.nom || '').toLowerCase().includes(searchDonneurs.toLowerCase()) ||
                        (d.email || '').toLowerCase().includes(searchDonneurs.toLowerCase()),
                    )
                    .map((d) => {
                      const amount = getDonorAmount(d);
                      return (
                        <div key={d.id} className="donor-card-modern">
                          <div className="donor-card__top">
                            <div className="donor-avatar-modern">
                              {(d.nom?.[0] || 'D').toUpperCase()}
                            </div>
                            <div className="donor-identity">
                              <h3 className="donor-name">{d.nom}</h3>
                              <p className="donor-email">{d.email}</p>
                            </div>
                          </div>
                          <div className="donor-card__highlight">
                            <div className="donor-amount-box">
                              <div className="donor-amount-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="1" x2="12" y2="23"></line>
                                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                </svg>
                              </div>
                              <div className="donor-amount-content">
                                <span className="donor-amount-label">{t('dashboardAdmin.total_given')}</span>
                                <span className="donor-amount-value">{formatMoneyDT(amount)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="donor-card__bottom">
                            <div className="donor-date">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                              </svg>
                              <span>{t('dashboardAdmin.member_since')} {d.date_creation ? new Date(d.date_creation).toLocaleDateString(i18n.language === 'ar' ? 'ar-TN' : 'fr-FR', { month: 'short', year: 'numeric' }) : '-'}</span>
                            </div>
                            <span className="donor-badge-status">{t('dashboardAdmin.status_active')}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            )}

            {/* BENEFICIAIRES */}
            {activeTab === 'beneficiaires' && (
              <>
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">{t('dashboardAdmin.tab_benef_title')}</h2>
                    <p className="admin-card__desc">{t('dashboardAdmin.tab_benef_sub')}</p>
                  </div>
                  <div className="admin-card__tools">
                    <input
                      className="input"
                      placeholder={t('dashboardAdmin.search_placeholder')}
                      value={searchBeneficiaires}
                      onChange={(e) => setSearchBeneficiaires(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="benef-grid-container">
                  {beneficiaires
                    .filter(
                      (b) =>
                        (b.nom || '').toLowerCase().includes(searchBeneficiaires.toLowerCase()) ||
                        (b.prenom || '').toLowerCase().includes(searchBeneficiaires.toLowerCase()) ||
                        (b.cin || '').includes(searchBeneficiaires)
                    )
                    .map((b) => (
                      <div key={b.id} className="benef-card-v2">
                        <div className="benef-header-v2">
                          <div className="benef-avatar-v2">
                            {(b.nom?.[0] || 'B').toUpperCase()}
                            <div className="benef-status-dot"></div>
                          </div>
                          <div className="benef-info-v2">
                            <h3 className="benef-fullname">{b.nom} {b.prenom}</h3>
                            <div className="benef-cin-pill">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                              {b.cin || 'N/A'}
                            </div>
                          </div>
                        </div>

                        <div className="benef-body-v2">
                          <div className="benef-info-grid">
                            <div className="benef-info-item">
                              <div className="icon-box blue-light">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                              </div>
                              <div className="info-content">
                                <span className="info-label">{t('dashboardAdmin.phone')}</span>
                                <span className="info-val">{b.telephone || '-'}</span>
                              </div>
                            </div>

                            <div className="benef-info-item">
                              <div className="icon-box purple-light">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                              </div>
                              <div className="info-content">
                                <span className="info-label">{t('dashboardAdmin.address')}</span>
                                <span className="info-val truncate">{b.adresse || '-'}</span>
                              </div>
                            </div>

                            <div className="benef-info-item">
                              <div className="icon-box green-light">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                              </div>
                              <div className="info-content">
                                <span className="info-label">{t('dashboardAdmin.birth_date')}</span>
                                <span className="info-val">{b.date_naissance ? new Date(b.date_naissance).toLocaleDateString(i18n.language === 'ar' ? 'ar-TN' : 'fr-FR') : '-'}</span>
                              </div>
                            </div>

                             <div className="benef-info-item">
                              <div className="icon-box orange-light">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                              </div>
                              <div className="info-content">
                                <span className="info-label">{t('dashboardAdmin.situation')}</span>
                                <span className="info-val">{b.situation_familiale || '-'}</span>
                              </div>
                            </div>
                          </div>

                          {b.description && (
                            <div className="benef-note-v2">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                              <p>{b.description}</p>
                            </div>
                          )}
                        </div>

                        <div className="benef-footer-v2">
                          <div className="finance-row-v2">
                            <div className="fin-col">
                              <span className="fin-lbl">{t('dashboardAdmin.target')}</span>
                              <span className="fin-amt primary">{b.montant_a_collecter ? `${b.montant_a_collecter} DT` : '0 DT'}</span>
                            </div>
                            <div className="fin-divider"></div>
                            <div className="fin-col">
                              <span className="fin-lbl">{t('dashboardAdmin.remaining')}</span>
                              <span className="fin-amt danger">{b.montant_restant ? `${b.montant_restant} DT` : '0 DT'}</span>
                            </div>
                          </div>
                          
                          <div className="assoc-link-v2">
                            <span className="assoc-label">{t('dashboardAdmin.associated_with')}</span>
                            <span className="assoc-name">{b.association_nom || t('dashboardAdmin.no_association')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}

            {/* CATEGORIES */}
            {activeTab === 'categories' && <AdminCategoriesPanel token={user.token} />}

            {/* CREER AVOCAT */}
            {showCreateAvocat && activeTab === 'avocat' && (
              <div className="avocat-create-card" role="region" aria-label={t('dashboardAdmin.tab_lawyer_title')}>
                <div className="avocat-header">
                  <img src={avocatImage} alt="Illustration Avocat" className="avocat-header-img" />
                  <h2 className="avocat-title">{t('dashboardAdmin.tab_lawyer_title')}</h2>
                  <p className="avocat-desc">{t('dashboardAdmin.tab_lawyer_sub')}</p>
                </div>
                
                <form
                  className="avocat-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setAvocatMessage('');
                    
                    if (!avocatNom.trim() || !avocatEmail.trim()) {
                      setAvocatMessage(t('dashboardAdmin.lawyer_error_fill'));
                      return;
                    }
                    
                    try {
                      await axios.post(
                        `${API_BASE}/admin/create-avocat`,
                        { 
                          nom: avocatNom.trim(), 
                          email: avocatEmail.trim().toLowerCase() 
                        },
                        { headers: { Authorization: `Bearer ${user.token}` } },
                      );
                      
                      setAvocatMessage(t('dashboardAdmin.lawyer_success'));
                      setAvocatNom('');
                      setAvocatEmail('');
                      setTimeout(() => setAvocatMessage(''), 5000);
                      
                    } catch (err) {
                      const errorMsg = err.response?.data?.message || err.message || t('common.error_server');
                      setAvocatMessage(`❌ ${errorMsg}`);
                    }
                  }}
                  noValidate
                >
                  <div className="avocat-form-row">
                    <label className="avocat-label" htmlFor="avocat-nom">
                      <span className="label-icon" aria-hidden="true"></span>
                      {t('dashboardAdmin.lawyer_name_label')}
                    </label>
                    <input
                      id="avocat-nom"
                      name="nom"
                      className="avocat-input"
                      type="text"
                      placeholder="Ex: Martin Dupont"
                      value={avocatNom}
                      onChange={e => setAvocatNom(e.target.value)}
                      required
                      maxLength={100}
                      pattern="^[A-Za-zÀ-ÿ\s'-]{2,100}$"
                      autoComplete="name"
                    />
                    {avocatNom && avocatNom.length < 2 && (
                      <span className="avocat-hint error">{t('dashboardAdmin.lawyer_error_name_short')}</span>
                    )}
                  </div>
                  
                  <div className="avocat-form-row">
                    <label className="avocat-label" htmlFor="avocat-email">
                      <span className="label-icon" aria-hidden="true"></span>
                      {t('dashboardAdmin.lawyer_email_label')}
                    </label>
                    <input
                      id="avocat-email"
                      name="email"
                      className="avocat-input"
                      type="email"
                      placeholder="avocat@cabinet.tn"
                      value={avocatEmail}
                      onChange={e => setAvocatEmail(e.target.value)}
                      required
                      maxLength={100}
                      autoComplete="email"
                    />
                    {avocatEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(avocatEmail) && (
                      <span className="avocat-hint error">{t('dashboardAdmin.lawyer_error_email_invalid')}</span>
                    )}
                  </div>
                  
                  <div className="avocat-actions">
                    <button 
                      type="submit" 
                      className="avocat-btn"
                      disabled={!avocatNom.trim() || !avocatEmail.trim() || avocatNom.length < 2}
                    >
                      <span className="btn-icon" aria-hidden="true"></span>
                      <span className="btn-text">{t('dashboardAdmin.lawyer_btn_create')}</span>
                    </button>
                  </div>
                  
                  {avocatMessage && (
                    <div 
                      className={`avocat-alert ${avocatMessage.includes('✅') ? 'success' : 'error'}`}
                      role="alert"
                      aria-live="polite"
                    >
                      {avocatMessage}
                    </div>
                  )}
                  
                  <p className="avocat-note">
                    {t('dashboardAdmin.lawyer_note')}
                  </p>
                </form>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;