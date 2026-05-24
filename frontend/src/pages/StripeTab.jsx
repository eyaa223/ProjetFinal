import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import './StripeTab.css';

const API = 'http://localhost:5000';

const formatDT = (n, language) => Number(n || 0).toLocaleString(language === 'ar' ? 'ar-TN' : 'fr-TN', { minimumFractionDigits: 2 }) + ' DT';
const formatDate = (d, language) => d ? new Date(d).toLocaleDateString(language === 'ar' ? 'ar-TN' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STRIPE_FEES = 0.029;
const STRIPE_FIXED = 0.30;

const fakeStripeId = (id) => `acct_1P${String(id).padStart(3,'0')}FakeTest`;

// Icônes SVG réutilisables
const Icons = {
  Stripe: () => (
    <svg viewBox="0 0 70 25" className="stripe-logo-svg" aria-hidden="true">
      <defs>
        <linearGradient id="stripeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#635BFF" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <text x="0" y="20" fontFamily="'Sora', system-ui, sans-serif" fontWeight="800" fontSize="22" fill="url(#stripeGrad)">stripe</text>
    </svg>
  ),
  Shield: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Zap: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  Chart: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>,
  Bank: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>,
  Check: () => <svg className="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>,
  Arrow: () => <svg className="icon icon-sm" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8h10M9 4l4 4-4 4"/></svg>,
  Spinner: () => (
    <svg className="spinner" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.2"/>
      <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/>
    </svg>
  )
};

export default function StripeTab({ donneurs = [], profile = {} }) {
  const { user } = useContext(AuthContext);
  const { t, i18n } = useTranslation(); 

  const language = i18n.language;

  // 🌓 Dark/Light Mode
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('stripe_darkmode');
    return saved ? JSON.parse(saved) : window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('stripe_darkmode', JSON.stringify(darkMode));
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // États du composant
  const [view, setView] = useState('dashboard');
  const [stripeSetup, setStripeSetup] = useState(() => {
    const saved = localStorage.getItem(`stripe_setup_${user?.id}`);
    return saved ? JSON.parse(saved) : null;
  });
  const [setupStep, setSetupStep] = useState(0);
  const [form, setForm] = useState({ iban: '', titular: '', bank: '', country: 'TN' });
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawHistory, setWithdrawHistory] = useState(() => {
    const saved = localStorage.getItem(`stripe_withdrawals_${user?.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [toast, setToast] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Calculs mémoïsés
  const totalCollected = useMemo(() =>
    donneurs.reduce((acc, d) => acc + Number(d.montant || 0), 0), [donneurs]);

  const totalWithdrawn = useMemo(() =>
    withdrawHistory.filter(w => w.status === 'completed').reduce((acc, w) => acc + w.amount, 0), [withdrawHistory]);

  const stripeFees = useMemo(() =>
    donneurs.reduce((acc, d) => {
      const m = Number(d.montant || 0);
      return acc + (m * STRIPE_FEES + STRIPE_FIXED);
    }, 0), [donneurs]);

  const available = Math.max(0, totalCollected - stripeFees - totalWithdrawn);
  const pending = withdrawHistory.filter(w => w.status === 'pending').reduce((acc, w) => acc + w.amount, 0);

  // Handlers
  const handleSetup = () => {
    if (setupStep === 0) { setSetupStep(1); return; }
    if (!form.titular || !form.iban || !form.bank) {
      showToast(t('stripe.toast.error_fill'), 'error'); return;
    }
    const data = {
      ...form,
      stripeId: fakeStripeId(user?.id),
      createdAt: new Date().toISOString(),
      verified: true,
    };
    localStorage.setItem(`stripe_setup_${user?.id}`, JSON.stringify(data));
    setStripeSetup(data);
    setView('dashboard');
    showToast(t('stripe.toast.setup_success'));
  };

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) { showToast(t('stripe.toast.error_invalid'), 'error'); return; }
    if (amount > available) { showToast(t('stripe.toast.error_insufficient'), 'error'); return; }
    if (amount < 10) { showToast(t('stripe.toast.error_min'), 'error'); return; }

    setWithdrawing(true);
    setTimeout(() => {
      const entry = {
        id: `wr_${Date.now()}`,
        amount,
        status: 'pending',
        iban: stripeSetup.iban,
        date: new Date().toISOString(),
        eta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const updated = [entry, ...withdrawHistory];
      setWithdrawHistory(updated);
      localStorage.setItem(`stripe_withdrawals_${user?.id}`, JSON.stringify(updated));
      setWithdrawAmount('');
      setWithdrawing(false);
      setView('dashboard');
      showToast(t('stripe.toast.withdraw_success', { amount: formatDT(amount, language) }));

      setTimeout(() => {
        const completed = updated.map(w => w.id === entry.id ? { ...w, status: 'completed' } : w);
        setWithdrawHistory(completed);
        localStorage.setItem(`stripe_withdrawals_${user?.id}`, JSON.stringify(completed));
      }, 4000);
    }, 1800);
  };

  // Animation d'entrée
  const fadeIn = mounted ? 'fade-in' : '';
  const isRTL = language === 'ar';

  // ── VIEW: SETUP (non configuré) ──
  if (!stripeSetup) {
    return (
      <div className={`stripe-wrap ${fadeIn}`} dir={isRTL ? 'rtl' : 'ltr'}>
        {toast && (
          <div className={`stripe-toast stripe-toast--${toast.type} toast-enter`}>
            {toast.msg}
          </div>
        )}

        <div className="stripe-setup cinematic-glow">
          <div className="stripe-setup__hero">
            <div className="stripe-logo-big animate-pulse">
              <Icons.Stripe />
            </div>
            <h2 className="hero-title">{t('stripe.setup.title')}</h2>
            <p className="hero-subtitle" dangerouslySetInnerHTML={{
              __html: t('stripe.setup.subtitle')
                .replace('<0>', '<span class="highlight">')
                .replace('</0>', '</span>')
                .replace('<1>', '<span class="highlight">')
                .replace('</1>', '</span>')
            }} />
            
            <div className="stripe-setup__badges">
              <span className="badge"><Icons.Shield /> {t('stripe.setup.badges.ssl')}</span>
              <span className="badge"><Icons.Check /> {t('stripe.setup.badges.pci')}</span>
              <span className="badge">{t('stripe.setup.badges.sepa')}</span>
            </div>
          </div>

          {setupStep === 0 ? (
            <div className="stripe-setup__step step-slide">
              <div className="stripe-features">
                {[
                  { icon: <Icons.Zap />, t: t('stripe.setup.features.auto_transfer.title'), s: t('stripe.setup.features.auto_transfer.desc') },
                  { icon: <Icons.Chart />, t: t('stripe.setup.features.dashboard.title'), s: t('stripe.setup.features.dashboard.desc') },
                  { icon: <Icons.Shield />, t: t('stripe.setup.features.sandbox.title'), s: t('stripe.setup.features.sandbox.desc') },
                ].map((f, i) => (
                  <div className="stripe-feature feature-card" key={i} style={{ animationDelay: `${i * 100}ms` }}>
                    <span className="stripe-feature__icon">{f.icon}</span>
                    <div>
                      <strong>{f.t}</strong>
                      <p>{f.s}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                className="stripe-btn-primary stripe-btn-primary--lg btn-glow" 
                onClick={() => setSetupStep(1)}
              >
                {t('stripe.setup.btn_connect')}
                <Icons.Arrow />
              </button>
            </div>
          ) : (
            <div className="stripe-setup__form form-slide">
              <h3>{t('stripe.setup.form_title')}</h3>
              <p className="stripe-form-note">{t('stripe.setup.form_note')}</p>
              
              <div className="stripe-field">
                <label>{t('stripe.setup.fields.titular.label')}</label>
                <input 
                  value={form.titular} 
                  onChange={e => setForm(f => ({ ...f, titular: e.target.value }))}
                  placeholder={t('stripe.setup.fields.titular.placeholder')} 
                  className="cinematic-input"
                />
              </div>
              
              <div className="stripe-field">
                <label>{t('stripe.setup.fields.bank.label')}</label>
                <select 
                  value={form.bank} 
                  onChange={e => setForm(f => ({ ...f, bank: e.target.value }))}
                  className="cinematic-select"
                >
                  <option value="">{t('stripe.setup.fields.bank.placeholder')}</option>
                  {['Attijari Bank', 'BIAT', 'BNA', 'STB', 'UIB', 'Amen Bank', 'BH Bank', 'Autre'].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              
              <div className="stripe-field">
                <label>{t('stripe.setup.fields.iban.label')}</label>
                <input 
                  value={form.iban}
                  onChange={e => setForm(f => ({ ...f, iban: e.target.value.toUpperCase() }))}
                  placeholder={t('stripe.setup.fields.iban.placeholder')}
                  maxLength={24}
                  className="cinematic-input"
                />
                <span className="stripe-field-hint">{t('stripe.setup.fields.iban.hint')}</span>
              </div>
              
              <div className="stripe-setup__actions">
                <button className="stripe-btn-ghost" onClick={() => setSetupStep(0)}>{t('stripe.setup.btn_back')}</button>
                <button className="stripe-btn-primary btn-glow" onClick={handleSetup}>
                  <Icons.Check /> {t('stripe.setup.btn_activate')}
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="cinematic-bg-orb orb-1" />
        <div className="cinematic-bg-orb orb-2" />
      </div>
    );
  }

  // ── VIEW: DASHBOARD / WITHDRAW (configuré) ──
  return (
    <div className={`stripe-wrap ${fadeIn}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {toast && (
        <div className={`stripe-toast stripe-toast--${toast.type} toast-enter`}>
          {toast.msg}
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="stripe-header glass-panel">
        <div className="stripe-header__left">
          <div className="stripe-wordmark">
            <Icons.Stripe />
            <span className="stripe-mode-badge badge-test">{t('stripe.test_mode')}</span>
          </div>
          <p className="stripe-account-id" title={stripeSetup.stripeId}>
            {stripeSetup.stripeId}
          </p>
        </div>
       
        <div className="stripe-header__tabs">
          {['dashboard', 'withdraw'].map(v => (
            <button 
              key={v} 
              className={`stripe-tab-btn ${view === v ? 'active' : ''}`} 
              onClick={() => setView(v)}
            >
              {v === 'dashboard' ? t('stripe.dashboard.tabs.overview') : t('stripe.dashboard.tabs.withdraw')}
              {view === v && <span className="tab-indicator" />}
            </button>
          ))}
        </div>
      </div>

      {view === 'dashboard' && (
        <>
          {/* ── BALANCE CARDS ── */}
          <div className="stripe-balance-grid">
            <div className="stripe-balance-card stripe-balance-card--main glass-panel card-hover">
              <div className="balance-label">{t('stripe.dashboard.balance.available')}</div>
              <div className="balance-amount animate-count">{formatDT(available, language)}</div>
              <div className="balance-sub">{t('stripe.dashboard.balance.ready')}</div>
              <button 
                className="stripe-btn-primary stripe-btn-primary--sm btn-glow" 
                onClick={() => setView('withdraw')}
              >
                {t('stripe.dashboard.balance.ready')} <Icons.Arrow />
              </button>
            </div>
            
            <div className="stripe-balance-card glass-panel card-hover">
              <div className="balance-label">{t('stripe.dashboard.balance.collected')}</div>
              <div className="balance-amount balance-amount--sm">{formatDT(totalCollected, language)}</div>
              <div className="balance-sub">{donneurs.length} {t('stripe.dashboard.balance.donations_received')}</div>
            </div>
            
            <div className="stripe-balance-card glass-panel card-hover">
              <div className="balance-label">{t('stripe.dashboard.balance.pending')}</div>
              <div className="balance-amount balance-amount--sm balance-amount--pending">
                {formatDT(pending, language)}
              </div>
              <div className="balance-sub">{t('stripe.dashboard.balance.pending_desc')}</div>
            </div>
            
            <div className="stripe-balance-card glass-panel card-hover">
              <div className="balance-label">{t('stripe.dashboard.balance.fees')}</div>
              <div className="balance-amount balance-amount--sm balance-amount--fees">
                {formatDT(stripeFees, language)}
              </div>
              <div className="balance-sub">{t('stripe.dashboard.balance.fees_desc')}</div>
            </div>
          </div>

          {/* ── ACCOUNT INFO ── */}
          <div className="stripe-account-card glass-panel">
            <div className="stripe-account-card__head">
              <span><Icons.Bank /> {t('stripe.dashboard.account.title')}</span>
              <span className="stripe-verified badge-success"><Icons.Check /> {t('stripe.dashboard.account.verified')}</span>
            </div>
            <div className="stripe-account-card__body">
              <div className="stripe-info-row">
                <span>{t('stripe.dashboard.account.titular')}</span>
                <strong>{stripeSetup.titular}</strong>
              </div>
              <div className="stripe-info-row">
                <span>{t('stripe.dashboard.account.bank')}</span>
                <strong>{stripeSetup.bank}</strong>
              </div>
              <div className="stripe-info-row">
                <span>{t('stripe.dashboard.account.iban')}</span>
                <strong className="stripe-iban">
                  {stripeSetup.iban?.slice(0, 8)}•••• •••• {stripeSetup.iban?.slice(-4)}
                </strong>
              </div>
              <div className="stripe-info-row">
                <span>{t('stripe.dashboard.account.activated')}</span>
                <strong>{formatDate(stripeSetup.createdAt, language)}</strong>
              </div>
            </div>
          </div>

          {/* ── RECENT TRANSACTIONS ── */}
          <div className="stripe-section">
            <div className="stripe-section__head">
              <h3>{t('stripe.dashboard.transactions.title')}</h3>
              <span className="stripe-count badge-pill">{donneurs.length} {t('stripe.dashboard.transactions.count')}</span>
            </div>
            
            {donneurs.length === 0 ? (
              <div className="stripe-empty empty-state">
                <div className="empty-icon"></div>
                <p>{t('stripe.dashboard.transactions.empty_title')}</p>
                <span className="empty-sub">{t('stripe.dashboard.transactions.empty_desc')}</span>
              </div>
            ) : (
              <div className="stripe-txn-list">
                {donneurs.slice(0, 8).map((d, i) => {
                  const net = Number(d.montant || 0) - (Number(d.montant || 0) * STRIPE_FEES + STRIPE_FIXED);
                  return (
                    <div className="stripe-txn txn-card" key={i} style={{ animationDelay: `${i * 50}ms` }}>
                      <div className="stripe-txn__avatar avatar-glow">
                        {(d.donneur_nom || 'D')[0].toUpperCase()}
                      </div>
                      <div className="stripe-txn__info">
                        <strong>{d.donneur_nom || t('stripe.dashboard.transactions.anonymous')}</strong>
                        <span>→ {d.beneficiaire_prenom} {d.beneficiaire_nom}</span>
                      </div>
                      <div className="stripe-txn__meta">
                        <span className="stripe-txn__amount">+{formatDT(d.montant, language)}</span>
                        <span className="stripe-txn__fee">{t('stripe.dashboard.transactions.net')} {formatDT(Math.max(0, net), language)}</span>
                        <span className="stripe-txn__date">{formatDate(d.date_don, language)}</span>
                        <span className="stripe-txn__badge badge-paid"><Icons.Check /> {t('stripe.dashboard.transactions.paid')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── WITHDRAWAL HISTORY ── */}
          {withdrawHistory.length > 0 && (
            <div className="stripe-section">
              <div className="stripe-section__head">
                <h3>{t('stripe.dashboard.withdrawals.title')}</h3>
              </div>
              <div className="stripe-txn-list">
                {withdrawHistory.map((w, idx) => (
                  <div className="stripe-txn txn-card" key={w.id} style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="stripe-txn__avatar stripe-txn__avatar--payout avatar-glow">↑</div>
                    <div className="stripe-txn__info">
                      <strong>{t('stripe.dashboard.withdrawals.bank_transfer')}</strong>
                      <span>{w.iban?.slice(0, 8)}••••</span>
                    </div>
                    <div className="stripe-txn__meta">
                      <span className="stripe-txn__amount stripe-txn__amount--out">-{formatDT(w.amount, language)}</span>
                      <span className="stripe-txn__date">{formatDate(w.date, language)}</span>
                      <span className={`stripe-txn__badge badge-${w.status}`}>
                        {w.status === 'completed' ? <Icons.Check /> : '⏳'} {w.status === 'completed' ? t('stripe.dashboard.withdrawals.completed') : t('stripe.dashboard.withdrawals.pending')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {view === 'withdraw' && (
        <div className="stripe-withdraw">
          <div className="stripe-withdraw__card glass-panel card-slide">
            <div className="stripe-withdraw__header">
              <h3>{t('stripe.withdraw.title')}</h3>
              <p>{t('stripe.withdraw.to_bank')} <strong>{stripeSetup.bank}</strong> — <code className="iban-masked">{stripeSetup.iban?.slice(0, 8)}••••</code></p>
            </div>

            <div className="stripe-available-badge badge-available">
              <span>{t('stripe.withdraw.available')}</span>
              <strong className="animate-pulse">{formatDT(available, language)}</strong>
            </div>

            <div className="stripe-field">
              <label>{t('stripe.withdraw.amount_label')}</label>
              <div className="stripe-amount-input">
                <span className="stripe-currency">DT</span>
                <input
                  type="number"
                  placeholder={t('stripe.withdraw.amount_placeholder')}
                  value={withdrawAmount}
                  min="10"
                  max={available}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  className="cinematic-input amount-input"
                />
              </div>
              
              <div className="stripe-quick-amounts">
                {[50, 100, 200, 500].map(a => (
                  <button 
                    key={a} 
                    className={`stripe-quick-btn ${a <= available ? '' : 'disabled'}`}
                    onClick={() => setWithdrawAmount(Math.min(a, available).toString())}
                    disabled={a > available}
                  >
                    {a} DT
                  </button>
                ))}
                <button 
                  className="stripe-quick-btn quick-all"
                  onClick={() => setWithdrawAmount(available.toFixed(2))}
                >
                  {t('stripe.withdraw.quick_amounts.all')}
                </button>
              </div>
            </div>

            <div className="stripe-withdraw__summary glass-inner">
              <div className="stripe-summary-row">
                <span>{t('stripe.withdraw.summary.amount')}</span>
                <span>{withdrawAmount ? formatDT(parseFloat(withdrawAmount), language) : '—'}</span>
              </div>
              <div className="stripe-summary-row">
                <span>{t('stripe.withdraw.summary.delay')}</span>
                <span className="highlight">{t('stripe.withdraw.summary.delay_value')}</span>
              </div>
              <div className="stripe-summary-row stripe-summary-row--total">
                <span>{t('stripe.withdraw.summary.you_receive')}</span>
                <strong className="total-amount">{withdrawAmount ? formatDT(parseFloat(withdrawAmount), language) : '—'}</strong>
              </div>
            </div>

            <div className="stripe-withdraw__actions">
              <button className="stripe-btn-ghost" onClick={() => setView('dashboard')}>{t('stripe.withdraw.btn_cancel')}</button>
              <button
                className="stripe-btn-primary btn-glow btn-lg"
                onClick={handleWithdraw}
                disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > available}
              >
                {withdrawing ? (
                  <><Icons.Spinner /> {t('stripe.withdraw.btn_processing')}</>
                ) : (
                  <><Icons.Zap /> {t('stripe.withdraw.btn_confirm')}</>
                )}
              </button>
            </div>

            <p className="stripe-withdraw__note">
              {t('stripe.withdraw.note')}
            </p>
          </div>
        </div>
      )}

      {/* Decorative background */}
      <div className="cinematic-bg-orb orb-1" />
      <div className="cinematic-bg-orb orb-2" />
      <div className="cinematic-bg-orb orb-3" />
    </div>
  );
}