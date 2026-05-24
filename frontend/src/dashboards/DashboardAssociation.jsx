import { useEffect, useState, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import './DashboardAssociation.css';
import { Home, Users, FileText, Wallet, Lock, Gift, IdCard, LogOut, BarChart3, TrendingUp, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StripeTab from '../pages/StripeTab';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar,
} from 'recharts';

const API = 'http://localhost:5000';

const getStars = (score = 0) => {
  const normalized = Math.round((Number(score) / 100) * 5);
  return Array.from({ length: 5 }, (_, i) => i < normalized);
};

const normalizeScore = (score) => {
  if (!score && score !== 0) return 0;
  return Math.min(100, Math.max(0, score));
};

const DashboardAssociation = () => {
  const { user, logout, login } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [demandes, setDemandes] = useState([]);
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [donneurs, setDonneurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('compte');
  const [editingId, setEditingId] = useState(null);
  const [pourcentage, setPourcentage] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profile, setProfile] = useState({
    nom: '', email: '', telephone: '', adresse: '', description: '',
    categorie: '', logo: '', score_impact: 0, rang: null, categorie_ia: 'Non évalué',
  });

  const authHeaders = useMemo(() => {
    if (!user?.token) return {};
    return { Authorization: `Bearer ${user.token}` };
  }, [user?.token]);

  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [, setPasswordStrength] = useState(0);
  const normalize = (s) => (s ?? '').toString().trim().toLowerCase();
  const [openDonneur, setOpenDonneur] = useState(null);

  const monthKey = (dateLike) => {
    const d = dateLike ? new Date(dateLike) : null;
    if (!d || Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const yearKey = (dateLike) => {
    const d = dateLike ? new Date(dateLike) : null;
    if (!d || Number.isNaN(d.getTime())) return null;
    return String(d.getFullYear());
  };
  const formatMonthLabel = (ym) => { if (!ym) return ''; const [y, m] = ym.split('-'); return `${m}/${y}`; };
  const asNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

  const convertToCSV = (data, headers) => {
    if (!data || data.length === 0) return '';
    const headerRow = headers.map(h => h.label).join(',');
    const rows = data.map(item => headers.map(h => { const value = item[h.key] ?? ''; return `"${String(value).replace(/"/g, '""')}"`; }).join(','));
    return [headerRow, ...rows].join('\n');
  };
  const downloadCSV = (csvContent, filename) => {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.setAttribute('download', filename);
    document.body.appendChild(link); link.click();
    document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const exportDonneursCSV = () => {
    if (donneurs.length === 0) { alert(t('common.no_data_export')); return; }
    const headers = [
      { key: 'donneur_nom', label: t('export.col_donor_name') },
      { key: 'donneur_email', label: t('export.col_donor_email') },
      { key: 'beneficiaire_nom', label: t('export.col_benef_name') },
      { key: 'beneficiaire_prenom', label: t('export.col_benef_firstname') },
      { key: 'montant', label: t('export.col_amount') },
      { key: 'date_don', label: t('export.col_date') },
    ];
    const formattedData = donneurs.map(d => ({ ...d, date_don: d.date_don ? new Date(d.date_don).toLocaleDateString(i18n.language === 'ar' ? 'ar-TN' : 'fr-FR') : '', montant: d.montant ?? 0 }));
    downloadCSV(convertToCSV(formattedData, headers), `donneurs_export_${new Date().toISOString().split('T')[0]}.csv`);
  };
  const exportBeneficiairesCSV = () => {
    if (beneficiaires.length === 0) { alert(t('common.no_data_export')); return; }
    const headers = [
      { key: 'nom', label: t('export.col_name') }, { key: 'prenom', label: t('export.col_firstname') },
      { key: 'montant_a_collecter', label: t('export.col_target') }, { key: 'montant_restant', label: t('export.col_remaining') },
      { key: 'pourcentage', label: t('export.col_percentage') },
    ];
    downloadCSV(convertToCSV(beneficiaires, headers), `beneficiaires_export_${new Date().toISOString().split('T')[0]}.csv`);
  };
  const exportDemandesCSV = () => {
    if (demandes.length === 0) { alert(t('common.no_data_export')); return; }
    const headers = [
      { key: 'nom', label: t('export.col_name') }, { key: 'prenom', label: t('export.col_firstname') },
      { key: 'email', label: t('export.col_email') }, { key: 'telephone', label: t('export.col_phone') },
      { key: 'cin', label: t('export.col_cin') }, { key: 'montant_a_collecter', label: t('export.col_target') },
      { key: 'statut', label: t('export.col_status') }, { key: 'date_naissance', label: t('export.col_birthdate') },
    ];
    const formattedData = demandes.map(d => ({ ...d, date_naissance: d.date_naissance ? new Date(d.date_naissance).toLocaleDateString(i18n.language === 'ar' ? 'ar-TN' : 'fr-FR') : '' }));
    downloadCSV(convertToCSV(formattedData, headers), `demandes_export_${new Date().toISOString().split('T')[0]}.csv`);
  };
  const exportAllTransparence = () => {
    const summary = { export_date: new Date().toLocaleString(i18n.language === 'ar' ? 'ar-TN' : 'fr-FR'), association: user?.nom, stats: { total_donneurs: stats.totalDonneurs, total_beneficiaires: stats.totalBeneficiaires, total_demandes: stats.totalDemandes, dons_recus: donneurs.reduce((acc, d) => acc + asNumber(d.montant), 0), total_collecte_beneficiaires: beneficiairesStats.totalCollecte } };
    const csvSummary = `${t('export.header_data')},${t('export.header_value')}\n` + Object.entries(summary.stats).map(([k, v]) => `"${k}","${v}"`).join('\n');
    downloadCSV(csvSummary, `transparence_resume_${new Date().toISOString().split('T')[0]}.csv`);
    setTimeout(() => { exportDonneursCSV(); setTimeout(() => exportBeneficiairesCSV(), 300); setTimeout(() => exportDemandesCSV(), 600); }, 500);
    alert(t('dashboardAssoc.alert_export_start'));
  };

  const fetchDemandes = useCallback(async () => {
    setLoading(true);
    try { const res = await axios.get(`${API}/demandes_beneficiaire`, { headers: authHeaders }); setDemandes(res.data); }
    catch (err) { console.error('Erreur fetchDemandes:', err); } finally { setLoading(false); }
  }, [authHeaders]);

  const fetchBeneficiaires = useCallback(async () => {
    setLoading(true);
    try { const res = await axios.get(`${API}/associations/beneficiaires`, { headers: authHeaders }); setBeneficiaires(res.data); }
    catch (err) { console.error('Erreur fetchBeneficiaires:', err); } finally { setLoading(false); }
  }, [authHeaders]);

  const fetchDonneurs = useCallback(async () => {
    setLoading(true);
    try { const res = await axios.get(`${API}/associations/donneurs`, { headers: authHeaders }); setDonneurs(res.data); }
    catch (err) { console.error('Erreur fetchDonneurs:', err); } finally { setLoading(false); }
  }, [authHeaders]);

  const fetchMyAssociationProfile = useCallback(async () => {
    if (!user?.token) return;
    setProfileLoading(true);
    try {
      const res = await axios.get(`${API}/associations/me`, { headers: authHeaders });
      setProfile({ nom: res.data?.nom || '', email: res.data?.email || '', telephone: res.data?.telephone || '', adresse: res.data?.adresse || '', description: res.data?.description || '', categorie: res.data?.categorie || '', logo: res.data?.logo || '', score_impact: res.data?.score_impact || 0, rang: res.data?.rang || null, categorie_ia: res.data?.categorie_ia || 'Non évalué' });
    } catch (err) { console.error('Erreur fetchMyAssociationProfile:', err); alert(err.response?.data?.message || t('common.error_loading_profile')); }
    finally { setProfileLoading(false); }
  }, [authHeaders, user?.token, t]);

  useEffect(() => {
    if (!user || user.role !== 'association') { if (user) logout(); navigate('/login'); return; }
    if (activeTab === 'compte' || activeTab === 'card') { fetchMyAssociationProfile(); return; }
    if (activeTab === 'donneurs') fetchDonneurs();
    if (activeTab === 'demandes') fetchDemandes();
    if (activeTab === 'beneficiaires') fetchBeneficiaires();
    if (activeTab === 'stripe') fetchDonneurs();
    if (activeTab === 'transparence') { fetchDonneurs(); fetchBeneficiaires(); fetchDemandes(); }
  }, [user, activeTab, fetchDemandes, fetchBeneficiaires, fetchDonneurs, fetchMyAssociationProfile, logout, navigate]);

  const stats = useMemo(() => {
    const totalDemandes = demandes.length;
    const accepted = demandes.filter((d) => normalize(d.statut) === 'accepted').length;
    const rejected = demandes.filter((d) => normalize(d.statut) === 'rejected').length;
    return { totalDemandes, pendingDemandes: totalDemandes - accepted - rejected, totalBeneficiaires: beneficiaires.length, totalDonneurs: donneurs.length };
  }, [demandes, beneficiaires.length, donneurs.length]);

  const donsParMois = useMemo(() => {
    const map = new Map();
    for (const d of donneurs) {
      const k = monthKey(d.date_don); if (!k) continue;
      const prev = map.get(k) || { month: k, totalMontant: 0, nombreDons: 0 };
      prev.totalMontant += asNumber(d.montant); prev.nombreDons += 1; map.set(k, prev);
    }
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [donneurs]);

  const donsParAn = useMemo(() => {
    const map = new Map();
    for (const d of donneurs) {
      const k = yearKey(d.date_don); if (!k) continue;
      const prev = map.get(k) || { year: k, totalMontant: 0, nombreDons: 0 };
      prev.totalMontant += asNumber(d.montant); prev.nombreDons += 1; map.set(k, prev);
    }
    return Array.from(map.values()).sort((a, b) => a.year.localeCompare(b.year));
  }, [donneurs]);

  const beneficiairesStats = useMemo(() => {
    const totalACollecter = beneficiaires.reduce((acc, b) => acc + asNumber(b.montant_a_collecter), 0);
    const totalRestant = beneficiaires.reduce((acc, b) => acc + asNumber(b.montant_restant), 0);
    return { totalACollecter, totalRestant, totalCollecte: Math.max(0, totalACollecter - totalRestant) };
  }, [beneficiaires]);

  const hasMonthly = donsParMois.length > 0;
  const hasYearly = donsParAn.length > 0;

  const tabMeta = useMemo(() => ({
    card: { title: t('dashboardAssoc.tab_card_title'), subtitle: t('dashboardAssoc.tab_card_sub') },
    compte: { title: t('dashboardAssoc.tab_profile_title'), subtitle: t('dashboardAssoc.tab_profile_sub') },
    donneurs: { title: t('dashboardAssoc.tab_donors_title'), subtitle: t('dashboardAssoc.tab_donors_sub') },
    demandes: { title: t('dashboardAssoc.tab_requests_title'), subtitle: t('dashboardAssoc.tab_requests_sub') },
    beneficiaires: { title: t('dashboardAssoc.tab_beneficiaries_title'), subtitle: t('dashboardAssoc.tab_beneficiaries_sub') },
    transparence: { title: t('dashboardAssoc.tab_transparency_title'), subtitle: t('dashboardAssoc.tab_transparency_sub') },
    historique: { title: t('dashboardAssoc.tab_history_title'), subtitle: t('dashboardAssoc.tab_history_sub') },
  }), [t]);

  const currentTitle = tabMeta[activeTab]?.title || 'Dashboard';
  const currentSubtitle = tabMeta[activeTab]?.subtitle || 'Association';

  const filteredDemandes = demandes.filter((d) => { const q = normalize(search); return normalize(d.nom).includes(q) || normalize(d.prenom).includes(q) || normalize(d.cin).includes(q) || normalize(d.email).includes(q); });
  const filteredBeneficiaires = beneficiaires.filter((b) => { const q = normalize(search); return (normalize(b.nom).includes(q) || normalize(b.prenom).includes(q) || normalize(b.cin).includes(q)) && Number(b.montant_restant || 0) > 0; });
  const filteredDonneurs = donneurs.filter((d) => { const q = normalize(search); return normalize(d.donneur_nom).includes(q) || normalize(d.donneur_email).includes(q) || normalize(d.beneficiaire_nom).includes(q) || normalize(d.beneficiaire_prenom).includes(q); });

  const groupedDonneurs = useMemo(() => {
    const map = new Map();
    filteredDonneurs.forEach((d) => {
      const key = d.donneur_id || d.donneur_email;
      if (!map.has(key)) map.set(key, { donneur_id: d.donneur_id, donneur_nom: d.donneur_nom, donneur_email: d.donneur_email, dons: [], totalMontant: 0 });
      const entry = map.get(key); entry.dons.push(d); entry.totalMontant += Number(d.montant || 0);
    });
    return Array.from(map.values());
  }, [filteredDonneurs]);

  const downloadFile = async (demandeId, field) => {
    try {
      const res = await axios.get(`${API}/demandes_beneficiaire/download/${demandeId}/${field}`, { headers: authHeaders, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a'); link.href = url;
      const disposition = res.headers['content-disposition'];
      let fileName = 'document';
      if (disposition && disposition.includes('filename=')) fileName = disposition.split('filename=')[1].replace(/"/g, '');
      link.setAttribute('download', fileName); document.body.appendChild(link); link.click(); link.remove();
    } catch (err) { console.error('Erreur téléchargement:', err); alert(err.response?.data?.message || t('common.error_download')); }
  };

  const badgeClassDemande = (statut) => { const v = normalize(statut); if (v === 'accepted') return 'badge badge--success'; if (v === 'rejected') return 'badge badge--danger'; return 'badge badge--neutral'; };

  const updateStatut = async (id, nouveauStatut) => {
    const confirmMsg = nouveauStatut === 'accepted' ? t('dashboardAssoc.req_confirm_accept') : t('dashboardAssoc.req_confirm_reject');
    if (!window.confirm(confirmMsg)) return;
    try { await axios.put(`${API}/demandes_beneficiaire/${id}/statut`, { statut: nouveauStatut }, { headers: authHeaders }); setDemandes((prev) => prev.map((d) => (d.id === id ? { ...d, statut: nouveauStatut } : d))); }
    catch (err) { console.error('Erreur updateStatut:', err); alert(err.response?.data?.message || t('common.error_server')); }
  };

  const updatePourcentage = async (id) => {
    try {
      await axios.put(`${API}/associations/beneficiaire/${id}/pourcentage`, { pourcentage }, { headers: authHeaders });
      setBeneficiaires((prev) => prev.map((b) => (b.id === id ? { ...b, pourcentage: Number(pourcentage) } : b)));
      setEditingId(null); setPourcentage(''); alert(t('dashboardAssoc.alert_pct_updated'));
    } catch (err) { console.error(err); alert(err.response?.data?.message || t('common.error_server')); }
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      await axios.put(`${API}/associations/me`, { nom: profile.nom, description: profile.description, categorie: profile.categorie, telephone: profile.telephone, adresse: profile.adresse }, { headers: authHeaders });
      if (typeof login === 'function') login({ ...user, nom: profile.nom });
      alert(t('dashboardAssoc.alert_profile_saved'));
    } catch (err) { console.error('Erreur saveProfile:', err); alert(err.response?.data?.message || t('common.error_server')); }
    finally { setProfileSaving(false); }
  };

  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) return alert(t('dashboardAssoc.alert_pwd_mismatch'));
    try {
      await axios.put(`${API}/associations/me/password`, { oldPassword: passwordData.oldPassword, newPassword: passwordData.newPassword }, { headers: authHeaders });
      alert(t('dashboardAssoc.alert_pwd_success'));
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' }); setPasswordErrors({}); setPasswordStrength(0);
    } catch (err) { alert(err.response?.data?.message || t('common.error_generic')); }
  };

  const logoSrc = profile.logo ? `${API}/upload/${profile.logo}` : '';
  const assocIdForQr = user?.id;
  const currentOrigin = window.location.origin;
  const qrBaseUrl = currentOrigin.replace(/(:\d+)?$/, ':3000');
  const qrValue = assocIdForQr ? `${qrBaseUrl}/association/${assocIdForQr}` : `${qrBaseUrl}/associations`;

  if (loading && activeTab !== 'compte' && activeTab !== 'card' && activeTab !== 'stripe') {
    return (
      <div className="admin-page"><div className="admin-shell"><div className="admin-main">
        <div className="admin-loading">{t('common.loading')}...</div>
      </div></div></div>
    );
  }

  // ── Sidebar nav items ──
  const navItems = [
    { key: 'compte',        icon: Home,     label: t('dashboardAssoc.sidebar_profile') },
    { key: 'stripe',        icon: Wallet,   label: 'Compte Stripe' },
    { key: 'beneficiaires', icon: Users,    label: t('dashboardAssoc.sidebar_beneficiaries') },
    { key: 'demandes',      icon: FileText, label: t('dashboardAssoc.sidebar_requests') },
    { key: 'donneurs',      icon: Gift,     label: t('dashboardAssoc.sidebar_donors') },
    { key: 'transparence',  icon: BarChart3,label: t('dashboardAssoc.sidebar_transparency') },
    { key: 'password',      icon: Lock,     label: t('dashboardAssoc.sidebar_security') },
    { key: 'card',          icon: IdCard,   label: t('dashboardAssoc.sidebar_card') },
    { key: 'historique',    icon: BarChart3,label: t('dashboardAssoc.sidebar_history') },
  ];

  // ── Tabs that show search bar ──
  const tabsWithSearch = ['donneurs', 'demandes', 'beneficiaires', 'transparence', 'historique'];

  return (
    <div className="admin-page" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="admin-shell">

        {/* ══════════════════ SIDEBAR ══════════════════ */}
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <div className="admin-brand__logo">DA</div>
            <div className="admin-brand__text">
              <div className="admin-brand__title">DON'ACT</div>
              <div className="admin-brand__sub">Association Panel</div>
            </div>
          </div>

          <nav className="admin-nav admin-nav--icons">
            {navItems.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                className={`admin-nav__item ${activeTab === key ? 'is-active' : ''}`}
                type="button"
                onClick={() => setActiveTab(key)}
              >
                <Icon className="nav-ic" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="admin-sidebar__footer">
            <div className="admin-user">
              <div className="admin-user__avatar">{(user?.nom?.[0] || user?.email?.[0] || 'A').toUpperCase()}</div>
              <div className="admin-user__meta">
                <div className="admin-user__name">{user?.nom || 'Association'}</div>
                <div className="admin-user__role">{user?.email}</div>
              </div>
            </div>
            <button className="btn btn--danger btn--block btn--withIcon" type="button" onClick={() => { logout(); navigate('/login'); }}>
              <LogOut className="btn-ic" /><span>{t('dashboardAssoc.sidebar_logout')}</span>
            </button>
          </div>
        </aside>

        {/* ══════════════════ MAIN ══════════════════ */}
        <main className="admin-main">

          {/* ── STRIPE ── */}
          {activeTab === 'stripe' && (
            <StripeTab donneurs={donneurs} profile={profile} />
          )}

          {/* ── COMPTE / PROFIL ── */}
          {activeTab === 'compte' && (
            <div className="profile-page">
              <div className="profile-page__header">
                <h1 className="profile-page__title">{t('dashboardAssoc.tab_profile_title')}</h1>
                <p className="profile-page__sub">{t('dashboardAssoc.tab_profile_sub')}</p>
              </div>
              {profileLoading ? <div className="admin-loading">{t('common.loading')}...</div> : (
                <>
                  <div className="profile-identity-card">
                    <div className="profile-identity-card__banner" />
                    <div className="profile-identity-card__body">
                      <div className="profile-logo-wrap">
                        {logoSrc ? <img src={logoSrc} alt="Logo" className="profile-logo-img" /> : <div className="profile-logo-fallback">{String(profile.nom || 'A')[0]?.toUpperCase()}</div>}
                      </div>
                      <div className="profile-identity-info">
                        <h2 className="profile-assoc-name">{profile.nom || '—'}</h2>
                        {profile.description?.trim() && <p className="profile-assoc-desc">{profile.description}</p>}
                        <div className="profile-pills">
                          {profile.categorie && <span className="profile-pill profile-pill--gray">{profile.categorie}</span>}
                          {profile.adresse && (
                            <span className="profile-pill profile-pill--gray">
                              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 2C5.8 2 4 3.8 4 6c0 3.5 4 8 4 8s4-4.5 4-8c0-2.2-1.8-4-4-4z"/></svg>
                              {profile.adresse}
                            </span>
                          )}
                        </div>
                      </div>
                      <button className="profile-edit-btn" type="button" onClick={() => alert(t('common.edit_in_form'))}>
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 2l3 3-9 9H2v-3l9-9z"/></svg>
                        {t('dashboardAssoc.btn_edit')}
                      </button>
                    </div>
                    <div className="profile-ia-block">
                      <div className="profile-ia-stats">
                        <div className="profile-ia-stat">
                          <span className="ia-label">{t('dashboardAssoc.ia_rank')}</span>
                          <span className="ia-value">{profile.rang ? `#${profile.rang}` : '—'}</span>
                        </div>
                        <div className="profile-ia-divider" />
                        <div className="profile-ia-stat">
                          <span className="ia-label">{t('dashboardAssoc.ia_score')}</span>
                          <span className="ia-value ia-value--accent">{normalizeScore(profile.score_impact)}<span className="ia-value-sub">/100</span></span>
                        </div>
                        <div className="profile-ia-divider" />
                        <div className="profile-ia-stat profile-ia-stat--stars">
                          <span className="ia-label">{t('dashboardAssoc.ia_eval')}</span>
                          <div className="profile-stars">{getStars(profile.score_impact).map((active, i) => <span key={i} className={`star ${active ? 'star--on' : 'star--off'}`}>★</span>)}</div>
                        </div>
                      </div>
                      <div className="profile-score-bar"><div className="profile-score-fill" style={{ width: `${normalizeScore(profile.score_impact)}%` }} /></div>
                      {profile.categorie_ia && profile.categorie_ia !== 'Non évalué' && (
                        <div className="profile-ia-category">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="12" height="12" rx="3"/><path d="M5 8h6M8 5v6"/></svg>
                          {t('dashboardAssoc.ia_class')} <strong>{profile.categorie_ia}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="profile-form-card">
                    <div className="profile-form-card__head">
                      <div className="profile-section-icon profile-section-icon--blue">
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>
                      </div>
                      <div>
                        <p className="profile-section-title">{t('dashboardAssoc.section_contact_info')}</p>
                        <p className="profile-section-sub">{t('dashboardAssoc.section_contact_sub')}</p>
                      </div>
                    </div>
                    <div className="profile-form-grid">
                      <div className="profile-field"><label className="profile-label">{t('dashboardAssoc.label_email')}</label><input className="profile-input" value={profile.email} disabled /></div>
                      <div className="profile-field"><label className="profile-label">{t('dashboardAssoc.label_phone')}</label><input className="profile-input" value={profile.telephone} onChange={(e) => setProfile((p) => ({ ...p, telephone: e.target.value }))} placeholder={t('dashboardAssoc.placeholder_phone')} /></div>
                      <div className="profile-field"><label className="profile-label">{t('dashboardAssoc.label_category')}</label><input className="profile-input" value={profile.categorie} onChange={(e) => setProfile((p) => ({ ...p, categorie: e.target.value }))} placeholder={t('dashboardAssoc.placeholder_category')} /></div>
                      <div className="profile-field"><label className="profile-label">{t('dashboardAssoc.label_address')}</label><input className="profile-input" value={profile.adresse} onChange={(e) => setProfile((p) => ({ ...p, adresse: e.target.value }))} placeholder={t('dashboardAssoc.placeholder_address')} /></div>
                      <div className="profile-field profile-field--full"><label className="profile-label">{t('dashboardAssoc.label_name')}</label><input className="profile-input" value={profile.nom} onChange={(e) => setProfile((p) => ({ ...p, nom: e.target.value }))} placeholder={t('dashboardAssoc.placeholder_name')} /></div>
                      <div className="profile-field profile-field--full"><label className="profile-label">{t('dashboardAssoc.label_desc')}</label><textarea className="profile-input profile-textarea" value={profile.description} onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))} placeholder={t('dashboardAssoc.placeholder_desc')} rows={4} /></div>
                      <div className="profile-field profile-field--full">
                        <button className="profile-save-btn" type="button" disabled={profileSaving} onClick={saveProfile}>
                          {profileSaving ? (<><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="spin"><circle cx="8" cy="8" r="6" strokeDasharray="28" strokeDashoffset="10"/></svg>{t('dashboardAssoc.btn_saving')}</>) : (<><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8l4 4 6-6"/></svg>{t('dashboardAssoc.btn_save')}</>)}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TOUS LES AUTRES ONGLETS ── */}
          {activeTab !== 'compte' && activeTab !== 'stripe' && (
            <section className="admin-card">
              {tabsWithSearch.includes(activeTab) && (
                <div className="admin-card__header">
                  <div>
                    <h2 className="admin-card__title">{currentTitle}</h2>
                    <p className="admin-card__desc">{currentSubtitle}</p>
                  </div>
                  <div className="admin-card__tools">
                    <input type="text" className="input" placeholder={t('common.search_placeholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                </div>
              )}

              {/* PASSWORD */}
              {activeTab === 'password' && (
                <div className="pwd-container">
                  <div className="pwd-header">
                    <div className="pwd-security-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                    </div>
                    <h2>{t('dashboardAssoc.tab_password_title')}</h2>
                    <p>{t('dashboardAssoc.tab_password_sub')}</p>
                  </div>
                  <div className="pwd-form">
                    {[
                      { key: 'oldPassword', label: t('dashboardAssoc.pwd_old'), show: showOldPassword, toggle: () => setShowOldPassword(!showOldPassword) },
                      { key: 'newPassword', label: t('dashboardAssoc.pwd_new'), show: showNewPassword, toggle: () => setShowNewPassword(!showNewPassword) },
                      { key: 'confirmPassword', label: t('dashboardAssoc.pwd_confirm'), show: showConfirmPassword, toggle: () => setShowConfirmPassword(!showConfirmPassword) },
                    ].map(({ key, label, show, toggle }) => (
                      <div className="pwd-field" key={key}>
                        <label>{label}</label>
                        <div className="pwd-input-wrap">
                          <input type={show ? 'text' : 'password'} placeholder="••••••••" value={passwordData[key]} onChange={(e) => setPasswordData(prev => ({ ...prev, [key]: e.target.value }))} />
                          <button type="button" className="pwd-toggle" onClick={toggle}>{show ? '🙈' : '👁️'}</button>
                        </div>
                        {key === 'confirmPassword' && passwordErrors.confirmPassword && <span className="pwd-error">{passwordErrors.confirmPassword}</span>}
                      </div>
                    ))}
                    <button className="pwd-btn-save" onClick={changePassword} disabled={!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      {t('dashboardAssoc.btn_update_pwd')}
                    </button>
                  </div>
                </div>
              )}

              {/* CARD */}
              {activeTab === 'card' && (
                <div className="assoc-card-wrap">
                  {profileLoading ? <div className="admin-loading">{t('common.loading')}...</div> : (
                    <div className="assoc-card">
                      <div className="assoc-card__header">
                        <div className="assoc-card__brand">DON'AC<span>T</span></div>
                        <div className="assoc-card__logo-wrap">
                          {logoSrc ? <img src={logoSrc} alt="Logo" className="assoc-card__logo-img" /> : <div className="assoc-card__logo-placeholder">{String(profile.nom || 'A')[0]?.toUpperCase()}</div>}
                        </div>
                        <h2 className="assoc-card__name">{profile.nom || '—'}</h2>
                        {profile.categorie && <span className="assoc-card__category-pill">{profile.categorie}</span>}
                      </div>
                      <div className="assoc-card__ia-block">
                        <div className="assoc-card__ia-row">
                          <div className="assoc-card__ia-stat"><span className="ia-stat-label">{t('dashboardAssoc.ia_rank')}</span><span className="ia-stat-value">{profile.rang ? `#${profile.rang}` : '—'}</span></div>
                          <div className="assoc-card__ia-divider" />
                          <div className="assoc-card__ia-stat"><span className="ia-stat-label">{t('dashboardAssoc.ia_score')}</span><span className="ia-stat-value ia-stat-value--accent">{normalizeScore(profile.score_impact)}<span className="ia-stat-sub">/100</span></span></div>
                        </div>
                        <div className="assoc-card__score-bar"><div className="assoc-card__score-fill" style={{ width: `${normalizeScore(profile.score_impact)}%` }} /></div>
                        <div className="assoc-card__stars">{getStars(profile.score_impact).map((active, i) => <span key={i} className={`star ${active ? 'star--on' : 'star--off'}`}>★</span>)}</div>
                        {profile.categorie_ia && profile.categorie_ia !== 'Non évalué' && (
                          <div className="assoc-card__ia-category">
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="12" height="12" rx="3"/><path d="M5 8h6M8 5v6"/></svg>
                            <span>{t('dashboardAssoc.ia_class')}</span><strong>{profile.categorie_ia}</strong>
                          </div>
                        )}
                      </div>
                      <div className="assoc-card__info-grid">
                        <div className="assoc-card__info-item"><span className="info-label">{t('dashboardAssoc.label_phone')}</span><span className="info-value">{profile.telephone || '—'}</span></div>
                        <div className="assoc-card__info-item"><span className="info-label">{t('dashboardAssoc.label_category')}</span><span className="info-value">{profile.categorie || '—'}</span></div>
                        <div className="assoc-card__info-item assoc-card__info-item--full"><span className="info-label">{t('dashboardAssoc.label_address')}</span><span className="info-value">{profile.adresse || '—'}</span></div>
                        <div className="assoc-card__info-item assoc-card__info-item--full"><span className="info-label">{t('dashboardAssoc.label_desc')}</span><span className="info-value info-value--desc">{profile.description?.trim() ? profile.description : '—'}</span></div>
                      </div>
                      <div className="assoc-card__qr-block">
                        <div className="assoc-card__qr-wrap"><QRCodeSVG value={qrValue} size={88} /></div>
                        <div className="assoc-card__qr-text"><p className="qr-title">{t('dashboardAssoc.qr_scan')}</p><p className="qr-sub">{t('dashboardAssoc.qr_sub')}</p></div>
                      </div>
                      <div className="assoc-card__footer"><span>{t('dashboardAssoc.card_footer')}</span><span className="footer-brand">DON'ACT</span></div>
                    </div>
                  )}
                </div>
              )}

              {/* TRANSPARENCE */}
              {activeTab === 'transparence' && (
                <div className="transparency-page">
                  <div className="transparency-toolbar">
                    <div className="toolbar-left"><h3 className="toolbar-title">{t('dashboardAssoc.tab_transparency_title')}</h3><p className="toolbar-sub">{t('dashboardAssoc.tab_transparency_sub')}</p></div>
                    <button className="btn-export" type="button" onClick={exportAllTransparence} title={t('dashboardAssoc.btn_export')}><Download size={15} />{t('dashboardAssoc.btn_export')}</button>
                  </div>
                  <div className="t-stats-grid">
                    {[
                      { color: 'purple', icon: TrendingUp, value: stats.totalDonneurs, label: t('dashboardAssoc.stat_donors'), hint: t('dashboardAssoc.stat_donors_hint') },
                      { color: 'blue',   icon: Users,      value: stats.totalBeneficiaires, label: t('dashboardAssoc.stat_beneficiaries'), hint: t('dashboardAssoc.stat_beneficiaries_hint') },
                      { color: 'amber',  icon: FileText,   value: stats.totalDemandes, label: t('dashboardAssoc.stat_requests'), hint: t('dashboardAssoc.stat_requests_hint').replace('{count}', stats.pendingDemandes) },
                      { color: 'green',  icon: Gift,       value: donneurs.length, label: t('dashboardAssoc.stat_donations_received'), hint: t('dashboardAssoc.stat_donations_hint') },
                    ].map(({ color, icon: Icon, value, label, hint }) => (
                      <div key={color} className={`t-stat-card t-stat-card--${color}`}>
                        <div className="t-stat-icon"><Icon size={18} /></div>
                        <div className="t-stat-body"><span className="t-stat-value">{value}</span><span className="t-stat-label">{label}</span><span className="t-stat-hint">{hint}</span></div>
                      </div>
                    ))}
                  </div>
                  <div className="t-charts-grid">
                    <div className="t-chart-card">
                      <div className="t-chart-card__head">
                        <div><p className="t-chart-title">{t('dashboardAssoc.chart_monthly')}</p><p className="t-chart-sub">{t('dashboardAssoc.chart_monthly_sub')}</p></div>
                        <div className="t-chart-legend"><span className="legend-dot legend-dot--blue" />{t('dashboardAssoc.legend_amount')}<span className="legend-dot legend-dot--green" style={{ marginLeft: 12 }} />{t('dashboardAssoc.legend_count')}</div>
                      </div>
                      {hasMonthly ? (
                        <div className="t-chart-body">
                          <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={donsParMois}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f6" />
                              <XAxis dataKey="month" tickFormatter={formatMonthLabel} tick={{ fontSize: 11, fill: '#9095a8' }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 11, fill: '#9095a8' }} axisLine={false} tickLine={false} />
                              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e8eaf0', fontSize: 12 }} formatter={(value, name) => { if (name === 'totalMontant') return [`${value} DT`, t('dashboardAssoc.legend_amount')]; if (name === 'nombreDons') return [value, t('dashboardAssoc.legend_count')]; return [value, name]; }} labelFormatter={(label) => `${t('common.month')} : ${formatMonthLabel(label)}`} />
                              <Line type="monotone" dataKey="totalMontant" name={t('dashboardAssoc.legend_amount')} stroke="#534AB7" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                              <Line type="monotone" dataKey="nombreDons" name={t('dashboardAssoc.legend_count')} stroke="#0F6E56" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : <div className="t-chart-empty"><svg width="32" height="32" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M2 12l4-4 3 3 5-7"/></svg>{t('dashboardAssoc.no_data_monthly')}</div>}
                    </div>
                    <div className="t-chart-card">
                      <div className="t-chart-card__head">
                        <div><p className="t-chart-title">{t('dashboardAssoc.chart_yearly')}</p><p className="t-chart-sub">{t('dashboardAssoc.chart_yearly_sub')}</p></div>
                        <div className="t-chart-legend"><span className="legend-dot legend-dot--blue" />{t('dashboardAssoc.legend_amount')}<span className="legend-dot legend-dot--green" style={{ marginLeft: 12 }} />{t('dashboardAssoc.legend_count')}</div>
                      </div>
                      {hasYearly ? (
                        <div className="t-chart-body">
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={donsParAn} barGap={4}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f1f6" />
                              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9095a8' }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 11, fill: '#9095a8' }} axisLine={false} tickLine={false} />
                              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e8eaf0', fontSize: 12 }} formatter={(value, name) => { if (name === 'totalMontant') return [`${value} DT`, t('dashboardAssoc.legend_amount')]; if (name === 'nombreDons') return [value, t('dashboardAssoc.legend_count')]; return [value, name]; }} labelFormatter={(label) => `${t('common.year')} : ${label}`} />
                              <Bar dataKey="totalMontant" name={t('dashboardAssoc.legend_amount')} fill="#534AB7" radius={[6, 6, 0, 0]} />
                              <Bar dataKey="nombreDons" name={t('dashboardAssoc.legend_count')} fill="#0F6E56" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : <div className="t-chart-empty"><svg width="32" height="32" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="8" width="3" height="6" rx="1"/><rect x="6.5" y="5" width="3" height="9" rx="1"/><rect x="11" y="2" width="3" height="12" rx="1"/></svg>{t('dashboardAssoc.no_data_yearly')}</div>}
                    </div>
                  </div>
                  <div className="t-benef-block">
                    <div className="t-benef-block__head"><p className="t-benef-block__title">{t('dashboardAssoc.benef_summary_title')}</p><p className="t-benef-block__sub">{t('dashboardAssoc.benef_summary_sub')}</p></div>
                    <div className="t-benef-grid">
                      {[
                        { label: t('dashboardAssoc.benef_total_target'), value: `${beneficiairesStats.totalACollecter} DT`, cls: '', barCls: 'tbenef-bar__fill--purple', pct: 100 },
                        { label: t('dashboardAssoc.benef_total_collected'), value: `${beneficiairesStats.totalCollecte} DT`, cls: 'tbenef-value--green', barCls: 'tbenef-bar__fill--green', pct: beneficiairesStats.totalACollecter > 0 ? Math.min(100, (beneficiairesStats.totalCollecte / beneficiairesStats.totalACollecter) * 100) : 0 },
                        { label: t('dashboardAssoc.benef_total_remaining'), value: `${beneficiairesStats.totalRestant} DT`, cls: 'tbenef-value--amber', barCls: 'tbenef-bar__fill--amber', pct: beneficiairesStats.totalACollecter > 0 ? Math.min(100, (beneficiairesStats.totalRestant / beneficiairesStats.totalACollecter) * 100) : 0 },
                      ].map(({ label, value, cls, barCls, pct }) => (
                        <div key={label} className="t-benef-item">
                          <span className="tbenef-label">{label}</span>
                          <span className={`tbenef-value ${cls}`}>{value}</span>
                          <div className="tbenef-bar"><div className={`tbenef-bar__fill ${barCls}`} style={{ width: `${pct}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="t-note">
                    <div className="t-note__icon"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5.5v.5"/></svg></div>
                    <div className="t-note__body"><p className="t-note__title">{t('dashboardAssoc.transparency_note_title')}</p><p className="t-note__text">{t('dashboardAssoc.transparency_note_text')}</p></div>
                  </div>
                </div>
              )}

              {/* DONNEURS */}
              {activeTab === 'donneurs' && (
                <div className="cards-grid">
                  {groupedDonneurs.length === 0 ? (
                    <div className="empty-state"><div className="empty-icon"><svg width="32" height="32" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M8 2C5.8 2 4 3.8 4 6c0 3.5 4 8 4 8s4-4.5 4-8c0-2.2-1.8-4-4-4z"/></svg></div><p>{t('dashboardAssoc.empty_donors')}</p></div>
                  ) : groupedDonneurs.map((d) => {
                    const initials = d.donneur_nom ? d.donneur_nom.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() : '??';
                    const isOpen = openDonneur === d.donneur_id;
                    return (
                      <div className="donneur-card" key={d.donneur_id}>
                        <div className="donneur-card__header" onClick={() => setOpenDonneur(isOpen ? null : d.donneur_id)} role="button" aria-expanded={isOpen}>
                          <div className="donneur-avatar">{initials}</div>
                          <div className="donneur-identity"><p className="donneur-name">{d.donneur_nom}</p><p className="donneur-email">{d.donneur_email}</p></div>
                          <div className="donneur-chevron" data-open={isOpen}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6l4 4 4-4"/></svg></div>
                        </div>
                        <div className="donneur-stats">
                          <div className="donneur-stat"><span className="stat-label">{t('dashboardAssoc.donor_total_collected')}</span><span className="stat-value stat-value--accent">{d.totalMontant} DT</span></div>
                          <div className="donneur-stat"><span className="stat-label">{t('dashboardAssoc.donor_num_donations')}</span><span className="stat-value">{d.dons.length} don{d.dons.length > 1 ? 's' : ''}</span></div>
                        </div>
                        {isOpen && (
                          <div className="donneur-details">
                            <p className="details-title">{t('dashboardAssoc.donor_details_title')}</p>
                            {d.dons.map((don, i) => (
                              <div className="don-row" key={i}>
                                <div className="don-beneficiaire"><div className="don-avatar">{don.beneficiaire_prenom?.[0]}{don.beneficiaire_nom?.[0]}</div><span className="don-nom">{don.beneficiaire_prenom} {don.beneficiaire_nom}</span></div>
                                <div className="don-meta"><span className="don-montant">{don.montant} DT</span><span className="don-date">{don.date_don ? new Date(don.date_don).toLocaleDateString(i18n.language === 'ar' ? 'ar-TN' : 'fr-FR') : '—'}</span></div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* HISTORIQUE */}
              {activeTab === 'historique' && (() => {
                const termines = beneficiaires.filter(b => Number(b.montant_restant) === 0);
                return (
                  <div className="history-container">
                    <div className="history-header">
                      <h2 className="history-title">{t('dashboardAssoc.tab_history_title')}</h2>
                      <span className="history-count">{termines.length} {t('dashboardAssoc.history_completed')}{termines.length > 1 ? 's' : ''}</span>
                      <div className="table-wrapper">
                        {termines.length === 0 ? (
                          <div className="empty-state"><div className="empty-icon-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg></div><p className="empty-text">{t('dashboardAssoc.history_empty')}</p></div>
                        ) : (
                          <table className="custom-table">
                            <thead><tr><th>{t('dashboardAssoc.th_beneficiary')}</th><th className="text-right">{t('dashboardAssoc.th_goal')}</th><th className="text-right">{t('dashboardAssoc.th_remaining')}</th><th className="text-center">{t('dashboardAssoc.th_status')}</th></tr></thead>
                            <tbody>
                              {termines.map((b) => (
                                <tr key={b.id}>
                                  <td className="cell-user"><div className="user-avatar">{b.nom.charAt(0)}{b.prenom ? b.prenom.charAt(0) : ''}</div><div className="user-info"><span className="user-name">{b.nom} {b.prenom}</span><span className="user-id">ID: #{b.id}</span></div></td>
                                  <td className="text-right font-bold text-dark">{Number(b.montant_a_collecter).toFixed(2)} <small>DT</small></td>
                                  <td className="text-right text-success font-medium">0.00 <small>DT</small></td>
                                  <td className="text-center"><span className="badge-status status-completed"><span className="dot"></span> {t('dashboardAssoc.status_completed')}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* DEMANDES */}
              {activeTab === 'demandes' && (
                <div className="cards-grid">
                  {filteredDemandes.length === 0 ? (
                    <div className="empty-state"><div className="empty-icon"><svg width="32" height="32" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M5 6h6M5 9h4"/></svg></div><p>{t('dashboardAssoc.empty_requests')}</p></div>
                  ) : filteredDemandes.map((d) => {
                    const initials = `${d.prenom?.[0] || ''}${d.nom?.[0] || ''}`.toUpperCase();
                    const statutNorm = normalize(d.statut);
                    return (
                      <div className={`demande-card demande-card--${statutNorm}`} key={d.id}>
                        <div className="demande-card__header">
                          <div className="demande-avatar">{initials}</div>
                          <div className="demande-identity"><p className="demande-name">{d.prenom} {d.nom}</p><p className="demande-email">{d.email}</p></div>
                          <span className={badgeClassDemande(d.statut)}>{d.statut || 'pending'}</span>
                        </div>
                        <div className="demande-card__body">
                          <div className="demande-info-grid">
                            {[
                              { label: t('dashboardAssoc.label_phone'), value: d.telephone },
                              { label: t('dashboardAssoc.label_cin'), value: d.cin },
                              { label: t('dashboardAssoc.label_date_naissance'), value: d.date_naissance ? new Date(d.date_naissance).toLocaleDateString(i18n.language === 'ar' ? 'ar-TN' : 'fr-FR') : '—' },
                              { label: t('dashboardAssoc.label_genre'), value: d.genre },
                              { label: t('dashboardAssoc.label_situation'), value: d.situation_familiale },
                              { label: t('dashboardAssoc.label_montant'), value: d.montant_a_collecter ? `${d.montant_a_collecter} DT` : '—', accent: true },
                            ].map(({ label, value, accent }) => (
                              <div key={label} className="demande-info-item">
                                <span className="info-label">{label}</span>
                                <span className={`info-value${accent ? ' info-value--accent' : ''}`}>{value || '—'}</span>
                              </div>
                            ))}
                          </div>
                          {d.adresse && <div className="demande-adresse"><span className="info-label">{t('dashboardAssoc.label_address')}</span><span className="info-value">{d.adresse}</span></div>}
                          {d.description && <div className="demande-description"><span className="info-label">{t('dashboardAssoc.label_description')}</span><p className="description-text">{d.description}</p></div>}
                          {(d.doc_identite || d.doc_autre) && (
                            <div className="demande-docs">
                              <span className="info-label">{t('dashboardAssoc.section_docs')}</span>
                              <div className="docs-row">
                                {d.doc_identite && <button className="doc-btn" type="button" onClick={() => downloadFile(d.id, 'doc_identite')}><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2h6l4 4v8a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M10 2v4h4"/></svg>{t('dashboardAssoc.doc_identity')}</button>}
                                {d.doc_autre && <button className="doc-btn" type="button" onClick={() => downloadFile(d.id, 'doc_autre')}><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2h6l4 4v8a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M10 2v4h4"/></svg>{t('dashboardAssoc.doc_other')}</button>}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="demande-card__footer">
                          <button className="btn btn--success btn--sm btn--half" type="button" disabled={statutNorm === 'accepted'} onClick={() => updateStatut(d.id, 'accepted')}><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8l4 4 6-6"/></svg>{t('dashboardAssoc.req_accept')}</button>
                          <button className="btn btn--danger btn--sm btn--half" type="button" disabled={statutNorm === 'rejected'} onClick={() => updateStatut(d.id, 'rejected')}><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l8 8M12 4l-8 8"/></svg>{t('dashboardAssoc.req_reject')}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* BENEFICIAIRES */}
              {activeTab === 'beneficiaires' && (
                <div className="cards-grid">
                  {filteredBeneficiaires.length === 0 ? (
                    <div className="empty-state"><div className="empty-icon"><svg width="32" height="32" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg></div><p>{t('dashboardAssoc.empty_beneficiaries')}</p></div>
                  ) : filteredBeneficiaires.map((b) => {
                    const pct = Number(b.pourcentage || 0);
                    const initials = `${b.prenom?.[0] || ''}${b.nom?.[0] || ''}`.toUpperCase();
                    const badgeClass = pct > 75 ? 'badge--danger' : pct >= 25 ? 'badge--warning' : 'badge--success';
                    return (
                      <div className="benef-card" key={b.id}>
                        <div className="benef-card__top">
                          <div className="benef-card__header">
                            <div className="benef-avatar">{initials}</div>
                            <p className="benef-name">{b.prenom} {b.nom}</p>
                            {editingId !== b.id && <span className={`benef-badge ${badgeClass}`}>{pct}%</span>}
                          </div>
                          <div className="benef-stats">
                            <div className="benef-stat"><div className="stat-label">{t('dashboardAssoc.benef_to_collect')}</div><div className="stat-value">{b.montant_a_collecter ? `${Number(b.montant_a_collecter).toFixed(2)} DT` : '—'}</div></div>
                            <div className="benef-stat"><div className="stat-label">{t('dashboardAssoc.benef_remaining')}</div><div className="stat-value stat-value--accent">{b.montant_restant ? `${Number(b.montant_restant).toFixed(2)} DT` : '—'}</div></div>
                          </div>
                          <div className="benef-progress"><div className="benef-progress__fill" style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                        </div>
                        <div className="benef-card__footer">
                          {editingId === b.id ? (
                            <div className="inline-edit">
                              <input className="input--sm" type="number" value={pourcentage} onChange={(e) => setPourcentage(e.target.value)} min="0" max="100" />
                              <button className="btn--primary btn--sm" type="button" onClick={() => updatePourcentage(b.id)}>{t('dashboardAssoc.btn_validate')}</button>
                              <button className="btn--ghost btn--sm" type="button" onClick={() => setEditingId(null)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                            </div>
                          ) : (
                            <button className="btn--edit btn--sm" type="button" onClick={() => { setEditingId(b.id); setPourcentage(b.pourcentage || 0); }}>
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 2l3 3-9 9H2v-3l9-9z"/></svg>
                              {t('dashboardAssoc.btn_update_pct')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardAssociation;