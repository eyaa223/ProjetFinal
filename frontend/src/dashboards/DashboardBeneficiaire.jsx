import { useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './DashboardBeneficiaire.css';
import { useTranslation } from 'react-i18next'; // Import du hook

import { IdCard, HandHeart, LogOut, MessageSquare, Lock } from 'lucide-react';
import {
  Mail,
  Phone,
  Calendar,
  User,
  Users,
  MapPin,
  Building2,
  FileText,
  CheckCircle
} from "lucide-react";

const API_BASE = 'http://localhost:5000';

const DashboardBeneficiaire = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(); // Hook de traduction

  // ✅ Tabs: card | donations | messages | compte (security)
  const [activeTab, setActiveTab] = useState('donations');

  const [donations, setDonations] = useState([]);
  const [summary, setSummary] = useState({
    total_collecte: 0,
    montant_restant: null,
    montant_a_collecter: null,
  });
  
  // Password States
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [donationsLoading, setDonationsLoading] = useState(false);
  const [donationsError, setDonationsError] = useState('');

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [openDon, setOpenDon] = useState(null);

  const [profile, setProfile] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    description: '',
    cin: '',
    date_naissance: '',
    genre: '',
    situation_familiale: '',
    association_id: null,
    association_nom: '',
  });
  
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'beneficiaire') {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  const initials = useMemo(() => {
    const a = (user?.nom || 'B').toString().trim()[0] || 'B';
    const b = (user?.prenom || '').toString().trim()[0] || '';
    return (a + b).toUpperCase();
  }, [user?.nom, user?.prenom]);

  const fullName = useMemo(() => {
    return `${profile?.nom || user?.nom || ''} ${profile?.prenom || user?.prenom || ''}`.trim();
  }, [profile?.nom, profile?.prenom, user?.nom, user?.prenom]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const groupedDonations = useMemo(() => {
    const map = new Map();

    donations.forEach((d) => {
      const key = d.donneur_id || d.donneur_nom;

      if (!map.has(key)) {
        map.set(key, {
          donneur_id: key,
          donneur_nom: d.donneur_nom || 'Donneur',
          dons: [],
          total: 0,
        });
      }

      const entry = map.get(key);
      entry.dons.push(d);
      entry.total += Number(d.montant || 0);
    });

    return Array.from(map.values());
  }, [donations]);

  const authHeader = useMemo(() => {
    if (!user?.token) return {};
    return { Authorization: `Bearer ${user.token}` };
  }, [user?.token]);

  const fetchDonations = useCallback(async () => {
    if (!user?.token) return;

    setDonationsLoading(true);
    setDonationsError('');

    try {
      const res = await axios.get(`${API_BASE}/beneficiaire/donations`, {
        headers: authHeader,
      });

      const payload = res.data;

      const list = Array.isArray(payload?.donations)
        ? payload.donations
        : Array.isArray(payload)
          ? payload
          : [];

      setDonations(list);

      if (payload?.summary) {
        setSummary({
          total_collecte: Number(payload?.summary?.total_collecte || 0),
          montant_restant:
            payload?.summary?.montant_restant === null || payload?.summary?.montant_restant === undefined
              ? null
              : Number(payload.summary.montant_restant),
          montant_a_collecter:
            payload?.summary?.montant_a_collecter === null || payload?.summary?.montant_a_collecter === undefined
              ? null
              : Number(payload.summary.montant_a_collecter),
        });
      } else {
        const total = list.reduce((s, d) => s + Number(d?.montant || 0), 0);
        setSummary((prev) => ({ ...prev, total_collecte: total }));
      }
    } catch (err) {
      console.error('[DashboardBeneficiaire] fetchDonations error', err);
      setDonationsError(err.response?.data?.message || t('common.error_loading_donations'));
      setDonations([]);
    } finally {
      setDonationsLoading(false);
    }
  }, [authHeader, user?.token, t]);

  const fetchMyProfile = useCallback(async () => {
    if (!user?.token) return;

    setProfileLoading(true);
    setProfileError('');

    try {
      const res = await axios.get(`${API_BASE}/beneficiaire/me`, {
        headers: authHeader,
      });

      setProfile({
        nom: res.data?.nom || '',
        prenom: res.data?.prenom || '',
        email: res.data?.email || '',
        telephone: res.data?.telephone || '',
        adresse: res.data?.adresse || '',
        description: res.data?.description || '',
        cin: res.data?.cin || '',
        date_naissance: res.data?.date_naissance ? String(res.data.date_naissance).slice(0, 10) : '',
        genre: res.data?.genre || '',
        situation_familiale: res.data?.situation_familiale || '',
        association_id: res.data?.association_id ?? null,
        association_nom: res.data?.association_nom || '',
      });
    } catch (err) {
      console.error('[DashboardBeneficiaire] fetchMyProfile error', err);
      setProfileError(err.response?.data?.message || t('common.error_loading_profile'));
    } finally {
      setProfileLoading(false);
    }
  }, [authHeader, user?.token, t]);

  useEffect(() => {
    if (!user?.token) return;
    fetchMyProfile();
  }, [user?.token, fetchMyProfile]);

  useEffect(() => {
    if (!user?.token) return;
    if (activeTab === 'donations' || activeTab === 'messages') fetchDonations();
    if (activeTab === 'card') fetchMyProfile();
  }, [activeTab, fetchDonations, fetchMyProfile, user?.token]);

  const isCollected = summary.montant_restant !== null && summary.montant_restant <= 0;

  const messages = useMemo(() => {
    return (donations || [])
      .filter((d) => String(d?.message || '').trim().length > 0)
      .map((d) => ({
        id: d.id,
        donneur_nom: (d.donneur_nom || 'Donneur').trim() || 'Donneur',
        message: String(d.message).trim(),
        created_at: d.created_at
      }));
  }, [donations]);

  const changePassword = async () => {
    if (!user?.token) return;

    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError(t('dashboardBenef.pwd_error_required'));
      return;
    }

    if (passwordData.newPassword.length < 4) {
      setPasswordError(t('dashboardBenef.pwd_error_short'));
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError(t('dashboardBenef.pwd_error_mismatch'));
      return;
    }

    try {
      setPasswordLoading(true);

      const res = await axios.put(
        `${API_BASE}/beneficiaire/me/password`,
        {
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword
        },
        { headers: authHeader }
      );

      setPasswordSuccess(res.data.message || t('dashboardBenef.pwd_success'));

      setPasswordData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

    } catch (err) {
      setPasswordError(err.response?.data?.message || t('common.error_server'));
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="ben-page" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="ben-shell">
        <aside className="ben-sidebar">
          <div className="ben-brand">
            <div className="ben-brand__logo">DA</div>
            <div className="ben-brand__text">
              <div className="ben-brand__title">DON’ACT</div>
              <div className="ben-brand__sub">{t('common.beneficiary_space')}</div>
            </div>
          </div>

          <nav className="ben-nav ben-nav--icons">
            <button
              className={`ben-nav__item ${activeTab === 'card' ? 'is-active' : ''}`}
              type="button"
              onClick={() => setActiveTab('card')}
            >
              <IdCard className="nav-ic" />
              <span>{t('dashboardBenef.sidebar_card')}</span>
            </button>

            <button
              className={`ben-nav__item ${activeTab === 'donations' ? 'is-active' : ''}`}
              type="button"
              onClick={() => setActiveTab('donations')}
            >
              <HandHeart className="nav-ic" />
              <span>{t('dashboardBenef.sidebar_donors')}</span>
            </button>
            
            <button
              className={`ben-nav__item ${activeTab === 'compte' ? 'is-active' : ''}`}
              type="button"
              onClick={() => setActiveTab('compte')}
            >
              <Lock className="nav-ic" />
              <span>{t('dashboardBenef.sidebar_security')}</span>
            </button>

            <button
              className={`ben-nav__item ${activeTab === 'messages' ? 'is-active' : ''}`}
              type="button"
              onClick={() => setActiveTab('messages')}
            >
              <MessageSquare className="nav-ic" />
              <span>{t('dashboardBenef.sidebar_messages')}</span>
            </button>
          </nav>

          <div className="ben-sidebar__footer">
            <div className="ben-user">
              <div className="ben-user__avatar">{initials}</div>
              <div className="ben-user__meta">
                <div className="ben-user__name">
                  {user.nom} {user.prenom}
                </div>
                <div className="ben-user__role">{user.email}</div>
              </div>
            </div>

            <button className="btn btn--danger btn--block btn--withIcon" type="button" onClick={handleLogout}>
              <LogOut className="btn-ic" />
              <span>{t('dashboardBenef.sidebar_logout')}</span>
            </button>
          </div>
          
        </aside>

        <main className="ben-main">
          {/* =======================
              CARD (Profil)
          ======================= */}
       {activeTab === 'card' && (
  <div className="donor-card-wrap">
    {profileLoading ? (
      <div className="admin-loading">{t('common.loading')}...</div>
    ) : profileError ? (
      <div className="ben-alert ben-alert--danger">{profileError}</div>
    ) : (
      <div className="donor-card">

        <div className="donor-card__header">
          <div className="donor-card__brand">DON'AC<span>T</span></div>

          <div className="donor-card__avatar-wrap">
            <div className="donor-card__avatar-placeholder">
              {initials}
            </div>
          </div>

          <h2 className="donor-card__name">
            {fullName || '—'}
          </h2>

          <span className="donor-card__role-pill">
            {t('dashboardBenef.card_role')}
          </span>
        </div>

        <div className="donor-card__info-grid">

          <div className="donor-card__info-item donor-card__info-item--full">
            <span className="info-label">
              <Mail size={14} /> {t('dashboardBenef.label_email')}
            </span>
            <span className="info-value">
              {profile?.email || user?.email || '—'}
            </span>
          </div>

          <div className="donor-card__info-item">
            <span className="info-label">
              <Phone size={14} /> {t('dashboardBenef.label_phone')}
            </span>
            <span className="info-value">
              {profile?.telephone || '—'}
            </span>
          </div>

          <div className="donor-card__info-item">
            <span className="info-label">
              <IdCard size={14} /> {t('dashboardBenef.label_cin')}
            </span>
            <span className="info-value">
              {profile?.cin || '—'}
            </span>
          </div>

          <div className="donor-card__info-item">
            <span className="info-label">
              <Calendar size={14} /> {t('dashboardBenef.label_birthdate')}
            </span>
            <span className="info-value">
              {profile?.date_naissance || '—'}
            </span>
          </div>

          <div className="donor-card__info-item">
            <span className="info-label">
              <User size={14} /> {t('dashboardBenef.label_gender')}
            </span>
            <span className="info-value">
              {profile?.genre || '—'}
            </span>
          </div>

          <div className="donor-card__info-item">
            <span className="info-label">
              <Users size={14} /> {t('dashboardBenef.label_situation')}
            </span>
            <span className="info-value">
              {profile?.situation_familiale || '—'}
            </span>
          </div>

          <div className="donor-card__info-item donor-card__info-item--full">
            <span className="info-label">
              <MapPin size={14} /> {t('dashboardBenef.label_address')}
            </span>
            <span className="info-value">
              {profile?.adresse || '—'}
            </span>
          </div>

          <div className="donor-card__info-item donor-card__info-item--full">
            <span className="info-label">
              <Building2 size={14} /> {t('dashboardBenef.label_association')}
            </span>
            <span className="info-value">
              {profile?.association_nom || '—'}
            </span>
          </div>

          <div className="donor-card__info-item donor-card__info-item--full">
            <span className="info-label">
              <FileText size={14} /> {t('dashboardBenef.label_description')}
            </span>
            <span className="info-value">
              {profile?.description?.trim()
                ? profile.description
                : '—'}
            </span>
          </div>

          <div className="donor-card__info-item">
            <span className="info-label">
              <CheckCircle size={14} /> {t('dashboardBenef.label_status')}
            </span>
            <span className="info-value info-value--success">
              {t('dashboardBenef.status_active')}
            </span>
          </div>

        </div>

        <div className="donor-card__footer">
          <span>{t('dashboardBenef.card_footer')}</span>
          <span className="footer-brand">DON'ACT</span>
        </div>

      </div>
    )}
  </div>
)}

     {activeTab === 'compte' && (
  <div className="pwd-container">

    {/* HEADER */}
    <div className="pwd-header">
      <div className="pwd-security-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      </div>

      <h2>{t('dashboardBenef.pwd_title')}</h2>
      <p>{t('dashboardBenef.pwd_sub')}</p>
    </div>

    {/* FORM */}
    <div className="pwd-form">

      {/* OLD PASSWORD */}
      <div className="pwd-field">
        <label>{t('dashboardBenef.pwd_old')}</label>
        <div className="pwd-input-wrap">
          <input
            type={showOldPassword ? "text" : "password"}
            value={passwordData.oldPassword}
            onChange={(e) =>
              setPasswordData(prev => ({
                ...prev,
                oldPassword: e.target.value
              }))
            }
          />
          <button type="button" onClick={() => setShowOldPassword(!showOldPassword)}>
            {showOldPassword ? "🙈" : "👁️"}
          </button>
        </div>
      </div>

      {/* NEW PASSWORD */}
      <div className="pwd-field">
        <label>{t('dashboardBenef.pwd_new')}</label>
        <div className="pwd-input-wrap">
          <input
            type={showNewPassword ? "text" : "password"}
            value={passwordData.newPassword}
            onChange={(e) =>
              setPasswordData(prev => ({
                ...prev,
                newPassword: e.target.value
              }))
            }
          />
          <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}>
            {showNewPassword ? "🙈" : "👁️"}
          </button>
        </div>
      </div>

      {/* CONFIRM PASSWORD */}
      <div className="pwd-field">
        <label>{t('dashboardBenef.pwd_confirm')}</label>
        <div className="pwd-input-wrap">
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={passwordData.confirmPassword}
            onChange={(e) =>
              setPasswordData(prev => ({
                ...prev,
                confirmPassword: e.target.value
              }))
            }
          />
          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
            {showConfirmPassword ? "🙈" : "👁️"}
          </button>
        </div>

        {/* VALIDATION */}
        {passwordData.confirmPassword &&
          passwordData.confirmPassword !== passwordData.newPassword && (
            <span className="pwd-error">
              {t('dashboardBenef.pwd_error_mismatch')}
            </span>
        )}
      </div>

      {/* GLOBAL ERROR */}
      {passwordError && (
        <div className="pwd-error">{passwordError}</div>
      )}

      {/* SUCCESS */}
      {passwordSuccess && (
        <div className="pwd-success">{passwordSuccess}</div>
      )}

      {/* BUTTON */}
      <button
        className="pwd-btn-save"
        onClick={changePassword}
        disabled={
          !passwordData.oldPassword ||
          !passwordData.newPassword ||
          !passwordData.confirmPassword ||
          passwordData.newPassword !== passwordData.confirmPassword ||
          passwordLoading
        }
      >
        {passwordLoading ? t('dashboardBenef.pwd_btn_loading') : t('dashboardBenef.pwd_btn_update')}
      </button>

    </div>
  </div>
)}

          {/* =======================
              DONATIONS
          ======================= */}
         {activeTab === 'donations' && (
  <>
    <div className="ben-topbar">
      <h1 className="ben-title">{t('dashboardBenef.donors_title')}</h1>
      <p className="ben-subtitle">{t('dashboardBenef.donors_subtitle')}</p>
    </div>

    <div className="dn-kpis">
      <div className="dn-kpi"><div className="dn-kpi__label">{t('dashboardBenef.kpi_collected')}</div><div className="dn-kpi__value">{summary.total_collecte.toFixed(2)} DT</div></div>
      <div className="dn-kpi"><div className="dn-kpi__label">{t('dashboardBenef.kpi_target')}</div><div className="dn-kpi__value">{summary.montant_a_collecter === null ? '—' : `${summary.montant_a_collecter.toFixed(2)} DT`}</div></div>
      <div className="dn-kpi"><div className="dn-kpi__label">{t('dashboardBenef.kpi_remaining')}</div><div className="dn-kpi__value">{summary.montant_restant === null ? '—' : `${summary.montant_restant.toFixed(2)} DT`}</div></div>
      <div className="dn-kpi"><div className="dn-kpi__label">{t('dashboardBenef.kpi_count')}</div><div className="dn-kpi__value">{donations.length}</div></div>
    </div>

    {isCollected && <div className="dn-collected">{t('dashboardBenef.alert_goal_reached')}</div>}

    <div className="dn-card">
      <div className="dn-card__head">
        <div>
          <p className="dn-card__title">{t('dashboardBenef.donations_card_title')}</p>
          <p className="dn-card__desc">{t('dashboardBenef.donations_card_desc')}</p>
        </div>
        <div className="dn-pill">{donationsLoading ? t('dashboardBenef.donations_loading') : t('dashboardBenef.donations_count').replace('{count}', groupedDonations.length)}</div>
      </div>

      {donationsError && <div className="dn-alert">{donationsError}</div>}

      {!donationsLoading && !donationsError && donations.length === 0 && (
        <div className="dn-empty">
          <div className="dn-empty__title">{t('dashboardBenef.empty_donations_title')}</div>
          <div className="dn-empty__text">{t('dashboardBenef.empty_donations_text')}</div>
        </div>
      )}

      <div className="dn-donor-grid">
        {groupedDonations.map((d) => {
          const initials = d.donneur_nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
          const isOpen = openDon === d.donneur_id;
          return (
            <div key={d.donneur_id} className="dn-donor-card" onClick={() => setOpenDon(isOpen ? null : d.donneur_id)}>
              <div className="dn-donor-row">
                <div className="dn-avatar">{initials}</div>
                <div className="dn-donor-info">
                  <div className="dn-donor-name">{d.donneur_nom}</div>
                  <div className="dn-donor-count">{d.dons.length} {t('dashboardBenef.donor_donations')}</div>
                </div>
                <div className="dn-amount">{d.total.toFixed(2)} DT</div>
                <div className={`dn-chevron${isOpen ? ' open' : ''}`}>▼</div>
              </div>
              {isOpen && (
                <div className="dn-details">
                  {d.dons.map((don, i) => (
                    <div key={i} className="dn-detail-row">
                      <span className="dn-detail-amount">{Number(don.montant).toFixed(2)} DT</span>
                      <span className="dn-detail-date">{don.created_at ? new Date(don.created_at).toLocaleString(i18n.language === 'ar' ? 'ar-TN' : 'fr-FR') : '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  </>
)}
          
          {/* =======================
              MESSAGES
          ======================= */}
         {activeTab === 'messages' && (
  <>
    <div className="ben-topbar">
      <h1 className="ben-title">{t('dashboardBenef.messages_title')}</h1>
      <p className="ben-subtitle">{t('dashboardBenef.messages_subtitle')}</p>
    </div>

    <div className="msg-card">
      <div className="msg-head">
        <div className="msg-head-left">
          <h2>{t('dashboardBenef.messages_head_title')}</h2>
          <p>{t('dashboardBenef.messages_head_sub')}</p>
        </div>
        <div className="msg-pill">
          {donationsLoading ? t('dashboardBenef.donations_loading') : t('dashboardBenef.messages_count').replace('{count}', messages.length)}
        </div>
      </div>

      {donationsError && <div className="dn-alert">{donationsError}</div>}

      {!donationsLoading && !donationsError && messages.length === 0 && (
        <div className="msg-empty">
          <div className="msg-empty-icon">💬</div>
          <div className="msg-empty-title">{t('dashboardBenef.empty_messages_title')}</div>
          <div className="msg-empty-text">{t('dashboardBenef.empty_messages_text')}</div>
        </div>
      )}

      <div className="msg-list">
        {messages.map((m) => {
          const initials = m.donneur_nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
          return (
            <div key={m.id} className="msg-item">
              <div className="msg-item-top">
                <div className="msg-avatar-row">
                  <div className="msg-avatar">{initials}</div>
                  <div>
                    <div className="msg-name">{m.donneur_nom}</div>
                    {m.created_at && (
                      <div className="msg-date">
                        {new Date(m.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-TN' : 'fr-FR')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="msg-reactions">
                  
                </div>
              </div>
              <div className="msg-text">{m.message}</div>
            </div>
          );
        })}
      </div>
    </div>
  </>
)}
        </main>
      </div>
    </div>
  );
};

export default DashboardBeneficiaire;