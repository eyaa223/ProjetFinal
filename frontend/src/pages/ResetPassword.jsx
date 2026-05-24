import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2,
  Sparkles, Shield, XCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import loginImage from '../assets/login.jpg';
import './Login.css';
import './ForgotPassword.css';
import './ResetPassword.css';

/* ── Indicateur de force de mot de passe ── */
const strengthConfig = [
  { label: 'Très faible', color: '#ef4444', width: '20%' },
  { label: 'Faible',      color: '#f97316', width: '40%' },
  { label: 'Moyen',       color: '#eab308', width: '60%' },
  { label: 'Fort',        color: '#22c55e', width: '80%' },
  { label: 'Très fort',   color: '#10b981', width: '100%' },
];

const getStrengthScore = (pwd) => {
  if (!pwd) return -1;
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(score - 1, 4); // 0..4
};

const PasswordStrengthBar = ({ password }) => {
  const score = getStrengthScore(password);
  if (score < 0) return null;
  const cfg = strengthConfig[score];
  return (
    <div className="rp-strength">
      <div className="rp-strength-bar-bg">
        <div
          className="rp-strength-bar-fill"
          style={{ width: cfg.width, background: cfg.color }}
        />
      </div>
      <span className="rp-strength-label" style={{ color: cfg.color }}>{cfg.label}</span>
    </div>
  );
};

