import { useState, useContext, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import loginImage from '../assets/login.jpg';
import './Login.css';
import { 
  Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle, Sparkles, 
  Shield, CheckCircle2 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [email, setEmail] = useState('');
  const [mot_de_passe, setMotDePasse] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState('');
  const [submitAttempts, setSubmitAttempts] = useState(0);

  const debouncedLogin = useCallback(async (loginData) => {
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('http://localhost:5000/auth/login-all', loginData, {
        timeout: 10000
      });
      
      const { token, role, user, association } = res.data || {};
      
      if (!token || !role) {
        throw new Error('Réponse serveur invalide (token/role manquant)');
      }

      const payload = role === 'association' ? association : user;
      login({ ...(payload || {}), role, token });

      const routes = {
        beneficiaire: '/dashboard-beneficiaire',
        donneur: '/dashboard-donneur',
        association: '/association/dashboard',
        admin: '/admin/dashboard',
        avocat: '/avocat/dashboard'
      };
      
      navigate(routes[role] || '/');
      
    } catch (err) {
  // 🔥 Message spécial compte bloqué
  if (err.response?.status === 403) {
    setError(t('login.account_blocked'));
  } else {
    const errorMsg =
      err.response?.data?.message ||
      t('login.authentication_failed');

    setError(errorMsg);
  }

  setSubmitAttempts(prev => prev + 1);
} finally {
      setLoading(false);
    }
  }, [login, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;
    
    debouncedLogin({ email, mot_de_passe });
  };

  const clearError = () => {
    setError('');
    setSubmitAttempts(0);
  };

  const getPasswordStrength = (password) => {
    if (password.length < 6) return 0;
    if (password.length < 10) return 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password)) return 2;
    return 1;
  };

  return (
    <div className="login-page cinematic" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Cinematic background */}
      <div className="login-bg cinematic-bg">
        <div className="login-orb orb-1" />
        <div className="login-orb orb-2" />
        <div className="login-orb orb-3" />
        <div className="login-orb orb-4" />
        <div className="login-grid cinematic-grid" />
        <div className="login-shimmer" />
      </div>

      <div className="login-shell">
        {/* Visual Panel */}
        <aside className="login-visual cinematic-panel">
          <div className="login-visual-img-wrap">
            <img src={loginImage} alt="Portail DON'ACT" className="login-visual-img" />
            <div className="login-visual-overlay gradient-01" />
            <div className="login-security-badge">
              <Shield size={24} />
              <span>{t('login.badge')}</span>
            </div>
          </div>

          {/* Enhanced Brand */}
          <div className="login-brand cinematic-brand">
            <div className="login-brand-mark">
              <Sparkles size={24} className="brand-sparkle" />
            </div>
            <div className="brand-text">
              <h1 className="login-brand-title">
                DON<span className="brand-glow">'</span>ACT
              </h1>
              <p className="login-brand-sub">
                Portail sécurisé d'action solidaire
              </p>
            </div>
          </div>
        </aside>

        {/* Form Panel */}
        <main className="login-main cinematic-form">
          <div className="login-card glass-card">
            {/* Header */}
            <div className="login-head cinematic-head">
              <div className="login-head-badge">
                <CheckCircle2 size={16} className="head-icon" />
                <span>{t('login.badge')}</span>
              </div>
              <h2 className="login-title cinematic-title">{t('login.title')}</h2>
              <p className="login-desc">
                {t('login.subtitle')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              {/* Email */}
              <div className={`field cinematic-field${focused === 'email' ? ' field--active' : ''}${email ? ' field--filled' : ''}`}>
                <label htmlFor="email">{t('login.label_email')}</label>
                <div className="field-wrap">
                  <Mail size={18} className="field-icon" />
                  <input
                    id="email"
                    type="email"
                    placeholder={t('login.placeholder_email')}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearError();
                    }}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused('')}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className={`field cinematic-field${focused === 'password' ? ' field--active' : ''}${mot_de_passe ? ' field--filled' : ''}`}>
                <div className="field-label-row">
                  <label htmlFor="password">{t('login.label_password')}</label>
                  <Link to="/forgot-password" className="field-forgot cinematic-link">
                    {t('login.forgot_password')}
                  </Link>
                </div>
                <div className="field-wrap">
                  <Lock size={18} className="field-icon" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('login.placeholder_password')}
                    value={mot_de_passe}
                    onChange={(e) => {
                      setMotDePasse(e.target.value);
                      clearError();
                    }}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused('')}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="field-eye"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  
                  {/* Password strength indicator */}
                  {mot_de_passe && (
                    <div className="password-strength">
                      <div 
                        className={`strength-bar strength-${getPasswordStrength(mot_de_passe)}`}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Error */}
              {error && (
                <div className="login-alert cinematic-alert" role="alert">
                  <AlertCircle size={18} className="login-alert-icon" />
                  <div>
                    <div className="login-alert-title">{t('login.error_title')}</div>
                    <div className="login-alert-text">{error}</div>
                  </div>
                  <button 
                    type="button" 
                    className="alert-dismiss" 
                    onClick={clearError}
                    aria-label="Fermer l'alerte"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className={`login-btn cinematic-btn${loading ? ' login-btn--loading' : ''}${submitAttempts > 2 ? ' btn--warning' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="login-spinner cinematic-spinner" />
                    {t('login.btn_loading')}
                  </>
                ) : (
                  <>
                    {t('login.btn_submit')}
                    <ArrowRight size={20} className="login-btn-arrow" />
                  </>
                )}
              </button>

              {/* Enhanced Footer */}
              <div className="login-footer cinematic-footer">
                <div className="footer-group">
                  <p className="login-footer-text">
                    {t('login.footer_new_beneficiary')}{' '}
                    <Link to="/demande-aide" className="login-footer-link">
                      {t('login.footer_link_demande')}
                    </Link>
                  </p>
                </div>
                <div className="footer-group">
                  <p className="login-footer-text">
                    {t('login.footer_first_visit')}{' '}
                    <Link to="/about" className="login-footer-link">
                      {t('login.footer_link_about')}
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Login;