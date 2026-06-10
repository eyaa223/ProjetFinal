import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import {
  Sparkles, Send, RefreshCw, MessageSquare,
  Users, Star, User, Gift, Building2, Eye, TrendingUp,
} from 'lucide-react';
import './FeedbackPage.css';

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/feedback`
  : 'http://localhost:5000/api/feedback';

// ─── Config rôles (les icônes restent les mêmes) ─────────────────────────────
const ROLES = [
  { value: 'Donneur',      Icon: Gift,      accent: '#60A5FA' },
  { value: 'Beneficiaire', Icon: User,      accent: '#F472B6' },
  { value: 'Association',  Icon: Building2, accent: '#A78BFA' },
  { value: 'Visiteur',     Icon: Eye,       accent: '#34D399' },
];

const RATING_COLORS = { 1:'#F87171', 2:'#FB923C', 3:'#FBBF24', 4:'#A78BFA', 5:'#F472B6' };

const getRoleInfo  = (val) => ROLES.find((r) => r.value === val) || ROLES[0];
const getRoleColor = (val) => getRoleInfo(val).accent;

const formatTimeAgo = (d, t) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return t('feedback.list.timeNow');
  if (s < 3600)  return t('feedback.list.timeMin', { count: Math.floor(s / 60) });
  if (s < 86400) return t('feedback.list.timeHour', { count: Math.floor(s / 3600) });
  return t('feedback.list.timeDay', { count: Math.floor(s / 86400) });
};

const getToken = () => localStorage.getItem('token');
const getUser  = () => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } };

// ─── StarRating ───────────────────────────────────────────────────────────────
function StarRating({ value, hover, onRate, onHover, onLeave, t }) {
  const active = hover || value;
  return (
    <div className="fb-stars-group">
      {[1,2,3,4,5].map((star) => {
        const lit = star <= active;
        const col = RATING_COLORS[active] || '#A78BFA';
        return (
          <button key={star} type="button" className={`fb-star-btn ${lit ? 'lit' : ''}`}
            onMouseEnter={() => onHover(star)} onMouseLeave={onLeave} onClick={() => onRate(star)}
            aria-label={`${star} ${t('feedback.form.ratingLabel')}`}>
            <Star size={30} fill={lit ? col : 'none'} color={lit ? col : 'var(--fb-star-empty)'}
              strokeWidth={1.5} style={{ filter: lit ? `drop-shadow(0 0 6px ${col}88)` : 'none', transition: 'all .2s' }} />
          </button>
        );
      })}
      {active > 0 && (
        <span className="fb-rating-label" style={{ color: RATING_COLORS[active] }}>
          {t(`feedback.ratings.${active}`)}
        </span>
      )}
    </div>
  );
}

// ─── FeedbackCard ─────────────────────────────────────────────────────────────
function FeedbackCard({ fb, t }) {
  const color    = getRoleColor(fb.user_type);
  const roleInfo = getRoleInfo(fb.user_type);
  const RIcon    = roleInfo.Icon;
  const initials = (fb.user_name || t('feedback.list.anonymous')).slice(0,2).toUpperCase();

  return (
    <article className="fb-card" style={{ '--card-accent': color }}>
      <div className="fb-card-stripe" />
      <div className="fb-card-inner">
        <div className="fb-card-head">
          <div className="fb-avatar" style={{ background: `${color}20`, color, border: `1.5px solid ${color}40` }}>
            {initials}
          </div>
          <div className="fb-card-info">
            <span className="fb-card-name">{fb.user_name || t('feedback.list.anonymous')}</span>
            <div className="fb-card-meta">
              <span className="fb-role-pill" style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
                <RIcon size={9} /> {t(`feedback.roles.${fb.user_type}`)}
              </span>
              <span className="fb-card-time">{formatTimeAgo(fb.created_at, t)}</span>
            </div>
          </div>
          <div className="fb-card-stars">
            {[1,2,3,4,5].map((s) => (
              <Star key={s} size={12}
                fill={s <= fb.rating ? '#F472B6' : 'none'}
                color={s <= fb.rating ? '#F472B6' : 'var(--fb-star-empty)'}
                strokeWidth={1.5}
                style={{ filter: s <= fb.rating ? 'drop-shadow(0 0 4px #F472B688)' : 'none' }}
              />
            ))}
          </div>
        </div>
        <p className="fb-card-msg">{fb.message}</p>
        {fb.ai_improved === 1 && (
          <span className="fb-ai-chip"><Sparkles size={9} /> {t('feedback.list.aiImproved')}</span>
        )}
      </div>
    </article>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function FeedbackPage() {
  const { t, i18n } = useTranslation();
  
  const [user,        setUser]        = useState(null);
  const [role,        setRole]        = useState('Donneur');
  const [rating,      setRating]      = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message,     setMessage]     = useState('');
  const [origMessage, setOrigMessage] = useState('');
  const [aiImproved,  setAiImproved]  = useState(false);
  const [authorName,  setAuthorName]  = useState('');
  const [stayAnon,    setStayAnon]    = useState(false);
  const [isImproving,  setIsImproving]  = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focused,      setFocused]      = useState(false);
  const [feedbacks,   setFeedbacks]   = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (u) setAuthorName(u.name || u.full_name || u.email || '');
    fetchFeedbacks();
  }, []);

  // Changer la direction du document pour l'arabe
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const fetchFeedbacks = async () => {
    setLoadingList(true);
    try {
      const res  = await fetch(`${API_URL}/public?limit=30`);
      const data = await res.json();
      if (data.success) { setFeedbacks(data.feedbacks || []); setStats(data.stats || null); }
    } catch (err) { console.error(err); }
    finally { setLoadingList(false); }
  };

  // SweetAlert2 config
  const isDark = document.documentElement.classList.contains('dark') ||
                 document.documentElement.getAttribute('data-theme') === 'dark';
  const swalBase = {
    background:          isDark ? '#1A1030' : '#FFFFFF',
    color:               isDark ? '#F1F5F9' : '#0B1120',
    confirmButtonColor:  '#A78BFA',
    customClass: {
      popup:             isDark ? 'swal-dark' : 'swal-light',
      title:             'swal-title',
      htmlContainer:     'swal-html',
    },
  };

  // ── IA ───────────────────────────────────────────────────────────────────────
  const handleImproveWithAI = async () => {
    if (message.trim().length < 5)
      return Swal.fire({ ...swalBase, icon:'warning', title: t('feedback.ai.tooShort'), text: t('feedback.ai.tooShortText', { count: 5 }) });

    setIsImproving(true);
    setOrigMessage(message);
    try {
      const res  = await fetch(`${API_URL}/improve`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ message, rating: rating || 5, user_type: role }),
      });
      const data = await res.json();
      
      if (res.status === 429)
        return Swal.fire({ ...swalBase, icon:'warning', title: t('feedback.ai.quotaTitle'),
          html: t('feedback.ai.quotaText') });
      
      if (res.status === 503)
        return Swal.fire({ ...swalBase, icon:'warning', title: t('feedback.ai.errorTitle'),
          text: t('feedback.ai.serviceUnavailable') });
      
      if (!data.success) throw new Error(data.error);
      
      setMessage(data.improved_message);
      setAiImproved(true);
      Swal.fire({ ...swalBase, icon:'success', title: t('feedback.ai.successTitle'), 
        text: t('feedback.ai.successText', { model: data.model || 'Gemini AI' }), 
        timer:2000, showConfirmButton:false });
    } catch (err) {
      Swal.fire({ ...swalBase, icon:'error', title: t('feedback.ai.errorTitle'), text: err.message });
    } finally { setIsImproving(false); }
  };

  // ── Soumission ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (message.trim().length < 10)
      return Swal.fire({ ...swalBase, icon:'warning', title: t('feedback.ai.tooShort'), 
        text: t('feedback.ai.tooShortText', { count: 10 }) });

    setIsSubmitting(true);
    try {
      const finalName = stayAnon ? t('feedback.list.anonymous') : (authorName.trim() || t('feedback.list.anonymous'));
      const res = await fetch(API_URL, {
        method:'POST',
        headers: { 'Content-Type':'application/json', ...(getToken() ? { Authorization:`Bearer ${getToken()}` } : {}) },
        body: JSON.stringify({
          user_type: role, rating: rating || 5, message: message.trim(),
          original_message: origMessage || message.trim(),
          ai_improved: aiImproved, guest_name: finalName,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const nameText = finalName !== t('feedback.list.anonymous') ? `, <strong>${finalName}</strong>` : '';
      
      await Swal.fire({
        ...swalBase, icon:'success', title: t('feedback.submit.successTitle'),
        html:`<p>${t('feedback.submit.successText', { name: nameText })}</p>
              <div style="display:flex;justify-content:center;gap:4px;margin-top:10px">
                ${'<span style="color:#F472B6;font-size:22px;filter:drop-shadow(0 0 6px #F472B688)">★</span>'.repeat(rating||5)}
              </div>`,
        confirmButtonText: t('feedback.submit.successBtn'),
      });

      setMessage(''); setOrigMessage(''); setRating(0); setAiImproved(false);
      if (!user) setAuthorName('');
      fetchFeedbacks();
    } catch (err) {
      Swal.fire({ ...swalBase, icon:'error', title: t('feedback.submit.errorTitle'), text: err.message });
    } finally { setIsSubmitting(false); }
  };

  const currentRole = getRoleInfo(role);
  const RoleIcon    = currentRole.Icon;
  const charPct     = (message.length / 500) * 100;

  return (
    <div className="fbp-root">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <header className="fbp-hero">
        <div className="fbp-hero-orb fbp-orb1" />
        <div className="fbp-hero-orb fbp-orb2" />
        <div className="fbp-hero-orb fbp-orb3" />
        <div className="fbp-hero-content">
          <span className="fbp-eyebrow">
            <Sparkles size={12} /> {t('feedback.hero.eyebrow')}
          </span>
          <h1 className="fbp-hero-title">
            {t('feedback.hero.title')}<br />
            <span className="fbp-gradient-text">{t('feedback.hero.titleHighlight')}</span>
          </h1>
          <p className="fbp-hero-sub">
            {t('feedback.hero.subtitle')}
          </p>
        </div>

        {stats && (
          <div className="fbp-stats-row">
            <div className="fbp-stat-chip">
              <span className="fbp-stat-num">{stats.total ?? 0}</span>
              <span className="fbp-stat-lbl">{t('feedback.hero.statsReviews')}</span>
            </div>
            <div className="fbp-stat-divider" />
            <div className="fbp-stat-chip">
              <span className="fbp-stat-num" style={{ color:'#F472B6' }}>{stats.avg_rating ?? '—'}<small>/5</small></span>
              <span className="fbp-stat-lbl">{t('feedback.hero.statsRating')}</span>
            </div>
          </div>
        )}
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <main className="fbp-body">

        {/* ── Formulaire ───────────────────────────────────────────────────── */}
        <section className="fbp-form-col">
          <div className="fbp-form-card" style={{ '--role-accent': currentRole.accent }}>

            <div className="fbp-top-bar" />

            <div className="fbp-form-head">
              <div className="fbp-form-head-icon" style={{ background: `${currentRole.accent}18`, color: currentRole.accent }}>
                <RoleIcon size={18} />
              </div>
              <div>
                <h2 className="fbp-form-title">{t('feedback.form.title')}</h2>
                <p className="fbp-form-sub">
                  {user
                    ? <span dangerouslySetInnerHTML={{ __html: t('feedback.form.connectedAs', { name: user.name || user.email }) }} />
                    : t('feedback.form.anonymousInfo')}
                </p>
              </div>
            </div>

            {/* Rôle */}
            <div className="fbp-field">
              <label className="fbp-label">{t('feedback.form.roleLabel')}</label>
              <div className="fbp-role-grid">
                {ROLES.map(({ value, Icon, accent }) => (
                  <button key={value} type="button"
                    className={`fbp-role-btn ${role === value ? 'active' : ''}`}
                    style={role === value ? { '--btn-a': accent, borderColor: accent, color: accent, background: `${accent}14` } : {}}
                    onClick={() => setRole(value)}>
                    <Icon size={13} />{t(`feedback.roles.${value}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="fbp-field">
              <label className="fbp-label">{t('feedback.form.ratingLabel')}</label>
              <StarRating value={rating} hover={hoverRating}
                onRate={setRating} onHover={setHoverRating} onLeave={() => setHoverRating(0)} t={t} />
            </div>

            {/* Nom */}
            <div className="fbp-field">
              <label className="fbp-label">
                {t('feedback.form.nameLabel')} <span className="fbp-opt">{t('feedback.form.nameOptional')}</span>
              </label>
              <div className="fbp-name-row">
                <input type="text" className="fbp-input"
                  placeholder={t('feedback.form.namePlaceholder')}
                  value={stayAnon ? '' : authorName}
                  onChange={(e) => { setAuthorName(e.target.value); setStayAnon(false); }}
                  disabled={stayAnon} maxLength={80} />
                <button type="button"
                  className={`fbp-anon-btn ${stayAnon ? 'active' : ''}`}
                  onClick={() => setStayAnon((v) => !v)}>
                  <Eye size={13} /> {stayAnon ? t('feedback.form.anonymousActive') : t('feedback.form.anonymousBtn')}
                </button>
              </div>
            </div>

            {/* Message */}
            <div className="fbp-field">
              <label className="fbp-label">
                {t('feedback.form.messageLabel')}
                {aiImproved && <span className="fbp-ai-pill"><Sparkles size={10} /> IA</span>}
              </label>
              <div className={`fbp-textarea-wrap ${focused ? 'focused' : ''}`}>
                <textarea className="fbp-textarea" rows={5} maxLength={500}
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); if (aiImproved) setAiImproved(false); }}
                  onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                  placeholder={t('feedback.form.messagePlaceholder')} />
                <div className="fbp-char-track">
                  <div className="fbp-char-fill"
                    style={{ width: `${charPct}%`, opacity: charPct > 0 ? 1 : 0 }} />
                </div>
                <span className={`fbp-char-count ${message.length > 450 ? 'warn' : ''}`}>
                  {t('feedback.form.charCount', { count: message.length })}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="fbp-actions">
              <button type="button" className="fbp-btn-ai"
                onClick={handleImproveWithAI}
                disabled={isImproving || !message.trim()}>
                {isImproving
                  ? <><RefreshCw size={14} className="fbp-spin" /> {t('feedback.form.improving')}</>
                  : <><Sparkles size={14} /> {t('feedback.form.improveBtn')}</>}
              </button>
              <button type="button" className="fbp-btn-send"
                onClick={handleSubmit}
                disabled={isSubmitting || !message.trim()}>
                {isSubmitting
                  ? <><RefreshCw size={14} className="fbp-spin" /> {t('feedback.form.submitting')}</>
                  : <><Send size={14} /> {t('feedback.form.submitBtn')}</>}
              </button>
            </div>

          </div>
        </section>

        {/* ── Liste ────────────────────────────────────────────────────────── */}
        <section className="fbp-list-col">
          <div className="fbp-list-head">
            <Users size={15} className="fbp-list-icon" />
            <h2 className="fbp-list-title">{t('feedback.list.title')}</h2>
            <span className="fbp-badge">{feedbacks.length}</span>
          </div>

          {loadingList ? (
            <div className="fbp-state">
              <RefreshCw size={24} className="fbp-spin" />
              <span>{t('feedback.list.loading')}</span>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="fbp-state">
              <MessageSquare size={36} className="fbp-state-icon" />
              <p>{t('feedback.list.empty')}</p>
              <p className="fbp-state-sub">{t('feedback.list.emptySub')}</p>
            </div>
          ) : (
            <div className="fbp-list">
              {feedbacks.map((fb) => <FeedbackCard key={fb.id} fb={fb} t={t} />)}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}