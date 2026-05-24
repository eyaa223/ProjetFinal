import { useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AvocatDashboard.css';
import { useTranslation } from 'react-i18next'; // Import du hook

import { FileText, LogOut, CheckCircle, XCircle, Search, FolderOpen, Lock, Mail, ChevronDown, ChevronUp } from 'lucide-react';

const API = 'http://localhost:5000';

const AssociationLogo = ({ name, logoUrl, apiBase = '', className = '' }) => {
  const rawLogo = logoUrl || null;
  let fullUrl = null;
  if (rawLogo && typeof rawLogo === 'string') {
    if (rawLogo.startsWith('http')) {
      fullUrl = rawLogo;
    } else {
      const cleanPath = rawLogo.replace(/^\/+/, '');
      fullUrl = `${apiBase}/upload/${cleanPath}`;
    }
  }
  return (
    <div className={`logo-wrapper ${className}`}>
      {fullUrl && (
        <img
          src={fullUrl}
          alt={`Logo ${name}`}
          className="logo-img"
          onError={(e) => {
            e.target.style.display = 'none';
            const fallback = e.target.nextElementSibling;
            if (fallback?.classList.contains('logo-fallback')) fallback.classList.remove('is-hidden');
          }}
        />
      )}
      <div className={`logo-fallback ${fullUrl ? 'is-hidden' : ''}`}>
        {name?.charAt(0)?.toUpperCase() || '?'}
      </div>
    </div>
  );
};

const AvocatDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(); // Hook de traduction

  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchDemandes, setSearchDemandes] = useState('');
  const [activeTab, setActiveTab] = useState('demandes');
  const [activeFilterTab, setActiveFilterTab] = useState('pending');
  const [expandedDocsId, setExpandedDocsId] = useState(null);

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  const authHeader = useMemo(() => {
    if (!user?.token) return {};
    return { Authorization: `Bearer ${user.token}` };
  }, [user?.token]);

  const normalize = useCallback((s) => (s ?? '').toString().trim().toLowerCase(), []);

  const isPendingValue = useCallback((s) => {
    const v = normalize(s);
    return v === '' || v === 'pending' || v === 'en attente' || v === 'attente' || v === 'en_attente';
  }, [normalize]);

  const fetchDemandes = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/demandes`, { headers: authHeader });
      setDemandes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('❌ Erreur fetchDemandes:', err);
      logout();
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [authHeader, logout, navigate, user?.token]);

  useEffect(() => {
    if (!user || user.role !== 'avocat') { logout(); navigate('/login'); return; }
    fetchDemandes();
  }, [user, logout, navigate, fetchDemandes]);

  const changePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError(t('dashboardLawyer.pwd_error_required')); return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError(t('dashboardLawyer.pwd_error_mismatch')); return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordError(t('dashboardLawyer.pwd_error_length')); return;
    }
    if (passwordData.oldPassword === passwordData.newPassword) {
      setPasswordError(t('dashboardLawyer.pwd_error_same')); return;
    }
    try {
      setPasswordLoading(true);
      const res = await axios.put(`${API}/admin/utilisateurs/me/password`,
        { oldPassword: passwordData.oldPassword, newPassword: passwordData.newPassword },
        { headers: authHeader }
      );
      setPasswordSuccess(res.data.message || t('dashboardLawyer.pwd_success'));
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err) {
      setPasswordError(err.response?.data?.message || t('common.error_server'));
    } finally {
      setPasswordLoading(false);
    }
  };

  const stats = useMemo(() => {
    const pending = demandes.filter((d) => isPendingValue(d.statut_avocat)).length;
    const legale = demandes.filter((d) => normalize(d.statut_avocat) === 'legale').length;
    const illegale = demandes.filter((d) => normalize(d.statut_avocat) === 'illegale').length;
    return { total: demandes.length, pending, legale, illegale };
  }, [demandes, isPendingValue, normalize]);

  const displayStatutAvocat = useCallback((s) => {
    const v = normalize(s);
    if (isPendingValue(v)) return t('dashboardLawyer.filter_pending');
    if (v === 'legale') return t('dashboardLawyer.filter_legal');
    if (v === 'illegale') return t('dashboardLawyer.filter_illegal');
    return s || t('dashboardLawyer.filter_pending');
  }, [isPendingValue, normalize, t]);

  const badgeClass = useCallback((displayValue) => {
    const v = normalize(displayValue);
    // Note: displayValue est déjà traduit ici si on utilise displayStatutAvocat, 
    // donc on compare avec les clés ou les valeurs originales selon la logique.
    // Pour simplifier, on vérifie la valeur originale 's' dans la carte.
    // Ici, on adapte pour que le CSS fonctionne avec les classes standards.
    if (v.includes('legale') || v === 'legale') return 'badge badge--success';
    if (v.includes('illegale') || v === 'illegale') return 'badge badge--danger';
    return 'badge badge--neutral';
  }, [normalize]);

  const handleChangeStatut = async (id, statut) => {
    const confirmMsg = t('common.confirm_action').replace('{action}', statut); // Ou message spécifique
    if (!window.confirm(`${t('common.are_you_sure')} "${statut}" ?`)) return;
    try {
      await axios.put(`${API}/demandes/status/${id}`, { statut_avocat: statut }, { headers: authHeader });
      setDemandes((prev) => prev.map((d) => (d.id === id ? { ...d, statut_avocat: statut } : d)));
    } catch (err) {
      console.error(err);
      alert(t('common.error_update'));
    }
  };

  const downloadFile = async (id, field) => {
    try {
      const res = await axios.get(`${API}/demandes/download/${id}/${field}`, {
        headers: authHeader, responseType: 'blob',
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

  const filteredDemandes = useMemo(() => {
    const q = normalize(searchDemandes);
    const bySearch = (d) => normalize(d.nom_association).includes(q) || normalize(d.email).includes(q);
    const byTab = (d) => {
      const s = normalize(d.statut_avocat);
      if (activeFilterTab === 'all') return true;
      if (activeFilterTab === 'pending') return isPendingValue(s);
      if (activeFilterTab === 'legale') return s === 'legale';
      if (activeFilterTab === 'illegale') return s === 'illegale';
      return true;
    };
    return demandes.filter((d) => byTab(d) && bySearch(d));
  }, [activeFilterTab, demandes, isPendingValue, normalize, searchDemandes]);

  const tabCounts = useMemo(() => {
    const pending = demandes.filter((d) => isPendingValue(d.statut_avocat)).length;
    const legale = demandes.filter((d) => normalize(d.statut_avocat) === 'legale').length;
    const illegale = demandes.filter((d) => normalize(d.statut_avocat) === 'illegale').length;
    return { pending, legale, illegale, all: demandes.length };
  }, [demandes, isPendingValue, normalize]);

  if (loading && activeTab === 'demandes') {
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
              <div className="admin-brand__sub">{t('common.lawyer_panel')}</div>
            </div>
          </div>
          <nav className="admin-nav admin-nav--icons">
            <button className={`admin-nav__item ${activeTab === 'demandes' ? 'is-active' : ''}`} type="button" onClick={() => setActiveTab('demandes')}>
              <FileText className="nav-ic" /><span>{t('dashboardLawyer.sidebar_requests')}</span>
            </button>
            <button className={`admin-nav__item ${activeTab === 'password' ? 'is-active' : ''}`} type="button" onClick={() => setActiveTab('password')}>
              <Lock className="nav-ic" /><span>{t('dashboardLawyer.sidebar_security')}</span>
            </button>
          </nav>
          <div className="admin-sidebar__footer">
            <div className="admin-user">
              <div className="admin-user__avatar">{(user?.nom?.[0] || user?.email?.[0] || 'A').toUpperCase()}</div>
              <div className="admin-user__meta">
                <div className="admin-user__name">{user?.nom || t('common.lawyer')}</div>
                <div className="admin-user__role">{user?.email}</div>
              </div>
            </div>
            <button className="btn btn--danger btn--block btn--withIcon" type="button" onClick={() => { logout(); navigate('/login'); }}>
              <LogOut className="btn-ic" /><span>{t('dashboardLawyer.sidebar_logout')}</span>
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="admin-main">

          {/* ===== DEMANDES ===== */}
          {activeTab === 'demandes' && (
            <>
              <div className="admin-topbar">
                <h1 className="admin-title">{t('dashboardLawyer.tab_requests_title')}</h1>
                <p className="admin-subtitle">{t('dashboardLawyer.tab_requests_sub')}</p>
              </div>

              {/* Stats */}
              <section className="av-stats">
                {[
                  { label: t('dashboardLawyer.stat_pending'), value: stats.pending, hint: t('dashboardLawyer.stat_pending_hint'), icon: <FileText size={18} />, mod: '' },
                  { label: t('dashboardLawyer.stat_legal'), value: stats.legale, hint: t('dashboardLawyer.stat_legal_hint'), icon: <CheckCircle size={18} />, mod: 'ok' },
                  { label: t('dashboardLawyer.stat_illegal'), value: stats.illegale, hint: t('dashboardLawyer.stat_illegal_hint'), icon: <XCircle size={18} />, mod: 'ko' },
                  { label: t('dashboardLawyer.stat_total'), value: stats.total, hint: t('dashboardLawyer.stat_total_hint'), icon: <FolderOpen size={18} />, mod: '' },
                ].map(({ label, value, hint, icon, mod }) => (
                  <div key={label} className={`av-statCard ${mod ? `av-statCard--${mod}` : ''}`}>
                    <div className="av-statTop">
                      <span className="av-statLabel">{label}</span>
                      <span className={`av-statIc ${mod ? `av-statIc--${mod}` : ''}`}>{icon}</span>
                    </div>
                    <div className="av-statValue">{value}</div>
                    <div className="av-statHint">{hint}</div>
                  </div>
                ))}
              </section>

              {/* Toolbar */}
              <div className="av-toolbar">
                <div className="av-tabs">
                  {[
                    { key: 'pending', label: t('dashboardLawyer.filter_pending'), count: tabCounts.pending },
                    { key: 'legale', label: t('dashboardLawyer.filter_legal'), count: tabCounts.legale },
                    { key: 'illegale', label: t('dashboardLawyer.filter_illegal'), count: tabCounts.illegale },
                    { key: 'all', label: t('dashboardLawyer.filter_all'), count: tabCounts.all },
                  ].map(({ key, label, count }) => (
                    <button key={key} type="button" className={`av-tab ${activeFilterTab === key ? 'is-active' : ''}`} onClick={() => setActiveFilterTab(key)}>
                      {label} <span className="av-tab__count">{count}</span>
                    </button>
                  ))}
                </div>
                <div className="av-search">
                  <Search className="av-searchIc" size={16} />
                  <input
                    type="text"
                    className="av-searchInput"
                    placeholder={t('dashboardLawyer.search_placeholder')}
                    value={searchDemandes}
                    onChange={(e) => setSearchDemandes(e.target.value)}
                  />
                </div>
              </div>

              {/* Grid cartes */}
              <div className="demandes-grid">
                {filteredDemandes.length === 0 ? (
                  <div className="empty-state">
                    <FileText size={40} className="empty-icon" />
                    <p>{t('dashboardLawyer.empty_state')}</p>
                  </div>
                ) : (
                  filteredDemandes.map((d) => {
                    const isExpanded = expandedDocsId === d.id;
                    // On utilise la valeur brute pour le badge CSS, et la fonction d'affichage pour le texte
                    const statutRaw = d.statut_avocat; 
                    const statutDisplay = displayStatutAvocat(statutRaw);
                    
                    // Détermination de la classe badge basée sur la valeur brute normalisée
                    const v = normalize(statutRaw);
                    let badgeCls = 'badge badge--neutral';
                    if (v === 'legale') badgeCls = 'badge badge--success';
                    if (v === 'illegale') badgeCls = 'badge badge--danger';

                    return (
                      <div key={d.id} className={`demande-card ${isExpanded ? 'is-expanded' : ''}`}>

                        {/* Accent bar top */}
                        <div className={`demande-card__bar ${v === 'legale' ? 'bar--ok' : v === 'illegale' ? 'bar--ko' : 'bar--pending'}`} />

                        {/* Brand */}
                        <div className="demande-card__brand">
                          <AssociationLogo
                            name={d.nom_association}
                            logoUrl={d.logo || d.logo_url || d.image || d.association_logo}
                            apiBase={API}
                          />
                          <div className="demande-card__meta">
                            <h3 className="demande-card__title" title={d.nom_association}>{d.nom_association}</h3>
                            <span className={`status-badge ${badgeCls}`}>{statutDisplay}</span>
                          </div>
                        </div>

                        {/* Email */}
                        <div className="info-row">
                          <Mail size={14} className="info-icon" />
                          <span>{d.email}</span>
                        </div>

                        {/* Actions */}
                        <div className="demande-card__actions">
                          <button className="action-btn btn-success" onClick={() => handleChangeStatut(d.id, 'legale')}>
                            <CheckCircle size={15} /> {t('dashboardLawyer.btn_legal')}
                          </button>
                          <button className="action-btn btn-danger" onClick={() => handleChangeStatut(d.id, 'illegale')}>
                            <XCircle size={15} /> {t('dashboardLawyer.btn_illegal')}
                          </button>
                          <button className="action-btn btn-ghost" onClick={() => setExpandedDocsId((prev) => (prev === d.id ? null : d.id))}>
                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                            {t('dashboardLawyer.btn_docs')}
                          </button>
                        </div>

                        {/* Docs panel */}
                        {isExpanded && (
                          <div className="demande-card__docs">
                            <div className="docs-header">{t('dashboardLawyer.docs_header')}</div>
                            <div className="docs-list">
                              {[
                                { label: t('dashboardLawyer.doc_statut'), type: 'doc_statut' },
                                { label: t('dashboardLawyer.doc_autorisation'), type: 'doc_autorisation' },
                                { label: t('dashboardLawyer.doc_registre'), type: 'doc_registre' },
                                { label: t('dashboardLawyer.doc_cin'), type: 'doc_cin' },
                              ].map((doc) => (
                                <button key={doc.type} className="doc-btn" onClick={() => downloadFile(d.id, doc.type)}>
                                  <FileText size={14} /> {doc.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* ===== MOT DE PASSE ===== */}
          {activeTab === 'password' && (
            <div className="pwd-container">
              <div className="pwd-header">
                <div className="pwd-security-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
                  </svg>
                </div>
                <h2>{t('dashboardLawyer.pwd_title')}</h2>
                <p>{t('dashboardLawyer.pwd_sub')}</p>
              </div>
              <div className="pwd-form">
                {[
                  { label: t('dashboardLawyer.pwd_old'), key: 'oldPassword', show: showOldPassword, toggle: () => setShowOldPassword(!showOldPassword) },
                  { label: t('dashboardLawyer.pwd_new'), key: 'newPassword', show: showNewPassword, toggle: () => setShowNewPassword(!showNewPassword) },
                  { label: t('dashboardLawyer.pwd_confirm'), key: 'confirmPassword', show: showConfirmPassword, toggle: () => setShowConfirmPassword(!showConfirmPassword) },
                ].map(({ label, key, show, toggle }) => (
                  <div key={key} className="pwd-field">
                    <label>{label}</label>
                    <div className="pwd-input-wrap">
                      <input
                        type={show ? 'text' : 'password'}
                        value={passwordData[key]}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder="••••••••"
                      />
                      <button type="button" className="pwd-toggle" onClick={toggle}>{show ? '🙈' : '👁️'}</button>
                    </div>
                  </div>
                ))}
                {passwordError && <div className="pwd-error">{passwordError}</div>}
                {passwordSuccess && <div className="pwd-success">{passwordSuccess}</div>}
                <button
                  className="pwd-btn-save"
                  onClick={changePassword}
                  disabled={passwordLoading || !passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                >
                  {passwordLoading ? <span className="spinner">⏳</span> : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  )}
                  {passwordLoading ? t('dashboardLawyer.pwd_btn_loading') : t('dashboardLawyer.pwd_btn_update')}
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default AvocatDashboard;