/* ── Règle de validation ── */
const Rule = ({ ok, text }) => (
  <li className={`rp-rule${ok ? ' rp-rule--ok' : ''}`}>
    {ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
    {text}
  </li>
);

/* ══════════════════════════════════════════
   Composant principal
══════════════════════════════════════════ */
const ResetPassword = () => {
  const { token } = useParams(); // /reset-password/:token
  const navigate   = useNavigate();
  const { i18n }   = useTranslation();

  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [showConf,    setShowConf]    = useState(false);
  const [focused,     setFocused]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [verifying,   setVerifying]   = useState(true);
  const [tokenValid,  setTokenValid]  = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState(false);

  /* Vérifier le token au chargement */
  useEffect(() => {
    if (!token) { setVerifying(false); return; }

    axios
      .get(`http://localhost:5000/auth/verify-reset-token/${token}`, { timeout: 10000 })
      .then(() => setTokenValid(true))
      .catch(() => setTokenValid(false))
      .finally(() => setVerifying(false));
  }, [token]);

  /* Règles de validation */
  const rules = {
    length:  password.length >= 8,
    upper:   /[A-Z]/.test(password),
    digit:   /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    match:   password !== '' && password === confirm,
  };

  const isValid = Object.values(rules).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setError('');

    try {
      await axios.post(
        'http://localhost:5000/auth/reset-password',
        { token, newPassword: password },
        { timeout: 15000 }
      );
      setSuccess(true);
      // Redirection auto après 3 s
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la réinitialisation.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Rendu états ── */
  const renderContent = () => {
    if (verifying) return (
      <div className="rp-state">
        <span className="login-spinner cinematic-spinner rp-big-spinner" />
        <p>Vérification du lien…</p>
      </div>
    );

    if (!tokenValid) return (
      <div className="fp-success rp-invalid">
        <div className="fp-success-icon rp-icon-error">
          <AlertCircle size={48} />
        </div>
        <h2 className="fp-success-title">Lien invalide ou expiré</h2>
        <p className="fp-success-text">
          Ce lien de réinitialisation est invalide ou a expiré (validité : 1 heure).
          Veuillez faire une nouvelle demande.
        </p>
        <Link to="/forgot-password" className="login-btn cinematic-btn fp-success-btn">
          Nouvelle demande <ArrowRight size={18} />
        </Link>
      </div>
    );

    if (success) return (
      <div className="fp-success">
        <div className="fp-success-icon">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="fp-success-title">Mot de passe mis à jour !</h2>
        <p className="fp-success-text">
          Votre mot de passe a été réinitialisé avec succès.
          Vous serez redirigé vers la page de connexion dans quelques secondes.
        </p>
        <Link to="/login" className="login-btn cinematic-btn fp-success-btn">
          Se connecter <ArrowRight size={18} />
        </Link>
      </div>
    );

    return (
      <>
        <div className="login-head cinematic-head">
          <div className="login-head-badge">
            <CheckCircle2 size={16} className="head-icon" />
            <span>Réinitialisation sécurisée</span>
          </div>
          <h2 className="login-title cinematic-title">Nouveau mot de passe</h2>
          <p className="login-desc">Choisissez un mot de passe fort pour sécuriser votre compte.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {/* Nouveau mot de passe */}
          <div className={`field cinematic-field${focused === 'pwd' ? ' field--active' : ''}${password ? ' field--filled' : ''}`}>
            <label htmlFor="rp-pwd">Nouveau mot de passe</label>
            <div className="field-wrap">
              <Lock size={18} className="field-icon" />
              <input
                id="rp-pwd"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onFocus={() => setFocused('pwd')}
                onBlur={() => setFocused('')}
                autoComplete="new-password"
                required
                autoFocus
              />
              <button
                type="button" className="field-eye"
                onClick={() => setShowPwd(v => !v)}
                aria-label={showPwd ? 'Masquer' : 'Afficher'}
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <PasswordStrengthBar password={password} />
          </div>

          {/* Confirmation */}
          <div className={`field cinematic-field${focused === 'conf' ? ' field--active' : ''}${confirm ? ' field--filled' : ''}`}>
            <label htmlFor="rp-conf">Confirmer le mot de passe</label>
            <div className="field-wrap">
              <Lock size={18} className="field-icon" />
              <input
                id="rp-conf"
                type={showConf ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                onFocus={() => setFocused('conf')}
                onBlur={() => setFocused('')}
                autoComplete="new-password"
                required
              />
              <button
                type="button" className="field-eye"
                onClick={() => setShowConf(v => !v)}
                aria-label={showConf ? 'Masquer' : 'Afficher'}
              >
                {showConf ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Règles de validation */}
          {password && (
            <ul className="rp-rules">
              <Rule ok={rules.length}  text="Au moins 8 caractères" />
              <Rule ok={rules.upper}   text="Une lettre majuscule" />
              <Rule ok={rules.digit}   text="Un chiffre" />
              <Rule ok={rules.special} text="Un caractère spécial (!@#$…)" />
              <Rule ok={rules.match}   text="Les mots de passe correspondent" />
            </ul>
          )}

          {/* Erreur */}
          {error && (
            <div className="login-alert cinematic-alert" role="alert">
              <AlertCircle size={18} className="login-alert-icon" />
              <div>
                <div className="login-alert-title">Erreur</div>
                <div className="login-alert-text">{error}</div>
              </div>
              <button type="button" className="alert-dismiss" onClick={() => setError('')}>×</button>
            </div>
          )}

          {/* Bouton */}
          <button
            type="submit"
            className={`login-btn cinematic-btn${loading ? ' login-btn--loading' : ''}${!isValid ? ' rp-btn-disabled' : ''}`}
            disabled={loading || !isValid}
          >
            {loading ? (
              <><span className="login-spinner cinematic-spinner" />Mise à jour…</>
            ) : (
              <>Réinitialiser le mot de passe <ArrowRight size={20} className="login-btn-arrow" /></>
            )}
          </button>
        </form>
      </>
    );
  };

  return (
    <div className="login-page cinematic fp-page" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="login-bg cinematic-bg">
        <div className="login-orb orb-1" /><div className="login-orb orb-2" />
        <div className="login-orb orb-3" /><div className="login-orb orb-4" />
        <div className="login-grid cinematic-grid" /><div className="login-shimmer" />
      </div>

      <div className="login-shell">
        <aside className="login-visual cinematic-panel">
          <div className="login-visual-img-wrap">
            <img src={loginImage} alt="Portail DON'ACT" className="login-visual-img" />
            <div className="login-visual-overlay gradient-01" />
            <div className="login-security-badge"><Shield size={24} /><span>Connexion Sécurisée</span></div>
          </div>
          <div className="login-brand cinematic-brand">
            <div className="login-brand-mark"><Sparkles size={24} className="brand-sparkle" /></div>
            <div className="brand-text">
              <h1 className="login-brand-title">DON<span className="brand-glow">'</span>ACT</h1>
              <p className="login-brand-sub">Portail sécurisé d'action solidaire</p>
            </div>
          </div>
        </aside>

        <main className="login-main cinematic-form">
          <div className="login-card glass-card fp-card">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ResetPassword;