import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, Sparkles, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import loginImage from '../assets/login.jpg';
import './Login.css'; // Réutilise les styles existants
import './ForgotPassword.css';

const ForgotPassword = () => {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [focused, setFocused] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    // Validation email basique côté client
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Veuillez saisir une adresse email valide.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post(
        'http://localhost:5000/auth/forgot-password',
        { email: email.trim().toLowerCase() },
        { timeout: 15000 }
      );
      // Toujours afficher le succès (ne pas révéler si l'email existe)
      setSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Une erreur est survenue. Veuillez réessayer.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page cinematic fp-page" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Background identique au Login */}
      <div className="login-bg cinematic-bg">
        <div className="login-orb orb-1" />
        <div className="login-orb orb-2" />
        <div className="login-orb orb-3" />
        <div className="login-orb orb-4" />
        <div className="login-grid cinematic-grid" />
        <div className="login-shimmer" />
      </div>

      <div className="login-shell">
        {/* Panneau visuel */}
        <aside className="login-visual cinematic-panel">
          <div className="login-visual-img-wrap">
            <img src={loginImage} alt="Portail DON'ACT" className="login-visual-img" />
            <div className="login-visual-overlay gradient-01" />
            <div className="login-security-badge">
              <Shield size={24} />
              <span>Connexion Sécurisée</span>
            </div>
          </div>
          <div className="login-brand cinematic-brand">
            <div className="login-brand-mark">
              <Sparkles size={24} className="brand-sparkle" />
            </div>
            <div className="brand-text">
              <h1 className="login-brand-title">
                DON<span className="brand-glow">'</span>ACT
              </h1>
              <p className="login-brand-sub">Portail sécurisé d'action solidaire</p>
            </div>
          </div>
        </aside>

        {/* Formulaire */}
        <main className="login-main cinematic-form">
          <div className="login-card glass-card fp-card">

            {!success ? (
              <>
                {/* En-tête */}
                <div className="login-head cinematic-head">
                  <div className="login-head-badge">
                    <CheckCircle2 size={16} className="head-icon" />
                    <span>Réinitialisation sécurisée</span>
                  </div>
                  <h2 className="login-title cinematic-title">Mot de passe oublié ?</h2>
                  <p className="login-desc">
                    Saisissez votre adresse email et nous vous enverrons un lien de réinitialisation.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="login-form" noValidate>
                  {/* Champ email */}
                  <div className={`field cinematic-field${focused === 'email' ? ' field--active' : ''}${email ? ' field--filled' : ''}`}>
                    <label htmlFor="fp-email">Adresse email</label>
                    <div className="field-wrap">
                      <Mail size={18} className="field-icon" />
                      <input
                        id="fp-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        onFocus={() => setFocused('email')}
                        onBlur={() => setFocused('')}
                        required
                        autoComplete="email"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Erreur */}
                  {error && (
                    <div className="login-alert cinematic-alert" role="alert">
                      <AlertCircle size={18} className="login-alert-icon" />
                      <div>
                        <div className="login-alert-title">Erreur</div>
                        <div className="login-alert-text">{error}</div>
                      </div>
                      <button type="button" className="alert-dismiss" onClick={() => setError('')} aria-label="Fermer">×</button>
                    </div>
                  )}

                  {/* Bouton envoi */}
                  <button
                    type="submit"
                    className={`login-btn cinematic-btn${loading ? ' login-btn--loading' : ''}`}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="login-spinner cinematic-spinner" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        Envoyer le lien
                        <ArrowRight size={20} className="login-btn-arrow" />
                      </>
                    )}
                  </button>

                  {/* Retour login */}
                  <div className="login-footer cinematic-footer fp-footer">
                    <Link to="/login" className="fp-back-link">
                      <ArrowLeft size={16} />
                      Retour à la connexion
                    </Link>
                  </div>
                </form>
              </>
            ) : (
              /* État succès */
              <div className="fp-success">
                <div className="fp-success-icon">
                  <CheckCircle2 size={48} />
                </div>
                <h2 className="fp-success-title">Email envoyé !</h2>
                <p className="fp-success-text">
                  Si un compte est associé à <strong>{email}</strong>,
                  vous recevrez un email avec les instructions de réinitialisation dans quelques minutes.
                </p>
                <p className="fp-success-hint">
                  Pensez à vérifier votre dossier spam.
                </p>
                <Link to="/login" className="login-btn cinematic-btn fp-success-btn">
                  <ArrowLeft size={18} />
                  Retour à la connexion
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ForgotPassword;