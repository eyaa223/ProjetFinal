import { useEffect, useMemo, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './CreateDon.css';

const API = 'http://localhost:5000';
const QUICK_AMOUNTS = [10, 25, 50, 100, 200];

const CreateDon = () => {
  const { user }   = useContext(AuthContext);
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [montant,        setMontant]        = useState('');
  const [numeroBancaire, setNumeroBancaire] = useState('');
  const [message,        setMessage]        = useState('');
  const [anonymous,      setAnonymous]      = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState('');
  const [successMsg,     setSuccessMsg]     = useState('');
  const [step,           setStep]           = useState(1); // 1=montant, 2=paiement, 3=message

  const authHeaders = useMemo(() => (
    user?.token ? { Authorization: `Bearer ${user.token}` } : {}
  ), [user?.token]);

  useEffect(() => {
    if (user?.numero_bancaire && !numeroBancaire)
      setNumeroBancaire(String(user.numero_bancaire));
  }, [user?.numero_bancaire]);

  const normalizeBank = (v) => String(v || '').replace(/\s+/g, '').trim();

  const validate = () => {
    const m = Number(montant);
    if (!id)            return 'Bénéficiaire introuvable.';
    if (!user?.token)   return 'Vous devez être connecté.';
    if (!montant || isNaN(m) || m <= 0) return 'Montant invalide.';
    const bank = normalizeBank(numeroBancaire);
    if (!bank)          return 'Numéro bancaire requis.';
    if (bank.length < 8) return 'Numéro bancaire trop court.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMsg('');
    const msg = validate();
    if (msg) { setError(msg); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/api/donations`, {
        beneficiaire_id: id,
        montant: Number(montant),
        numero_bancaire: normalizeBank(numeroBancaire),
        message: message.trim() || undefined,
      }, { headers: authHeaders });
      setSuccessMsg('Don effectué avec succès !');
      setTimeout(() => navigate('/dashboard-donneur'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du don.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: 'Montant' },
    { num: 2, label: 'Paiement' },
    { num: 3, label: 'Message' },
  ];

  return (
    <div className="cd-page">
      <div className="cd-shell">

        {/* ── TOP BAR ── */}
        <div className="cd-topbar">
          <button className="cd-back" onClick={() => navigate(-1)} disabled={loading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Retour
          </button>
          <div className="cd-topbar__right">
            <span className="cd-secure">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Paiement sécurisé
            </span>
          </div>
        </div>

        {/* ── HERO ── */}
        <div className="cd-hero">
          <div className="cd-hero__icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <div>
            <h1 className="cd-hero__title">Faire un don</h1>
            <p className="cd-hero__sub">Votre générosité fait la différence</p>
          </div>
        </div>

        {/* ── STEPPER ── */}
        <div className="cd-stepper">
          {steps.map((s, i) => (
            <div key={s.num} className="cd-stepper__item">
              <div className={`cd-stepper__dot ${step > s.num ? 'cd-stepper__dot--done' : step === s.num ? 'cd-stepper__dot--active' : ''}`}>
                {step > s.num ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : s.num}
              </div>
              <span className={`cd-stepper__label ${step === s.num ? 'cd-stepper__label--active' : ''}`}>{s.label}</span>
              {i < steps.length - 1 && <div className={`cd-stepper__line ${step > s.num ? 'cd-stepper__line--done' : ''}`} />}
            </div>
          ))}
        </div>

        {/* ── ALERTS ── */}
        {error && (
          <div className="cd-alert cd-alert--danger">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}
        {successMsg && (
          <div className="cd-alert cd-alert--success">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="cd-form">

          {/* ══ STEP 1 — MONTANT ══ */}
          <div className={`cd-section ${step === 1 ? 'cd-section--active' : ''}`}>
            <div className="cd-section__head">
              <span className="cd-section__num">01</span>
              <span className="cd-section__title">Choisir un montant</span>
            </div>

            <div className="cd-quick">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`cd-quick__btn ${String(a) === String(montant) ? 'cd-quick__btn--active' : ''}`}
                  onClick={() => { setMontant(String(a)); }}
                  disabled={loading}
                >
                  <span className="cd-quick__val">{a}</span>
                  <span className="cd-quick__cur">DT</span>
                </button>
              ))}
            </div>

            <div className="cd-field">
              <label className="cd-label">Montant personnalisé</label>
              <div className="cd-input-wrap">
                <span className="cd-input-prefix">DT</span>
                <input
                  type="number"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  min="1" step="1"
                  placeholder="Autre montant..."
                  disabled={loading}
                  className="cd-input cd-input--prefixed"
                />
              </div>
            </div>

            {montant && Number(montant) > 0 && (
              <div className="cd-preview">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                Vous allez donner <strong>{Number(montant).toFixed(2)} DT</strong>
              </div>
            )}

            <button type="button" className="cd-btn cd-btn--next" onClick={() => setStep(2)} disabled={!montant || Number(montant) <= 0}>
              Continuer
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          {/* ══ STEP 2 — PAIEMENT ══ */}
          <div className={`cd-section ${step === 2 ? 'cd-section--active' : ''}`}>
            <div className="cd-section__head">
              <span className="cd-section__num">02</span>
              <span className="cd-section__title">Informations bancaires</span>
            </div>

            <div className="cd-field">
              <label className="cd-label">
                Numéro bancaire
                <span className="cd-label__hint">Les espaces sont supprimés automatiquement</span>
              </label>
              <div className="cd-input-wrap">
                <span className="cd-input-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                </span>
                <input
                  type="text"
                  value={numeroBancaire}
                  onChange={(e) => setNumeroBancaire(e.target.value)}
                  placeholder="XXXX XXXX XXXX XXXX"
                  disabled={loading}
                  className="cd-input cd-input--icon"
                />
              </div>
            </div>

            <div className="cd-bank-secure">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Vos données bancaires sont chiffrées et ne sont jamais stockées en clair.
            </div>

            <div className="cd-btn-row">
              <button type="button" className="cd-btn cd-btn--ghost" onClick={() => setStep(1)} disabled={loading}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
                Retour
              </button>
              <button type="button" className="cd-btn cd-btn--next" onClick={() => setStep(3)} disabled={normalizeBank(numeroBancaire).length < 8}>
                Continuer
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>

          {/* ══ STEP 3 — MESSAGE ══ */}
          <div className={`cd-section ${step === 3 ? 'cd-section--active' : ''}`}>
            <div className="cd-section__head">
              <span className="cd-section__num">03</span>
              <span className="cd-section__title">Message <span className="cd-section__opt">(optionnel)</span></span>
            </div>

            <div className="cd-field">
              <label className="cd-label">Un mot d'encouragement</label>
              <div className="cd-textarea-wrap">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Votre message pour le bénéficiaire..."
                  maxLength={200}
                  rows={3}
                  disabled={loading}
                  className="cd-textarea"
                />
                <span className="cd-charcount">{message.length}/200</span>
              </div>
            </div>

            <label className="cd-anon">
              <div className={`cd-anon__box ${anonymous ? 'cd-anon__box--checked' : ''}`} onClick={() => setAnonymous(!anonymous)}>
                {anonymous && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
              <div className="cd-anon__text">
                <span className="cd-anon__label">Rester anonyme</span>
                <span className="cd-anon__sub">Votre nom ne sera pas visible par le bénéficiaire</span>
              </div>
            </label>

            {/* ── RÉCAP ── */}
            <div className="cd-recap">
              <div className="cd-recap__title">Récapitulatif</div>
              <div className="cd-recap__row">
                <span>Montant</span>
                <strong>{Number(montant || 0).toFixed(2)} DT</strong>
              </div>
              <div className="cd-recap__row">
                <span>Carte</span>
                <strong>••••{normalizeBank(numeroBancaire).slice(-4) || '——'}</strong>
              </div>
              <div className="cd-recap__row">
                <span>Don anonyme</span>
                <strong>{anonymous ? 'Oui' : 'Non'}</strong>
              </div>
            </div>

            <div className="cd-btn-row">
              <button type="button" className="cd-btn cd-btn--ghost" onClick={() => setStep(2)} disabled={loading}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
                Retour
              </button>
              <button type="submit" className="cd-btn cd-btn--submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="cd-spinner" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    Valider le don — {Number(montant || 0).toFixed(2)} DT
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateDon;