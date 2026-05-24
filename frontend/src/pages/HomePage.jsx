 import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import {
  Heart, Shield, Zap, Users, ArrowRight, Sparkles, Eye, Lock,
  Star, TrendingUp, HandHeart, ChevronDown, Play
} from 'lucide-react';
import './HomePage.css';
import welcomeImage from '../assets/welcome.jpg';
import heroVideo from '../assets/poor.mp4';
import ChatbotWidget from '../components/ChatbotWidget';
import { useTranslation } from "react-i18next";

/* ── Scroll-reveal hook ── */
const useReveal = () => {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
};

/* ── Animated counter ── */
const Counter = ({ target, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const num = parseFloat(target.replace(/[^0-9.]/g, ''));
        const duration = 1800;
        const step = 16;
        const steps = duration / step;
        let current = 0;
        const timer = setInterval(() => {
          current++;
          setCount(Math.round((num / steps) * current * 10) / 10);
          if (current >= steps) { setCount(num); clearInterval(timer); }
        }, step);
      }
    }, { threshold: 0.4 });
    if (el) io.observe(el);
    return () => io.disconnect();
  }, [target]);

  const raw = parseFloat(target.replace(/[^0-9.]/g, ''));
  const unit = target.replace(/[^KM+%]/g, '');

  return (
    <span ref={ref}>
      {count >= raw
        ? target.replace(/[0-9.]+/, raw % 1 === 0 ? raw : raw.toFixed(1))
        : `${Math.floor(count)}${unit}`}
      {suffix}
    </span>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [videoReady, setVideoReady] = useState(false);
  const { t } = useTranslation();

  useReveal();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location]);

  const whyItems = [
    { icon: Eye,        key: 'transparency', color: 'blue'   },
    { icon: Lock,       key: 'security',     color: 'green'  },
    { icon: Zap,        key: 'connection',   color: 'purple' },
    { icon: TrendingUp, key: 'impact',       color: 'orange' },
  ];

  const stats = [
    { value: '50K+', labelKey: 'stats.beneficiaries', icon: Users     },
    { value: '200+', labelKey: 'stats.associations',  icon: HandHeart },
    { value: '98%',  labelKey: 'stats.satisfaction',  icon: Star      },
    { value: '12M',  labelKey: 'stats.collected',     icon: Sparkles  },
  ];

  return (
    <div className="hp">

      {/* ══════ HERO ══════ */}
      <section className="hp-hero">
        <div className="hp-hero-video-wrap">
          <video
            className={`hp-hero-video${videoReady ? ' hp-hero-video--ready' : ''}`}
            src={heroVideo}
            autoPlay muted loop playsInline
            onCanPlay={() => setVideoReady(true)}
            aria-hidden="true"
          />
          <div className="hp-hero-overlay hp-hero-overlay--dark" />
          <div className="hp-hero-overlay hp-hero-overlay--gradient" />
          <div className="hp-hero-overlay hp-hero-overlay--vignette" />
        </div>

        <div className="hp-hero-grain" aria-hidden="true" />

        <div className="hp-hero-content">
          <div className="hp-hero-badge" data-reveal>
            <Sparkles size={13} />
            <span>{t('home.hero.badge')}</span>
          </div>

          <h1 className="hp-hero-title" data-reveal>
            {t('home.hero.title_line1')}<br />
            <em>{t('home.hero.title_line2')}</em>
          </h1>

          <p className="hp-hero-sub" data-reveal>
            {t('home.hero.subtitle')}
          </p>

          <div className="hp-hero-actions" data-reveal>
            <button className="hp-btn hp-btn--primary hp-btn--lg" onClick={() => navigate('/register-donneur')}>
              <Heart size={17} fill="currentColor" />
              {t('home.hero.cta_donor')}
              <ArrowRight size={17} />
            </button>
            <button className="hp-btn hp-btn--ghost hp-btn--lg" onClick={() => navigate('/associations')}>
              <Play size={15} fill="currentColor" />
              {t('home.hero.cta_assoc')}
            </button>
          </div>

          <div className="hp-hero-trust" data-reveal>
            <span><Shield size={14} /> {t('home.hero.trust_secure')}</span>
            <span className="hp-trust-sep" />
            <span><Eye size={14} /> {t('home.hero.trust_transparent')}</span>
            <span className="hp-trust-sep" />
            <span><Zap size={14} /> {t('home.hero.trust_impact')}</span>
          </div>
        </div>

        <button
          className="hp-hero-scroll"
          onClick={() => document.querySelector('.hp-stats')?.scrollIntoView({ behavior: 'smooth' })}
          aria-label={t('home.hero.scroll_label')}
        >
          <ChevronDown size={22} />
        </button>
      </section>

      {/* ══════ STATS ══════ */}
      <section className="hp-stats">
        <div className="hp-stats-inner">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="hp-stat" data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="hp-stat-icon"><Icon size={22} /></div>
                <div className="hp-stat-val"><Counter target={s.value} /></div>
                <div className="hp-stat-label">{t(s.labelKey)}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══════ SHOWCASE ══════ */}
      <section className="hp-showcase">
        <div className="hp-showcase-inner">
          <div className="hp-showcase-img-wrap" data-reveal>
            <img src={welcomeImage} alt={t('home.showcase.img_alt')} className="hp-showcase-img" loading="lazy" />
            <div className="hp-showcase-img-decor" />
          </div>

          <div className="hp-showcase-text">
            <div className="hp-section-tag" data-reveal>
              <Users size={13} /> {t('home.showcase.tag')}
            </div>
            <h2 className="hp-section-title" data-reveal>
              {t('home.showcase.title_line1')}<br />
              <span>{t('home.showcase.title_line2')}</span>
            </h2>
            <p className="hp-section-desc" data-reveal>
              {t('home.showcase.desc')}
            </p>
            <button className="hp-btn hp-btn--outline" data-reveal onClick={() => navigate('/about')}>
              {t('home.showcase.cta')} <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* ══════ WHY ══════ */}
      <section className="hp-why">
        <div className="hp-why-inner">
          <div className="hp-why-header">
            <div className="hp-section-tag" data-reveal>
              <Sparkles size={13} /> {t('home.why.tag')}
            </div>
            <h2 className="hp-section-title" data-reveal>
              {t('home.why.title')} <span>Don'Act</span>
            </h2>
            <p className="hp-section-desc hp-section-desc--center" data-reveal>
              {t('home.why.desc')}
            </p>
          </div>

          <div className="hp-why-grid">
            {whyItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <article
                  key={i}
                  className={`hp-why-card hp-why-card--${item.color}`}
                  data-reveal
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <div className="hp-why-icon"><Icon size={22} /></div>
                  <h3>{t(`home.why.items.${item.key}.title`)}</h3>
                  <p>{t(`home.why.items.${item.key}.desc`)}</p>
                  <div className="hp-why-arrow"><ArrowRight size={16} /></div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════ CTA ══════ */}
      <section className="hp-cta">
        <div className="hp-cta-glow" />
        <div className="hp-cta-inner">
          <div className="hp-cta-icon" data-reveal><Heart size={30} fill="currentColor" /></div>
          <h2 className="hp-cta-title" data-reveal>
            {t('home.cta.title_line1')}<br />
            <span>{t('home.cta.title_line2')}</span>
          </h2>
          <p className="hp-cta-sub" data-reveal>
            {t('home.cta.subtitle')}
          </p>
          <div className="hp-cta-actions" data-reveal>
            <button className="hp-btn hp-btn--white hp-btn--xl" onClick={() => navigate('/register-donneur')}>
              <Sparkles size={18} /> {t('home.cta.cta_start')}
            </button>
            <button className="hp-btn hp-btn--ghost-white hp-btn--xl" onClick={() => navigate('/associations')}>
              {t('home.cta.cta_assoc')}
            </button>
          </div>
          <p className="hp-cta-note" data-reveal>
            <Lock size={13} /> {t('home.cta.note')}
          </p>
        </div>
      </section>
      {/* ══════ FOOTER ══════ */}
      <footer className="hp-footer">
        <div className="hp-footer-inner">
          <div>
            <span className="hp-footer-logo">Don'Act</span>
            <p className="hp-footer-tag">{t('home.footer.tagline')}</p>
          </div>
          <nav className="hp-footer-links">
            <button onClick={() => navigate('/associations')}>{t('nav.associations')}</button>
            <button onClick={() => navigate('/about')}>{t('nav.about')}</button>
            <button onClick={() => navigate('/about')}>{t('nav.contact')}</button>
          </nav>
        </div>
      </footer>
      <ChatbotWidget />
    </div>
  );
};
export default HomePage; 