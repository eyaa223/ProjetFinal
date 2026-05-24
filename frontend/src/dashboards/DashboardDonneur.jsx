import { useContext, useEffect, useMemo, useState, useCallback, Fragment } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './DashboardDonneur.css';
import { useTranslation } from 'react-i18next'; // Import du hook

import {
  IdCard, User, Lock, HandHeart, Building2, ArrowLeft, LogOut, Download, MessageSquare, Edit2, Trash2, Check, Award
} from 'lucide-react';

const API = 'http://localhost:5000';
const UPLOADS = `${API}/upload`;

const CATEGORY_META = {
  education: { label: 'Éducation', emoji: '🎓' },
  health: { label: 'Santé', emoji: '🏥' },
  food: { label: 'Alimentation', emoji: '🍎' },
  housing: { label: 'Logement', emoji: '🏠' },
  emergency: { label: 'Urgence', emoji: '🆘' },
  skills: { label: 'Formation', emoji: '💻' },
  other: { label: 'Autre', emoji: '❤️' },
};

const QUICK_AMOUNTS = [10, 25, 50, 100];

const DashboardDonneur = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(); // Hook de traduction

  const [activeTab, setActiveTab] = useState('dons');
  const [associations, setAssociations] = useState([]);
  const [selectedAssoc, setSelectedAssoc] = useState(null);
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [mesDons, setMesDons] = useState([]);
  const [mesMessages, setMesMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Password States
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Profile States
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profile, setProfile] = useState({ nom: '', email: '', numero_bancaire: '' });

  // Donation Panel States
  const [donPanelOpen, setDonPanelOpen] = useState(false);
  const [donTarget, setDonTarget] = useState(null);
  const [donMontant, setDonMontant] = useState('');
  const [donNumeroBancaire, setDonNumeroBancaire] = useState('');
  const [donMessage, setDonMessage] = useState('');
  const [donSubmitting, setDonSubmitting] = useState(false);
  const [donError, setDonError] = useState('');
  const [donSuccess, setDonSuccess] = useState('');

  // Certificate States
  const [certificateUrl, setCertificateUrl] = useState('');
  const [certificateLoading, setCertificateLoading] = useState(false);
  const [certificateError, setCertificateError] = useState('');

  // Message Edit States
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editedMessageText, setEditedMessageText] = useState('');
  const [messageSaving, setMessageSaving] = useState(false);
  const [openBenef, setOpenBenef] = useState(null);
  
  // Password Data
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'donneur') {
      if (user) logout();
      navigate('/login');
      return;
    }
  }, [user, logout, navigate]);

  const authHeader = useMemo(() => {
    if (!user?.token) return {};
    return { Authorization: `Bearer ${user.token}` };
  }, [user?.token]);

  const initials = useMemo(() => {
    const a = (user?.nom || profile?.nom || user?.email || 'D').toString().trim()[0] || 'D';
    return a.toUpperCase();
  }, [user?.nom, user?.email, profile?.nom]);

  const normalize = (s) => (s ?? '').toString().trim().toLowerCase();

  const formatDateFr = (dateLike) => {
    if (!dateLike) return '—';
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(i18n.language === 'ar' ? 'ar-TN' : 'fr-FR');
  };

  // ✅ Export CSV
  const exportMyDonationsCSV = () => {
    const list = Array.isArray(mesDons) ? mesDons : [];
    const rows = list.map((d) => ({
      beneficiaire: `${d.beneficiaire_nom || ''} ${d.beneficiaire_prenom || ''}`.trim() || '—',
      montant: Number(d.montant || 0),
      numero_bancaire: d.numero_bancaire || '',
      montant_restant: d.montant_restant ?? '',
      date: formatDateFr(d.created_at || d.date || d.date_don),
      statut: 'Complété',
    }));

    const header = ['Beneficiaire', 'Montant', 'NumeroBancaire', 'MontantRestant', 'Date', 'Statut'];
    const csv = [
      header.join(','),
      ...rows.map((r) =>
        [
          `"${String(r.beneficiaire).replaceAll('"', '""')}"`,
          r.montant,
          `"${String(r.numero_bancaire).replaceAll('"', '""')}"`,
          r.montant_restant,
          `"${String(r.date).replaceAll('"', '""')}"`,
          `"${String(r.statut).replaceAll('"', '""')}"`,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mes-dons-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ✅ Fetch Functions
  const fetchMesDons = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/mine`, { headers: authHeader });
      setMesDons(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Erreur fetch dons', err);
      setMesDons([]);
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  const fetchMesMessages = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/mes-messages`, { headers: authHeader });
      setMesMessages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Erreur fetch messages', err);
      setMesMessages([]);
    }
  }, [authHeader]);

  const fetchAssociations = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/associations`, { headers: authHeader });
      setAssociations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Erreur fetch associations', err);
      setAssociations([]);
    }
  }, [authHeader]);

  const fetchBeneficiaires = useCallback(async (assocId) => {
    try {
      const res = await axios.get(`${API}/api/associations/${assocId}/beneficiaires`, { headers: authHeader });
      setBeneficiaires(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Erreur fetch bénéficiaires', err);
      setBeneficiaires([]);
    }
  }, [authHeader]);

  const fetchMyProfile = useCallback(async () => {
    if (!user?.token) return;
    setProfileLoading(true);
    setProfileError('');
    try {
      const res = await axios.get(`${API}/api/me`, { headers: authHeader });
      setProfile({
        nom: res.data?.nom || '',
        email: res.data?.email || '',
        numero_bancaire: res.data?.numero_bancaire || '',
      });
    } catch (err) {
      console.error('[DashboardDonneur] fetchMyProfile error', err);
      setProfileError(err.response?.data?.message || t('common.error_loading_profile'));
    } finally {
      setProfileLoading(false);
    }
  }, [authHeader, user?.token, t]);

  // ✅ Fetch Certificate
  const fetchCertificate = useCallback(async () => {
    if (!user?.token) return;
    setCertificateLoading(true);
    setCertificateError('');
    try {
      const res = await axios.get(`${API}/api/me/certificate`, {
        headers: authHeader,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      setCertificateUrl(url);
    } catch (err) {
      console.error('Erreur fetch certificat:', err);
      setCertificateError(err.response?.data?.message || t('common.error_loading_cert'));
    } finally {
      setCertificateLoading(false);
    }
  }, [authHeader, user?.token, t]);

  const downloadCertificate = async () => {
    try {
      const res = await axios.get(`${API}/api/me/certificate`, {
        headers: authHeader,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificat-don-${user?.nom || 'donneur'}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(t('common.error_download'));
    }
  };

  const saveProfile = async () => {
    if (!user?.token) return;
    setProfileSaving(true);
    setProfileError('');
    try {
      await axios.put(`${API}/api/me`, { nom: profile.nom, email: profile.email }, { headers: authHeader });
      alert(t('common.success_saved'));
      fetchMyProfile();
    } catch (err) {
      console.error('[DashboardDonneur] saveProfile error', err);
      setProfileError(err.response?.data?.message || t('common.error_server'));
    } finally {
      setProfileSaving(false);
    }
  };

  const saveBankNumber = async () => {
    if (!user?.token) return;
    if (!profile.numero_bancaire?.trim()) {
      setProfileError(t('dashboardDonor.error_bank_required'));
      return;
    }
    setProfileSaving(true);
    setProfileError('');
    try {
      await axios.put(
        `${API}/api/me/bank`,
        { numero_bancaire: profile.numero_bancaire.trim() },
        { headers: authHeader }
      );
      alert('✅ ' + t('common.success_saved'));
      fetchMyProfile();
    } catch (err) {
      console.error('[DashboardDonneur] saveBankNumber error', err);
      setProfileError(err.response?.data?.message || t('common.error_server'));
    } finally {
      setProfileSaving(false);
    }
  };

  // --- Icon components (kept as is for simplicity) ---
  const IconDownload = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );

  const IconHeart = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.8 6.6a4.5 4.5 0 0 0-6.36 0L12 9.06l-2.44-2.44a4.5 4.5 0 0 0-6.36 6.36L12 21.06l8.8-8.8a4.5 4.5 0 0 0 0-6.36z"/>
    </svg>
  );

  const IconList = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3.5" cy="6" r="1.5" fill="currentColor" />
      <circle cx="3.5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="3.5" cy="18" r="1.5" fill="currentColor" />
    </svg>
  );

  const IconChart = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 3v18h18" />
      <rect x="6" y="11" width="2" height="7" fill="currentColor" />
      <rect x="10" y="7" width="2" height="11" fill="currentColor" />
      <rect x="14" y="4" width="2" height="14" fill="currentColor" />
    </svg>
  );

  const IconSearch = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );

  const IconChevron = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );

  const IconMoney = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M12 9v6" />
      <path d="M9 8h6" />
    </svg>
  );

  const IconCalendar = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4" />
      <line x1="3" y1="11" x2="21" y2="11" />
    </svg>
  );

  const IconCheck = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );

  const IconClock = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );

  // ✅ Messages: Update & Delete
  const updateMessage = async (donationId, newMessage) => {
    setMessageSaving(true);
    try {
      await axios.put(
        `${API}/api/donations/${donationId}/message`,
        { message: newMessage },
        { headers: authHeader }
      );
      setMesMessages((prev) =>
        prev.map((m) => (m.id === donationId ? { ...m, message: newMessage } : m))
      );
      setEditingMessageId(null);
      alert(t('common.success_updated'));
    } catch (err) {
      console.error('Erreur update message:', err);
      alert(err.response?.data?.message || t('common.error_server'));
    } finally {
      setMessageSaving(false);
    }
  };

  const deleteMessage = async (donationId) => {
    if (!window.confirm(t('common.confirm_delete'))) return;
    setMessageSaving(true);
    try {
      await axios.delete(`${API}/api/donations/${donationId}/message`, { headers: authHeader });
      setMesMessages((prev) =>
        prev.map((m) => (m.id === donationId ? { ...m, message: null } : m))
      );
      alert(t('common.success_deleted'));
    } catch (err) {
      console.error('Erreur delete message:', err);
      alert(err.response?.data?.message || t('common.error_server'));
    } finally {
      setMessageSaving(false);
    }
  };

  // 🔥 CHANGE PASSWORD
  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordErrors({ confirmPassword: t('dashboardDonor.pwd_error_mismatch') });
      return;
    }
    try {
      await axios.put(
        `${API}/api/me/password`,
        { oldPassword: passwordData.oldPassword, newPassword: passwordData.newPassword },
        { headers: authHeader }
      );
      alert(t('dashboardDonor.alert_pwd_success'));
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors({});
      setPasswordSuccess(t('dashboardDonor.alert_pwd_success'));
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err) {
      console.error('Erreur changePassword:', err);
      setPasswordError(err.response?.data?.message || t('common.error_server'));
    }
  };

  // ✅ Effects
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchMesDons();
  }, [user, fetchMesDons]);

  useEffect(() => {
    if (activeTab === 'compte' || activeTab === 'card') fetchMyProfile();
    if (activeTab === 'messages') fetchMesMessages();
    if (activeTab === 'certificat') fetchCertificate();
  }, [activeTab, fetchMyProfile, fetchMesMessages, fetchCertificate]);

  useEffect(() => {
    const bankNumber = profile?.numero_bancaire || user?.numero_bancaire;
    if (bankNumber && !donNumeroBancaire && donPanelOpen) {
      setDonNumeroBancaire(String(bankNumber).trim());
    }
  }, [profile?.numero_bancaire, user?.numero_bancaire, donNumeroBancaire, donPanelOpen]);

  useEffect(() => {
    if (activeTab !== 'beneficiaires') {
      setDonPanelOpen(false);
      setDonTarget(null);
      setDonError('');
      setDonSuccess('');
    }
  }, [activeTab]);

  // Cleanup certificate URL on unmount
  useEffect(() => {
    return () => {
      if (certificateUrl) {
        URL.revokeObjectURL(certificateUrl);
      }
    };
  }, [certificateUrl]);

  // ✅ Computed Values (Base)
  const donsSummary = useMemo(() => {
    const list = Array.isArray(mesDons) ? mesDons : [];
    const totalDonated = list.reduce((sum, d) => sum + Number(d?.montant || 0), 0);
    const count = list.length;
    const avg = count > 0 ? totalDonated / count : 0;
    return { totalDonated, count, avg };
  }, [mesDons]);

  const messagesWithText = useMemo(() => {
    return mesMessages.filter((m) => m.message && m.message.trim());
  }, [mesMessages]);

  // ✅ Filtered Lists (DOIT ÊTRE AVANT tabMeta)
  const filteredMesDons = useMemo(() => {
    const q = normalize(search);
    return mesDons.filter((d) => {
      const benef = `${d.beneficiaire_nom || ''} ${d.beneficiaire_prenom || ''}`.toLowerCase();
      return benef.includes(q) || normalize(d.numero_bancaire).includes(q);
    });
  }, [mesDons, search]);

  const filteredAssociations = useMemo(() => {
    const q = normalize(search);
    return associations.filter(
      (a) => normalize(a.nom).includes(q) || normalize(a.email).includes(q) || normalize(a.telephone).includes(q),
    );
  }, [associations, search]);

  const filteredBeneficiaires = useMemo(() => {
    const q = normalize(search);
    return beneficiaires
      .filter((b) => Number(b.montant_restant || 0) > 0)
      .filter((b) => normalize(b.nom).includes(q) || normalize(b.prenom).includes(q) || normalize(b.cin).includes(q));
  }, [beneficiaires, search]);

  const filteredMessages = useMemo(() => {
    const q = normalize(search);
    return messagesWithText.filter((m) => {
      const benef = `${m.beneficiaire_nom || ''} ${m.beneficiaire_prenom || ''}`.toLowerCase();
      return benef.includes(q) || normalize(m.message).includes(q);
    });
  }, [messagesWithText, search]);

  // ✅ Tab Metadata (UTILISE filteredBeneficiaires, donc DOIT ÊTRE APRÈS)
  const tabMeta = useMemo(() => ({
    card: { title: t('dashboardDonor.sidebar_card'), subtitle: t('dashboardDonor.tab_card_sub') },
    dons: { title: t('dashboardDonor.tab_donations_title'), subtitle: t('dashboardDonor.tab_donations_sub') },
    associations: { title: t('dashboardDonor.tab_assoc_title'), subtitle: t('dashboardDonor.tab_assoc_sub') },
    beneficiaires: {
      title: selectedAssoc ? `${t('dashboardDonor.tab_benef_title_prefix')} ${selectedAssoc.nom}` : t('dashboardDonor.sidebar_donate'),
      subtitle: t('dashboardDonor.tab_benef_available').replace('{count}', filteredBeneficiaires.length),
    },
    compte: { title: t('dashboardDonor.tab_profile_title'), subtitle: t('dashboardDonor.tab_profile_sub') },
    messages: { title: t('dashboardDonor.tab_messages_title'), subtitle: t('dashboardDonor.tab_messages_sub') },
    password: { title: t('dashboardDonor.sidebar_security'), subtitle: t('dashboardDonor.tab_password_sub') },
    certificat: { title: t('dashboardDonor.tab_cert_title'), subtitle: t('dashboardDonor.tab_cert_sub') },
  }), [t, selectedAssoc, filteredBeneficiaires.length]);
  // ✅ Handlers
  const handleGoAssociations = async () => {
    setActiveTab('associations');
    setSelectedAssoc(null);
    setBeneficiaires([]);
    setSearch('');
    await fetchAssociations();
  };

  const handleAssocClick = async (assoc) => {
    setSelectedAssoc(assoc);
    setActiveTab('beneficiaires');
    setSearch('');
    setDonPanelOpen(false);
    setDonTarget(null);
    await fetchBeneficiaires(assoc.id);
  };

  const normalizeBank = (v) => String(v || '').replace(/\s+/g, '').trim();

  const openDonPanel = (beneficiaire) => {
    setDonTarget(beneficiaire);
    setDonPanelOpen(true);
    setDonError('');
    setDonSuccess('');
    setDonMontant('');
    setDonMessage('');
  };

  const closeDonPanel = () => {
    setDonPanelOpen(false);
    setDonTarget(null);
    setDonError('');
    setDonSuccess('');
  };

  const getProgressPercent = (b) => {
    const p = Number(b?.pourcentage);
    if (!Number.isNaN(p) && Number.isFinite(p)) return Math.min(Math.max(p, 0), 100);
    const target = Number(b?.montant_a_collecter || 0);
    const remaining = Number(b?.montant_restant || 0);
    if (target <= 0) return 0;
    const collected = Math.max(target - remaining, 0);
    return Math.min(Math.max((collected / target) * 100, 0), 100);
  };

  const validateInlineDon = () => {
    const m = Number(donMontant);
    if (!donTarget?.id) return 'Bénéficiaire introuvable.';
    if (!user?.token) return 'Vous devez être connecté.';
    if (!donMontant || Number.isNaN(m)) return t('dashboardDonor.error_amount_valid');
    if (m <= 0) return t('dashboardDonor.error_amount_positive');
    const bank = normalizeBank(donNumeroBancaire);
    if (!bank) return t('dashboardDonor.error_bank_required');
    if (bank.length < 8) return t('dashboardDonor.error_bank_short');
    return '';
  };

  const submitInlineDon = async (e) => {
    e.preventDefault();
    setDonError('');
    setDonSuccess('');
    const msg = validateInlineDon();
    if (msg) {
      setDonError(msg);
      return;
    }
    setDonSubmitting(true);
    try {
      await axios.post(
        `${API}/api/donations`,
        {
          beneficiaire_id: donTarget.id,
          montant: Number(donMontant),
          numero_bancaire: normalizeBank(donNumeroBancaire),
          message: donMessage?.trim() ? donMessage.trim() : null,
        },
        { headers: authHeader },
      );
      setDonSuccess('✓ ' + t('common.success_created'));
      if (selectedAssoc?.id) await fetchBeneficiaires(selectedAssoc.id);
      setTimeout(() => closeDonPanel(), 900);
    } catch (err) {
      console.error(err);
      setDonError(err.response?.data?.message || t('common.error_server'));
    } finally {
      setDonSubmitting(false);
    }
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

  if (!user) return null;

  return (
    <div className="admin-page" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <div className="admin-brand__logo">DA</div>
            <div className="admin-brand__text">
              <div className="admin-brand__title">DON'ACT</div>
              <div className="admin-brand__sub">{t('common.donor_space')}</div>
            </div>
          </div>
          <nav className="admin-nav admin-nav--icons">
            <button className={`admin-nav__item ${activeTab === 'compte' ? 'is-active' : ''}`} type="button" onClick={() => { setActiveTab('compte'); setSearch(''); }}>
              <User className="nav-ic" /><span>{t('dashboardDonor.sidebar_profile')}</span>
            </button>
            <button className={`admin-nav__item ${activeTab === 'dons' ? 'is-active' : ''}`} type="button" onClick={() => { setActiveTab('dons'); setSearch(''); }}>
              <HandHeart className="nav-ic" /><span>{t('dashboardDonor.sidebar_donations')}</span>
            </button>
            <button className={`admin-nav__item ${activeTab === 'associations' || activeTab === 'beneficiaires' ? 'is-active' : ''}`} type="button" onClick={handleGoAssociations}>
              <Building2 className="nav-ic" /><span>{t('dashboardDonor.sidebar_donate')}</span>
            </button>
            <button className={`admin-nav__item ${activeTab === 'messages' ? 'is-active' : ''}`} type="button" onClick={() => { setActiveTab('messages'); setSearch(''); }}>
              <MessageSquare className="nav-ic" /><span>{t('dashboardDonor.sidebar_comments')}</span>
            </button>
            <button className={`admin-nav__item ${activeTab === 'certificat' ? 'is-active' : ''}`} type="button" onClick={() => { setActiveTab('certificat'); setSearch(''); }}>
              <Award className="nav-ic" /><span>{t('dashboardDonor.sidebar_certificate')}</span>
            </button>
            <button className={`admin-nav__item ${activeTab === 'card' ? 'is-active' : ''}`} type="button" onClick={() => { setActiveTab('card'); setSearch(''); }}>
              <IdCard className="nav-ic" /><span>{t('dashboardDonor.sidebar_card')}</span>
            </button>
            <button className={`admin-nav__item ${activeTab === 'password' ? 'is-active' : ''}`} type="button" onClick={() => setActiveTab('password')}>
              <Lock className="nav-ic" /><span>{t('dashboardDonor.sidebar_security')}</span>
            </button>
            {activeTab === 'beneficiaires' && (
              <button className="admin-nav__item" type="button" onClick={() => { setActiveTab('associations'); setSearch(''); }}>
                <ArrowLeft className="nav-ic" /><span>{t('dashboardDonor.sidebar_back_assoc')}</span>
              </button>
            )}
          </nav>
          <div className="admin-sidebar__footer">
            <div className="admin-user">
              <div className="admin-user__avatar">{initials}</div>
              <div className="admin-user__meta">
                <div className="admin-user__name">{user?.nom || profile?.nom || t('common.donor')}</div>
                <div className="admin-user__role">{user?.email}</div>
              </div>
            </div>
            <button className="btn btn--danger btn--block btn--withIcon" type="button" onClick={() => { logout(); navigate('/'); }}>
              <LogOut className="btn-ic" /><span>{t('dashboardDonor.sidebar_logout')}</span>
            </button>
          </div>
        </aside>

        <main className="admin-main">
          {/* ================= CERTIFICAT ================= */}
          {activeTab === 'certificat' && (
            <div className="cert-page"> 
              {certificateLoading ? (
                <div className="admin-loading">{t('dashboardDonor.cert_loading')}</div>
              ) : certificateError ? (
                <div className="cert-empty">
                  <div className="cert-empty__icon">⚠️</div>
                  <div className="cert-empty__title">{t('dashboardDonor.cert_unavailable')}</div>
                  <p>{certificateError}</p>
                  <button className="btn btn--primary" onClick={fetchCertificate}>{t('dashboardDonor.btn_retry')}</button>
                </div>
              ) : certificateUrl ? (
                <div className="cert-viewer">
                  <div className="cert-viewer__header">
                    <h2>📜 {t('dashboardDonor.tab_cert_title')}</h2>
                  </div>
                  <div className="cert-viewer__container">
                    <iframe
                      src={certificateUrl}
                      className="cert-viewer__iframe"
                      title={t('dashboardDonor.tab_cert_title')}
                      width="100%"
                      height="700px"
                    />
                  </div>
                  <div className="cert-actions">
                    <button className="btn btn--primary btn--lg btn--withIcon" onClick={downloadCertificate}>
                      <Download className="btn-ic" size={18} />
                      <span>{t('dashboardDonor.btn_download_pdf')}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="cert-empty">
                  <div className="cert-empty__icon">🎖️</div>
                  <div className="cert-empty__title">{t('dashboardDonor.cert_none_title')}</div>
                  <p>{t('dashboardDonor.cert_none_text')}</p>
                  <button className="btn btn--primary" onClick={handleGoAssociations}>
                    {t('dashboardDonor.btn_first_don')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= COMPTE ================= */}
          {activeTab === 'compte' && (
            <div className="profile-page">
              <div className="profile-page__header">
                <h1 className="profile-page__title">{t('dashboardDonor.tab_profile_title')}</h1>
                <p className="profile-page__sub">{t('dashboardDonor.tab_profile_sub')}</p>
              </div>
              {profileLoading ? (
                <div className="admin-loading">{t('common.loading')}...</div>
              ) : (
                <>
                  <div className="profile-identity-card">
                    <div className="profile-identity-card__banner" />
                    <div className="profile-identity-card__body">
                      <div className="profile-logo-wrap">
                        <div className="profile-logo-fallback">{initials}</div>
                      </div>
                      <div className="profile-identity-info">
                        <h2 className="profile-assoc-name">{profile.nom || user?.nom || '—'}</h2>
                        <p className="profile-assoc-desc">{profile.email || user?.email || '—'}</p>
                        <div className="profile-pills">
                          {profile.numero_bancaire && <span className="profile-pill">💳 {profile.numero_bancaire}</span>}
                        </div>
                      </div>
                      <button className="profile-edit-btn" type="button" onClick={() => alert(t('dashboardDonor.btn_edit_info_below'))}> {t('dashboardDonor.btn_edit')}</button>
                    </div>
                  </div>
                  <div className="profile-form-card">
                    <div className="profile-form-card__head">
                      <div className="profile-section-icon">👤</div>
                      <div>
                        <p className="profile-section-title">{t('dashboardDonor.section_personal_info')}</p>
                        <p className="profile-section-sub">{t('dashboardDonor.section_personal_sub')}</p>
                      </div>
                    </div>
                    <div className="profile-form-grid">
                      <div className="profile-field">
                        <label className="profile-label">{t('dashboardDonor.label_email')}</label>
                        <input className="profile-input" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
                      </div>
                      <div className="profile-field">
                        <label className="profile-label">{t('dashboardDonor.label_name')}</label>
                        <input className="profile-input" value={profile.nom} onChange={(e) => setProfile((p) => ({ ...p, nom: e.target.value }))} />
                      </div>
                      <div className="profile-field profile-field--full">
                        <label className="profile-label">{t('dashboardDonor.label_bank')}</label>
                        <input className="profile-input" value={profile.numero_bancaire} placeholder={t('dashboardDonor.placeholder_bank')} onChange={(e) => setProfile((p) => ({ ...p, numero_bancaire: e.target.value }))} />
                      </div>
                      {profileError && <div className="profile-field profile-field--full"><div className="don-profile-error">{profileError}</div></div>}
                      <div className="profile-field profile-field--full">
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                          <button className="profile-save-btn" type="button" disabled={profileSaving} onClick={saveProfile}>{profileSaving ? t('dashboardDonor.btn_saving') : t('dashboardDonor.btn_save')}</button>
                          <button className="profile-save-btn" type="button" disabled={profileSaving || !profile.numero_bancaire?.trim()} onClick={saveBankNumber}>{profileSaving ? t('dashboardDonor.btn_saving') : t('dashboardDonor.btn_update_card')}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ================= PASSWORD / SÉCURITÉ ================= */}
          {activeTab === 'password' && (
            <div className="pwd-container">
              <div className="pwd-header">
                <div className="pwd-security-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
                  </svg>
                </div>
                <h2>{t('dashboardDonor.tab_password_title')}</h2>
                <p>{t('dashboardDonor.tab_password_sub')}</p>
              </div>
              <div className="pwd-form">
                <div className="pwd-field">
                  <label>{t('dashboardDonor.pwd_old')}</label>
                  <div className="pwd-input-wrap">
                    <input type={showOldPassword ? "text" : "password"} value={passwordData.oldPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, oldPassword: e.target.value }))} />
                    <button type="button" onClick={() => setShowOldPassword(!showOldPassword)}>{showOldPassword ? "🙈" : "👁️"}</button>
                  </div>
                </div>
                <div className="pwd-field">
                  <label>{t('dashboardDonor.pwd_new')}</label>
                  <div className="pwd-input-wrap">
                    <input type={showNewPassword ? "text" : "password"} value={passwordData.newPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))} />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}>{showNewPassword ? "🙈" : "👁️"}</button>
                  </div>
                </div>
                <div className="pwd-field">
                  <label>{t('dashboardDonor.pwd_confirm')}</label>
                  <div className="pwd-input-wrap">
                    <input type={showConfirmPassword ? "text" : "password"} value={passwordData.confirmPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? "🙈" : "👁️"}</button>
                  </div>
                  {passwordErrors.confirmPassword && <span className="pwd-error">{passwordErrors.confirmPassword}</span>}
                </div>
                {passwordError && <div className="pwd-error">{passwordError}</div>}
                {passwordSuccess && <div className="pwd-success">{passwordSuccess}</div>}
                <button className="pwd-btn-save" onClick={changePassword} disabled={!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  {t('dashboardDonor.btn_update_pwd')}
                </button>
              </div>
            </div>
          )}

          {/* ================= DONS ================= */}
          {activeTab === 'dons' && (
            <div className="dn-page">
              <div className="dn-header">
                <div>
                  <h1 className="dn-title">{t('dashboardDonor.tab_donations_title')}</h1>
                  <p className="dn-sub">{t('dashboardDonor.tab_donations_sub')}</p>
                </div>
                <button className="dn-export-btn" onClick={exportMyDonationsCSV} aria-label="Exporter mes dons au format CSV" title="Exporter CSV">
                  <IconDownload size={15} /> {t('dashboardDonor.btn_export_csv')}
                </button>
              </div>
              <div className="dn-stats">
                {[
                  { val: `${(donsSummary?.totalDonated ?? 0).toFixed(2)} DT`, label: t('dashboardDonor.stat_total_given'), color: '#6c63ff', icon: <IconHeart /> },
                  { val: donsSummary?.count ?? 0, label: t('dashboardDonor.stat_count'), color: '#00008B', icon: <IconList /> },
                  { val: `${(donsSummary?.avg ?? 0).toFixed(0)} DT`, label: t('dashboardDonor.stat_avg'), color: '#11cdef', icon: <IconChart /> },
                ].map((s) => (
                  <div className="dn-stat" key={s.label} style={{ '--sc': s.color }}>
                    <div className="dn-stat__icon" aria-hidden>{s.icon}</div>
                    <div className="dn-stat__val">{s.val}</div>
                    <div className="dn-stat__label">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="dn-card">
                <div className="dn-card__head">
                  <div>
                    <span className="dn-card__title">{t('dashboardDonor.history_title')}</span>
                    <span className="dn-card__hint"> — {t('dashboardDonor.history_hint')}</span>
                  </div>
                  <div className="dn-search" role="search" aria-label={t('dashboardDonor.search_placeholder')}>
                    <IconSearch />
                    <input placeholder={t('dashboardDonor.search_placeholder')} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t('dashboardDonor.search_placeholder')} />
                    <span className="dn-badge" aria-live="polite">{filteredMesDons?.length ?? 0}</span>
                  </div>
                </div>
                {filteredMesDons && filteredMesDons.length > 0 ? (
                  <div className="dn-list">
                    {Object.entries(
                      filteredMesDons.reduce((acc, d) => {
                        const key = `${d.beneficiaire_nom||''} ${d.beneficiaire_prenom||''}`.trim() || 'Inconnu';
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(d);
                        return acc;
                      }, {})
                    ).map(([benef, dons], idx) => {
                      const isOpen = openBenef === benef;
                      const total = dons.reduce((s, d) => s + Number(d.montant || 0), 0);
                      const initial = (benef && benef[0]) ? benef[0].toUpperCase() : '?';
                      return (
                        <Fragment key={benef}>
                          <div className={`dn-row ${isOpen ? 'dn-row--open' : ''}`} onClick={() => setOpenBenef(isOpen ? null : benef)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpenBenef(isOpen ? null : benef); }} style={{ animationDelay: `${idx * 0.04}s` }}>
                            <div className="dn-row__avatar" style={{ '--ai': idx }}>{initial}</div>
                            <div className="dn-row__main">
                              <div className="dn-row__name" title={benef}>{benef}</div>
                              <div className="dn-row__count">{dons.length} {t('dashboardDonor.don_count')}</div>
                            </div>
                            <div className="dn-row__total">{total.toFixed(2)} DT</div>
                            <div className={`dn-row__chevron ${isOpen ? 'dn-row__chevron--open' : ''}`} aria-hidden><IconChevron /></div>
                          </div>
                          {isOpen && (
                            <div className="dn-expand" role="region" aria-label={`Détails pour ${benef}`}>
                              {dons.map((d) => {
                                const done = Number(d.montant_restant || 0) === 0;
                                return (
                                  <div key={d.id ?? `${d.created_at}-${d.montant}`} className="dn-expand__row">
                                    <span className="dn-expand__amount"><IconMoney /> <strong>{Number(d.montant || 0).toFixed(2)} DT</strong></span>
                                    <span className="dn-expand__date"><IconCalendar /> {formatDateFr(d.created_at || d.date || d.date_don)}</span>
                                    <span className={`dn-status ${done ? 'dn-status--done' : 'dn-status--pending'}`}>{done ? (<><IconCheck /> {t('dashboardDonor.status_completed')}</>) : (<><IconClock /> {t('dashboardDonor.status_pending')}</>)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </Fragment>
                      );
                    })}
                  </div>
                ) : (
                  <div className="dn-empty">
                    <div className="dn-empty__icon">🎁</div>
                    <div className="dn-empty__title">{t('dashboardDonor.empty_donations_title')}</div>
                    <p>{t('dashboardDonor.empty_donations_text')}</p>
                    <button className="dn-btn dn-btn--primary" onClick={handleGoAssociations}>{t('dashboardDonor.btn_make_donation')}</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= MESSAGES ================= */}
          {activeTab === 'messages' && (
            <div className="dn-page">
              <div className="dn-header">
                <div>
                  <h1 className="dn-title">{t('dashboardDonor.tab_messages_title')}</h1>
                  <p className="dn-sub">{t('dashboardDonor.tab_messages_sub')}</p>
                </div>
                <span className="dn-badge dn-badge--lg">{filteredMessages.length} {t('dashboardDonor.msg_count')}</span>
              </div>
              {filteredMessages.length > 0 ? (
                <div className="dn-msg-list">
                  {filteredMessages.map((msg, idx) => (
                    <div key={msg.id} className="dn-msg-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                      <div className="dn-msg-card__left">
                        <div className="dn-msg-card__avatar">{(msg.beneficiaire_nom?.[0] || '?').toUpperCase()}</div>
                      </div>
                      <div className="dn-msg-card__body">
                        <div className="dn-msg-card__top">
                          <div>
                            <span className="dn-msg-card__name">{msg.beneficiaire_nom} {msg.beneficiaire_prenom}</span>
                            <span className="dn-msg-card__date">{formatDateFr(msg.created_at)}</span>
                          </div>
                          <span className="dn-msg-card__amount">{Number(msg.montant || 0).toFixed(2)} DT</span>
                        </div>
                        {editingMessageId === msg.id ? (
                          <div className="dn-edit">
                            <textarea className="dn-textarea" value={editedMessageText} onChange={(e) => setEditedMessageText(e.target.value)} maxLength={250} placeholder="Votre message..." disabled={messageSaving} autoFocus />
                            <div className="dn-edit__actions">
                              <button className="dn-btn dn-btn--success dn-btn--sm" onClick={() => updateMessage(msg.id, editedMessageText)} disabled={messageSaving || !editedMessageText.trim()}><Check size={13} /> {t('dashboardDonor.btn_save_msg')}</button>
                              <button className="dn-btn dn-btn--ghost dn-btn--sm" onClick={() => setEditingMessageId(null)} disabled={messageSaving}>{t('dashboardDonor.btn_cancel')}</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="dn-msg-card__text">"{msg.message}"</p>
                            <div className="dn-msg-card__actions">
                              <button className="dn-icon-btn" title={t('common.edit')} onClick={() => { setEditingMessageId(msg.id); setEditedMessageText(msg.message || ''); }} disabled={messageSaving}><Edit2 size={14} /></button>
                              <button className="dn-icon-btn dn-icon-btn--danger" title={t('common.delete')} onClick={() => deleteMessage(msg.id)} disabled={messageSaving}><Trash2 size={14} /></button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dn-empty dn-empty--page">
                  <div className="dn-empty__icon">💬</div>
                  <div className="dn-empty__title">{t('dashboardDonor.empty_messages_title')}</div>
                  <p>{t('dashboardDonor.empty_messages_text')}</p>
                  <button className="dn-btn dn-btn--primary" onClick={handleGoAssociations}>{t('dashboardDonor.btn_msg_donate')}</button>
                </div>
              )}
            </div>
          )}

          {/* ================= AUTRES TABS ================= */}
          {activeTab !== 'compte' && activeTab !== 'dons' && activeTab !== 'messages' && activeTab !== 'password' && activeTab !== 'certificat' && (
            <>
              <section className="admin-card">
                {/* MON CARD */}
                {activeTab === 'card' && (
                  <div className="donor-card-wrap">
                    {profileLoading ? (
                      <div className="admin-loading">{t('common.loading')}...</div>
                    ) : (
                      <div className="donor-card">
                        <div className="donor-card__header">
                          <div className="donor-card__brand">DON'AC<span>T</span></div>
                          <div className="donor-card__avatar-wrap"><div className="donor-card__avatar-placeholder">{initials}</div></div>
                          <h2 className="donor-card__name">{profile?.nom || user?.nom || '—'}</h2>
                          <span className="donor-card__role-pill">{t('dashboardDonor.tab_card_role')}</span>
                        </div>
                        <div className="donor-card__stats-block">
                          <div className="donor-card__stats-row">
                            <div className="donor-card__stat"><span className="stat-label">{t('dashboardDonor.card_stat_total')}</span><span className="stat-value stat-value--accent">{donsSummary.totalDonated.toFixed(0)}<span className="stat-sub"> DT</span></span></div>
                            <div className="donor-card__divider" />
                            <div className="donor-card__stat"><span className="stat-label">{t('dashboardDonor.card_stat_count')}</span><span className="stat-value">{donsSummary.count}<span className="stat-sub"> {t('dashboardDonor.card_stat_times')}</span></span></div>
                          </div>
                          <div className="donor-card__engagement-bar"><div className="donor-card__engagement-fill" style={{ width: `${Math.min(donsSummary.count * 10, 100)}%` }} /></div>
                          <div className="donor-card__badges">
                            {donsSummary.count >= 1 && <span className="badge badge--bronze">{t('dashboardDonor.badge_new')}</span>}
                            {donsSummary.count >= 5 && <span className="badge badge--silver">{t('dashboardDonor.badge_active')}</span>}
                            {donsSummary.count >= 10 && <span className="badge badge--gold">{t('dashboardDonor.badge_generous')}</span>}
                          </div>
                        </div>
                        <div className="donor-card__info-grid">
                          <div className="donor-card__info-item donor-card__info-item--full"><span className="info-label">📧 Email</span><span className="info-value">{profile?.email || user?.email || '—'}</span></div>
                          <div className="donor-card__info-item donor-card__info-item--full">
                            <span className="info-label">💳 {t('dashboardDonor.label_bank')}</span>
                            <span className="info-value info-value--mono">{profile?.numero_bancaire ? `**** **** **** ${String(profile.numero_bancaire).slice(-4)}` : '—'}</span>
                            {profile?.numero_bancaire && <span className="info-hint">•••• masqué pour sécurité</span>}
                          </div>
                          <div className="donor-card__info-item"><span className="info-label">{t('dashboardDonor.label_status')}</span><span className="info-value info-value--success">● {t('dashboardDonor.status_active')}</span></div>
                        </div>
                        <div className="donor-card__footer"><span>{t('dashboardDonor.card_footer')}</span><span className="footer-brand">DON'ACT</span></div>
                      </div>
                    )}
                  </div>
                )}

                {/* ASSOCIATIONS */}
              {activeTab === 'associations' && (
  <div className="ac-page">
    <div className="ac-page__head">
      <div>
        <h1 className="ac-page__title">{t('dashboardDonor.tab_assoc_title')}</h1>
        <p className="ac-page__sub">{t('dashboardDonor.tab_assoc_sub')}</p>
      </div>
      <div className="ac-search-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder={t('dashboardDonor.assoc_search_ph')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="ac-search-bar__clear" onClick={() => setSearch('')}>×</button>
        )}
      </div>
    </div>

    {filteredAssociations.length === 0 ? (
      <div className="ac-empty">
        <div className="ac-empty__icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <p>{t('dashboardDonor.assoc_empty')}</p>
      </div>
    ) : (
      <div className="ac-grid">
        {filteredAssociations.map((a, i) => {
          const meta = CATEGORY_META[normalize(a.categorie)] || {
            label: a.categorie || 'Autre',
            emoji: '❤️',
          };
          const logoUrl = a.logo ? `${UPLOADS}/${a.logo}` : '';
          const colors = ['#6c63ff','#4ecdc4','#ff6b6b','#ffd93d','#6bcb77','#4d96ff'];
          const accent = colors[i % colors.length];

          const score       = Number(a.score_impact) || 0;
          const rang        = a.rang ?? null;
          const categorieIa = a.categorie_ia || 'Non évalué';
          const nbBenef     = Number(a.nb_beneficiaires) || Number(a.beneficiaries_count) || 0;
          const nbDons      = Number(a.nb_dons) || 0;
          const montant     = Number(a.montant_total_collecte) || 0;

          const scoreBarWidth = Math.min(Math.max(score, 0), 100);
          const scoreBadgeColor =
            score >= 75 ? '#22c55e' :
            score >= 45 ? '#f59e0b' :
            '#ef4444';

          return (
            <button
              key={a.id}
              className="ac-card"
              style={{ '--card-accent': accent }}
              onClick={() => handleAssocClick(a)}
            >
              {/* ── BANNER ── */}
              <div className="ac-card__banner">
                {logoUrl
                  ? <img src={logoUrl} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  : <div className="ac-card__bannerFallback">{meta.emoji}</div>
                }
                <div className="ac-card__overlay" />
                <span className="ac-card__pill">{meta.emoji} {meta.label}</span>
                {rang !== null && (
                  <span className="ac-card__rangBadge">
                    {/* Trophy icon */}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C9.243 2 7 4.243 7 7v3H5a1 1 0 0 0-1 1v1c0 3.314 2.686 6 6 6v1H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-2v-1c3.314 0 6-2.686 6-6v-1a1 1 0 0 0-1-1h-2V7c0-2.757-2.243-5-5-5zm5 9H7v-2h10v2z"/>
                    </svg>
                    #{rang}
                  </span>
                )}
              </div>

              {/* ── BODY ── */}
              <div className="ac-card__body">
                <h3 className="ac-card__name">{a.nom}</h3>
                <p className="ac-card__desc">
                  {a.description || t('dashboardDonor.assoc_no_desc')}
                </p>

                {/* ── BLOC IA ── */}
                <div className="ac-card__ia">

                  {/* Header IA */}
                  <div className="ac-ia__header">
                    <span className="ac-ia__headerIcon">
                      {/* CPU / AI chip icon */}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="4" y="4" width="16" height="16" rx="2"/>
                        <rect x="9" y="9" width="6" height="6"/>
                        <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>
                      </svg>
                    </span>
                    <span className="ac-ia__headerTitle">Analyse IA</span>
                    <span className="ac-ia__categBadge">{categorieIa}</span>
                  </div>

                  {/* Score */}
                  <div className="ac-ia__scoreRow">
                    <div className="ac-ia__scoreLeft">
                      {/* Chart bar icon */}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="20" x2="18" y2="10"/>
                        <line x1="12" y1="20" x2="12" y2="4"/>
                        <line x1="6"  y1="20" x2="6"  y2="14"/>
                        <line x1="2"  y1="20" x2="22" y2="20"/>
                      </svg>
                      <span className="ac-ia__scoreLabel">Score d'impact</span>
                    </div>
                    <span className="ac-ia__scoreNum" style={{ color: scoreBadgeColor }}>
                      {score}<span className="ac-ia__scoreTotal">/100</span>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="ac-ia__bar">
                    <div
                      className="ac-ia__barFill"
                      style={{ width: `${scoreBarWidth}%`, background: scoreBadgeColor }}
                    />
                  </div>

                  {/* 3 stats */}
                  <div className="ac-ia__stats">

                    <div className="ac-ia__stat">
                      <span className="ac-ia__statIcon">
                        {/* Users icon */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                      </span>
                      <span className="ac-ia__statVal">{nbBenef}</span>
                      <span className="ac-ia__statLbl">Bénéficiaires</span>
                    </div>

                    <div className="ac-ia__statDivider" />

                    <div className="ac-ia__stat">
                      <span className="ac-ia__statIcon">
                        {/* Gift icon */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 12 20 22 4 22 4 12"/>
                          <rect x="2" y="7" width="20" height="5"/>
                          <line x1="12" y1="22" x2="12" y2="7"/>
                          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
                          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                        </svg>
                      </span>
                      <span className="ac-ia__statVal">{nbDons}</span>
                      <span className="ac-ia__statLbl">Dons</span>
                    </div>

                    <div className="ac-ia__statDivider" />

                    <div className="ac-ia__stat">
                      <span className="ac-ia__statIcon">
                        {/* Coin / currency icon */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 6v2m0 8v2M9.5 9.5A2.5 2.5 0 0 1 12 8h.5a2 2 0 0 1 0 4h-1a2 2 0 0 0 0 4h.5a2.5 2.5 0 0 0 2.5-2.5"/>
                        </svg>
                      </span>
                      <span className="ac-ia__statVal">{montant.toLocaleString('fr-TN')}</span>
                      <span className="ac-ia__statLbl">TND collecté</span>
                    </div>

                  </div>
                </div>

                {/* Contact */}
                <div className="ac-card__meta">
                  {a.telephone && (
                    <span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 5.55 5.55l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      {a.telephone}
                    </span>
                  )}
                  {a.email && (
                    <span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      {a.email}
                    </span>
                  )}
                </div>
              </div>

              {/* ── FOOTER ── */}
              <div className="ac-card__footer">
                <span className="ac-card__cta">
                  {t('dashboardDonor.assoc_cta')}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    )}
  </div>
)}

                {/* BENEFICIAIRES */}
                {activeTab === 'beneficiaires' && selectedAssoc && (
                  <div className="ac-page">
                    <div className="ac-page__head">
                      <div>
                        <button className="ac-back" onClick={() => setActiveTab('associations')}>← {t('dashboardDonor.sidebar_back_assoc')}</button>
                        <h1 className="ac-page__title">{selectedAssoc.nom}</h1>
                        <p className="ac-page__sub">{filteredBeneficiaires.length} {t('dashboardDonor.tab_benef_available')}</p>
                      </div>
                      <div className="ac-search-bar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input type="text" placeholder={t('dashboardDonor.benef_search_ph')} value={search} onChange={(e) => setSearch(e.target.value)} />
                      </div>
                    </div>
                    {filteredBeneficiaires.length === 0 ? (
                      <div className="ac-empty"><div className="ac-empty__icon">🎯</div><p>{t('dashboardDonor.benef_empty')}</p><button className="ac-btn ac-btn--ghost" onClick={() => setActiveTab('associations')}>{t('dashboardDonor.benef_btn_back')}</button></div>
                    ) : (
                      <div className="ac-benef-layout">
                        <div className="ac-benef-list">
                          {filteredBeneficiaires.map((b) => {
                            const pct = getProgressPercent(b);
                            const isSelected = donTarget?.id === b.id && donPanelOpen;
                            return (
                              <div key={b.id} className={`ac-benef-card ${isSelected ? 'ac-benef-card--selected' : ''}`}>
                                <div className="ac-benef-card__top">
                                  <div className="ac-benef-card__avatar">{(b.nom?.[0] || '?').toUpperCase()}</div>
                                  <div className="ac-benef-card__info">
                                    <div className="ac-benef-card__name">{b.nom} {b.prenom}</div>
                                    <div className="ac-benef-card__tags">
                                      {b.cin && <span className="ac-tag">🪪 {b.cin}</span>}
                                      {b.telephone && <span className="ac-tag">📞 {b.telephone}</span>}
                                    </div>
                                  </div>
                                  <span className={`ac-pct ${pct<=35?'ac-pct--low':pct<=65?'ac-pct--mid':'ac-pct--high'}`}>{pct.toFixed(0)}%</span>
                                </div>
                                <div className="ac-prog">
                                  <div className="ac-prog__track"><div className="ac-prog__fill" style={{ width: `${pct}%` }} /></div>
                                  <div className="ac-prog__labels">
                                    <span>{t('dashboardDonor.benef_collected')} {(Number(b.montant_a_collecter||0) - Number(b.montant_restant||0)).toFixed(0)} DT</span>
                                    <span className="ac-prog__target">{t('dashboardDonor.benef_target')} {b.montant_a_collecter} DT</span>
                                  </div>
                                </div>
                                <div className="ac-benef-card__amounts">
                                  <div className="ac-amount-box"><span>{t('dashboardDonor.benef_to_collect')}</span><strong>{b.montant_a_collecter} DT</strong></div>
                                  <div className="ac-amount-box ac-amount-box--accent"><span>{t('dashboardDonor.benef_remaining')}</span><strong>{b.montant_restant} DT</strong></div>
                                </div>
                                <button className={`ac-btn ac-btn--primary ac-btn--block ${isSelected ? 'ac-btn--selected' : ''}`} onClick={() => isSelected ? closeDonPanel() : openDonPanel(b)}>{isSelected ? t('dashboardDonor.btn_close_form') : t('dashboardDonor.btn_donate')}</button>
                              </div>
                            );
                          })}
                        </div>
                        <aside className={`ac-don-panel ${donPanelOpen && donTarget ? 'ac-don-panel--open' : ''}`}>
                          {!donPanelOpen || !donTarget ? (
                            <div className="ac-don-panel__idle"><div className="ac-don-panel__idle-icon">❤️</div><p>{t('dashboardDonor.don_panel_idle')}</p></div>
                          ) : (
                            <form className="ac-don-form" onSubmit={submitInlineDon}>
                              <div className="ac-don-form__head">
                                <div className="ac-don-form__avatar">{(donTarget.nom?.[0]||'?').toUpperCase()}</div>
                                <div>
                                  <div className="ac-don-form__title">{t('dashboardDonor.don_form_title')}</div>
                                  <div className="ac-don-form__name">{donTarget.nom} {donTarget.prenom}</div>
                                </div>
                                <button className="ac-don-form__close" type="button" onClick={closeDonPanel} disabled={donSubmitting}>×</button>
                              </div>
                              <div className="ac-don-mini-prog">
                                <div className="ac-don-mini-prog__top">
                                  <span>{t('dashboardDonor.don_progress')}</span>
                                  <span><strong>{getProgressPercent(donTarget).toFixed(0)}%</strong> — {Number(donTarget.montant_restant||0).toFixed(0)} DT {t('dashboardDonor.don_remaining')}</span>
                                </div>
                                <div className="ac-prog__track"><div className="ac-prog__fill" style={{ width: `${getProgressPercent(donTarget)}%` }} /></div>
                              </div>
                              {donError && <div className="ac-alert ac-alert--error">{donError}</div>}
                              {donSuccess && <div className="ac-alert ac-alert--success">{donSuccess}</div>}
                              <div className="ac-don-section">
                                <div className="ac-don-label">{t('dashboardDonor.don_label_quick')}</div>
                                <div className="ac-quick-amounts">
                                  {QUICK_AMOUNTS.map((a) => (
                                    <button key={a} type="button" className={`ac-qa-btn ${String(a)===String(donMontant)?'ac-qa-btn--active':''}`} onClick={() => setDonMontant(String(a))} disabled={donSubmitting}>{a} DT</button>
                                  ))}
                                </div>
                              </div>
                              <div className="ac-don-section">
                                <div className="ac-don-label">{t('dashboardDonor.don_label_custom')}</div>
                                <div className="ac-input-wrap">
                                  <input className="ac-input" type="number" min="1" value={donMontant} onChange={(e) => setDonMontant(e.target.value)} placeholder="0" disabled={donSubmitting} />
                                  <span className="ac-input-suffix">DT</span>
                                </div>
                              </div>
                              <div className="ac-don-section">
                                <div className="ac-don-label">{t('dashboardDonor.don_label_bank')}</div>
                                <input className="ac-input ac-mono" type="text" value={donNumeroBancaire} onChange={(e) => setDonNumeroBancaire(e.target.value)} placeholder="XXXX XXXX XXXX XXXX" disabled={donSubmitting} />
                              </div>
                              <div className="ac-don-section">
                                <div className="ac-don-label">{t('dashboardDonor.don_label_msg')} <span className="ac-don-label__opt">{t('dashboardDonor.don_msg_opt')}</span></div>
                                <input className="ac-input" type="text" value={donMessage} onChange={(e) => setDonMessage(e.target.value)} placeholder={t('dashboardDonor.don_msg_ph')} maxLength={250} disabled={donSubmitting} />
                              </div>
                              <button className="ac-btn ac-btn--primary ac-btn--block ac-btn--lg" type="submit" disabled={donSubmitting || !donMontant}>
                                {donSubmitting ? <><span className="ac-spinner" /> {t('dashboardDonor.btn_processing')}</> : ` ${t('dashboardDonor.btn_confirm_don').replace('le don', donMontant+' DT')}`}
                              </button>
                              <div className="ac-don-secure">{t('dashboardDonor.don_secure')}</div>
                            </form>
                          )}
                        </aside>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
export default DashboardDonneur;