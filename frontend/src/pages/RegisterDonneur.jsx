import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  User, Mail, Lock, ArrowRight, CheckCircle2, 
  Heart, Shield, Sparkles, AlertCircle 
} from 'lucide-react';
import './RegisterDonneur.css';
import { useTranslation } from 'react-i18next'; // Import du hook

import joindreImg from '../assets/charity22.jpg';

const RegisterDonneur = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(); // Hook de traduction

  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    mot_de_passe: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post('http://localhost:5000/auth/register', formData);
      navigate('/login');
    } catch (err) {
      // Vous pouvez aussi traduire le message d'erreur générique si vous avez une clé pour cela
      setError(err.response?.data?.message || 'Erreur serveur. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rd-page" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Background Decor */}
      <div className="rd-bg-glow" aria-hidden="true" />

      <div className="rd-container">
        
        {/* Left Side: Visual & Value Prop */}
        <aside className="rd-visual">
          <div className="rd-visual-overlay" />
          <img src={joindreImg} alt="Communauté solidaire" className="rd-visual-img" />
          
          <div className="rd-visual-content">
            <div className="rd-brand-badge">
              <Sparkles size={14} />
              <span>{t('register.visual_badge')}</span>
            </div>
            
            <h1 className="rd-visual-title">
              {t('register.visual_title_line1')} <br />
              <span>{t('register.visual_title_line2')}</span>
            </h1>
            
            <p className="rd-visual-desc">
              {t('register.visual_desc')}
            </p>

            <ul className="rd-benefits-list">
              <li>
                <CheckCircle2 size={18} />
                <span>{t('register.benefit_tracking')}</span>
              </li>
              <li>
                <Shield size={18} />
                <span>{t('register.benefit_verified')}</span>
              </li>
              <li>
                <Heart size={18} />
                <span>{t('register.benefit_impact')}</span>
              </li>
            </ul>
          </div>
        </aside>

        {/* Right Side: Form */}
        <main className="rd-form-side">
          <div className="rd-form-card">
            
            <div className="rd-header">
              <h2 className="rd-form-title">{t('register.form_title')}</h2>
              <p className="rd-form-sub">{t('register.form_sub')}</p>
            </div>

            <form className="rd-form" onSubmit={handleSubmit}>
              
              {/* Name Field */}
              <div className="rd-field">
                <label htmlFor="nom">{t('register.label_name')}</label>
                <div className="rd-input-wrap">
                  <User size={18} className="rd-input-icon" />
                  <input
                    type="text"
                    id="nom"
                    name="nom"
                    placeholder={t('register.placeholder_name')}
                    value={formData.nom}
                    onChange={handleChange}
                    required
                    className="rd-input"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="rd-field">
                <label htmlFor="email">{t('register.label_email')}</label>
                <div className="rd-input-wrap">
                  <Mail size={18} className="rd-input-icon" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder={t('register.placeholder_email')}
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="rd-input"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="rd-field">
                <label htmlFor="mot_de_passe">{t('register.label_password')}</label>
                <div className="rd-input-wrap">
                  <Lock size={18} className="rd-input-icon" />
                  <input
                    type="password"
                    id="mot_de_passe"
                    name="mot_de_passe"
                    placeholder={t('register.placeholder_password')}
                    value={formData.mot_de_passe}
                    onChange={handleChange}
                    required
                    minLength={8}
                    className="rd-input"
                  />
                </div>
                <span className="rd-hint">{t('register.hint_password')}</span>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rd-alert">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button type="submit" className="rd-submit-btn" disabled={loading}>
                {loading ? (
                  <span className="rd-loading">
                    <span className="rd-spinner" />
                    {t('register.btn_loading')}
                  </span>
                ) : (
                  <>
                    {t('register.btn_submit')}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              {/* Footer Link */}
              <div className="rd-footer">
                <span>{t('register.footer_text')}</span>
                <Link to="/login" className="rd-link">
                  {t('register.footer_link')}
                </Link>
              </div>

            </form>
          </div>
        </main>

      </div>
    </div>
  );
};

export default RegisterDonneur;