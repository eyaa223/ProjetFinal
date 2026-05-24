import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import {
  Mail, Phone, MapPin, Tag, FileText, Share2, Copy, Check, Calendar, ShieldCheck, AlertCircle, ArrowLeft,
  Users, Heart, TrendingUp, ExternalLink, Globe, 
} from 'lucide-react';
import './AssociationDetailsPage.css';
import { useTranslation } from 'react-i18next';

const API_BASE = 'http://192.168.1.21:5000';

const AssociationDetailsPage = () => {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  
  const [assoc, setAssoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('infos');

  // Fetch uniquement l'association demandée via l'endpoint by-ID
  useEffect(() => {
    if (!id) return;
    
    (async () => {
      try {
        setLoading(true); 
        setError('');
        
        // Utiliser l'endpoint par ID qui inclut beneficiaries_count et don_count
        const res = await axios.get(`${API_BASE}/associations/public/${id}`);
        setAssoc(res.data);
        
      } catch (err) {
        console.error('Erreur fetch association details:', err);
        setError(err.response?.status === 404 
          ? t('associationDetails.not_found') 
          : t('associationDetails.error_loading')
        );
      } finally { 
        setLoading(false); 
      }
    })();
  }, [id, t]);

  const qrValue = assoc 
    ? `${window.location.origin}/association/${assoc.id}\n\n${assoc.nom}\n${assoc.email || ''}` 
    : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (e) { console.error(e); }
  };

  /* Loading State */
  if (loading) return (
    <div className="adp adp-center">
      <div className="adp-spinner" />
      <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>{t('common.loading')}...</p>
    </div>
  );

  /* Error State */
  if (error || !assoc) return (
    <div className="adp adp-center">
      <AlertCircle size={48} className="adp-error-icon" />
      <p className="adp-error-title">{error || t('associationDetails.not_found')}</p>
      <button className="adp-btn adp-btn-primary" style={{ marginTop: 8, background: 'var(--accent)', color: '#fff' }}
        onClick={() => window.history.back()}>
        <ArrowLeft size={15} /> {t('common.back')}
      </button>
    </div>
  );

  const hasLogo = assoc.logo && !imageError;
  const initial = String(assoc.nom || 'A')[0].toUpperCase();
  const isActive = !assoc.blocked;
  
  // ✅ CORRECTION : Utiliser don_count (nombre de dons) depuis l'API
  const memberCount = Number(assoc.beneficiaries_count || 0);
  const donCount = Number(assoc.don_count || 0);  // ← NOMBRE de dons (pas montant)
  const cotisCount = Number(assoc.nb_cotisations || 0);
  const cotisRatio = memberCount ? Math.min(100, Math.round((cotisCount / memberCount) * 100)) : 0;

  const tabs = [
    { id: 'infos', label: t('associationDetails.tab_infos'), icon: <FileText size={14} /> },
    { id: 'description', label: t('associationDetails.tab_description'), icon: <Globe size={14} /> },
    { id: 'cotisations', label: t('associationDetails.tab_contributions'), icon: <TrendingUp size={14} /> },
  ];

  return (
    <div className="adp" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>

      {/* Back Button */}
      <button className="adp-back" onClick={() => window.history.back()}>
        <ArrowLeft size={14} /> {t('associationDetails.btn_back')}
      </button>

      {/* ── Hero Section ── */}
      <section className="adp-hero">
        <div className="adp-hero-noise" />
        <div className="adp-hero-ring adp-hero-ring-1" />
        <div className="adp-hero-ring adp-hero-ring-2" />

        <div className="adp-hero-inner">
          {/* Avatar */}
          <div className="adp-avatar">
            {hasLogo
              ? <img src={`${API_BASE}/upload/${assoc.logo}`} alt={assoc.nom} onError={() => setImageError(true)} />
              : <span className="adp-avatar-initial">{initial}</span>}
            <span className={`adp-avatar-dot ${isActive ? 'active' : 'blocked'}`} />
          </div>

          {/* Text Info */}
          <div className="adp-hero-text">
            <div className="adp-hero-verified">
              <ShieldCheck size={12} /> {t('associationDetails.hero_verified')}
            </div>
            <h1 className="adp-hero-name">{assoc.nom}</h1>
            <p className="adp-hero-desc">
              {(assoc.description || t('associationDetails.hero_default_desc')).slice(0, 140)}
              {(assoc.description || '').length > 140 ? '…' : ''}
            </p>
            <div className="adp-hero-chips">
              <span className={`adp-chip ${isActive ? 'status-active' : 'status-blocked'}`}>
                {isActive ? t('associationDetails.hero_status_active') : t('associationDetails.hero_status_inactive')}
              </span>
              {assoc.categorie && <span className="adp-chip"><Tag size={11} /> {categoryLabel(assoc.categorie)}</span>}
              {assoc.adresse && <span className="adp-chip"><MapPin size={11} /> {assoc.adresse}</span>}
            </div>
          </div>

          {/* Actions Buttons */}
          <div className="adp-hero-actions">
            {assoc.email && (
              <a href={`mailto:${assoc.email}`} className="adp-btn adp-btn-primary">
                <Mail size={14} /> {t('associationDetails.hero_btn_contact')}
              </a>
            )}
            {assoc.telephone && (
              <a href={`tel:${assoc.telephone}`} className="adp-btn adp-btn-ghost">
                <Phone size={14} /> {t('associationDetails.hero_btn_call')}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <div className="adp-stats-strip">
        <div className="adp-stat-card">
          <div className="adp-stat-icon blue"><Users size={18} /></div>
          <div>
            <div className="adp-stat-num">{memberCount.toLocaleString(i18n.language === 'ar' ? 'ar-TN' : 'fr-FR')}</div>
            <div className="adp-stat-lbl">{t('associationDetails.stat_members')}</div>
          </div>
        </div>
        
        {/* ✅ CORRECTION : Affiche le NOMBRE de dons */}
        <div className="adp-stat-card">
          <div className="adp-stat-icon green"><Heart size={18} /></div>
          <div>
            <div className="adp-stat-num">{donCount}</div>  {/* ← Nombre de dons */}
            <div className="adp-stat-lbl">{t('associationDetails.stat_donations')}</div>
          </div>
        </div>
        
        <div className="adp-stat-card">
          <div className="adp-stat-icon amber"><TrendingUp size={18} /></div>
          <div>
            <div className="adp-stat-num">{cotisRatio}%</div>
            <div className="adp-stat-lbl">{t('associationDetails.stat_contributions')}</div>
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="adp-layout">

        {/* ── Left: Tabs + Content ── */}
        <div>
          {/* Tab Bar */}
          <div className="adp-tabs-bar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`adp-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Informations */}
          {activeTab === 'infos' && (
            <div className="adp-content-card">
              <div className="adp-content-section">
                <div className="adp-section-label">{t('associationDetails.section_contact')}</div>
                <div className="adp-info-list">
                  <InfoRow icon={Mail} label={t('associationDetails.label_email')} value={assoc.email} type="email" />
                  <InfoRow icon={Phone} label={t('associationDetails.label_phone')} value={assoc.telephone} type="tel" />
                  <InfoRow icon={MapPin} label={t('associationDetails.label_address')} value={assoc.adresse} />
                  <InfoRow icon={Tag} label={t('associationDetails.label_category')} value={categoryLabel(assoc.categorie)} />
                  {assoc.created_at && (
                    <InfoRow icon={Calendar} label={t('associationDetails.label_member_since')}
                      value={new Date(assoc.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-TN' : 'fr-FR', { month: 'long', year: 'numeric' })} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Description */}
          {activeTab === 'description' && (
            <div className="adp-content-card">
              <div className="adp-content-section">
                <div className="adp-section-label">{t('associationDetails.section_about')}</div>
                <p className="adp-desc-text">
                  {assoc.description || t('associationDetails.no_description')}
                </p>
              </div>
            </div>
          )}

          {/* Tab: Cotisations */}
          {activeTab === 'cotisations' && (
            <div className="adp-content-card">
              <div className="adp-content-section">
                <div className="adp-section-label">{t('associationDetails.section_progress')}</div>
                <div className="adp-progress-wrap">
                  <div className="adp-progress-meta">
                    <span><strong>{cotisCount}</strong> / {memberCount} {t('associationDetails.progress_label')}</span>
                    <strong>{cotisRatio}%</strong>
                  </div>
                  <div className="adp-progress-track">
                    <div className="adp-progress-fill" style={{ width: `${cotisRatio}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Sidebar ── */}
        <aside className="adp-sidebar">

          {/* QR Share Card */}
          <div className="adp-side-card">
            <div className="adp-side-title"><Share2 size={15} /> {t('associationDetails.sidebar_share')}</div>
            <div className="adp-qr-wrap">
              <div className="adp-qr-frame">
                <QRCodeSVG value={qrValue} size={128}
                  bgColor="#ffffff" fgColor="#0D0D0D" level="H" includeMargin={false} />
              </div>
              <p className="adp-qr-label">{t('associationDetails.sidebar_qr_label')}</p>
              <button className={`adp-copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? t('associationDetails.btn_copied') : t('associationDetails.btn_copy_link')}
              </button>
            </div>
          </div>

          {/* Status Card */}
          <div className="adp-side-card">
            <div className="adp-side-title"><ShieldCheck size={15} /> {t('associationDetails.sidebar_status')}</div>
            <div className="adp-status-row">
              <span className="adp-status-key">{t('associationDetails.status_activity')}</span>
              <span className={`adp-badge ${isActive ? 'active' : 'blocked'}`}>
                {isActive ? t('associationDetails.hero_status_active').replace('● ', '') : t('associationDetails.hero_status_inactive').replace('● ', '')}
              </span>
            </div>
            <div className="adp-status-row">
              <span className="adp-status-key">{t('associationDetails.status_verification')}</span>
              <span className="adp-badge verified">{t('associationDetails.status_verified')}</span>
            </div>
            {assoc.created_at && (
              <div className="adp-status-row">
                <span className="adp-status-key">{t('associationDetails.status_registered_on')}</span>
                <span className="adp-status-val">
                  {new Date(assoc.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-TN' : 'fr-FR')}
                </span>
              </div>
            )}
            {assoc.categorie && (
              <div className="adp-status-row">
                <span className="adp-status-key">{t('associationDetails.label_category')}</span>
                <span className="adp-status-val">{categoryLabel(assoc.categorie)}</span>
              </div>
            )}
          </div>

          {/* Quick Contact Card */}
          {(assoc.email || assoc.telephone) && (
            <div className="adp-side-card">
              <div className="adp-side-title"><Mail size={15} /> {t('associationDetails.sidebar_quick_contact')}</div>
              {assoc.email && (
                <a href={`mailto:${assoc.email}`} className="adp-contact-link">
                  <span className="adp-contact-label">{t('associationDetails.label_email')}</span>
                  <span className="adp-contact-value">
                    {assoc.email.split('@')[0]} <ExternalLink size={11} />
                  </span>
                </a>
              )}
              {assoc.telephone && (
                <a href={`tel:${assoc.telephone}`} className="adp-contact-link" style={{ borderBottom: 'none' }}>
                  <span className="adp-contact-label">{t('associationDetails.label_phone')}</span>
                  <span className="adp-contact-value" style={{ fontWeight: 600 }}>{assoc.telephone}</span>
                </a>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

/* ─── Helper: category label with i18n ─── */
const categoryLabel = (value) => {
  const map = {
    education: 'Éducation',
    health: 'Santé',
    food: 'Alimentation',
    housing: 'Logement',
    emergency: 'Urgence',
    skills: 'Formation',
    other: 'Autre',
  };
  return map[value] || value || '—';
};

/* ─── Sub-components ─── */
const InfoRow = ({ icon: Icon, label, value, type }) => (
  <div className="adp-info-row">
    <div className="adp-info-icn"><Icon size={16} /></div>
    <div>
      <div className="adp-info-lbl">{label}</div>
      {type === 'email' && value
        ? <a href={`mailto:${value}`} className="adp-info-val adp-info-link">{value}</a>
        : type === 'tel' && value
        ? <a href={`tel:${value}`} className="adp-info-val adp-info-link">{value}</a>
        : <span className="adp-info-val">{value || '—'}</span>}
    </div>
  </div>
);

export default AssociationDetailsPage;