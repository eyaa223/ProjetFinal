import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart, Shield, Eye, Zap, Users, Mail, Phone, MapPin,
  Facebook, Instagram, Twitter, Linkedin, ArrowRight, Sparkles,
  Quote, Target, Handshake, Globe, ChevronDown, ExternalLink
} from 'lucide-react';
import './AboutUs.css';
import { useTranslation } from 'react-i18next'; // Hook de traduction

// Imports des images
import heroBg         from '../assets/background.jpg';
import charityImg     from '../assets/charity22.jpg';
import rejoindreImg   from '../assets/don.png';
import viesTransformeesImg  from '../assets/vietransforme.jpg';
import souriresImg          from '../assets/sourirs.png';
import urgenceSolidaireImg  from '../assets/urgencesolidaire.png';
import impactProImg         from '../assets/impactprofessional.jpg';
import ecrireNousImg        from '../assets/ecrire nous.jpg';
import appelerImg           from '../assets/appeler.jpg';
import adresseImg           from '../assets/adresse.png';

/* ── Scroll-reveal hook ── */
const useReveal = () => {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { 
          e.target.classList.add('revealed'); 
          io.unobserve(e.target); 
        }
      }),
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
};

/* ── Animated counter ── */
const Counter = ({ target }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const num = parseFloat(target.replace(/[^0-9.]/g, ''));
        const unit = target.replace(/[0-9.]/g, '');
        
        const duration = 1600;
        const step = 16;
        const steps = duration / step;
        let cur = 0;

        const t = setInterval(() => {
          cur++;
          const val = Math.round((num / steps) * cur);
          setCount(`${val}${unit}`);
          if (cur >= steps) { 
            setCount(target); 
            clearInterval(t); 
          }
        }, step);
      }
    }, { threshold: 0.4 });

    if (el) io.observe(el);
    return () => io.disconnect();
  }, [target]);

  return <span ref={ref}>{count || '0'}</span>;
};

const AboutUs = () => {
  const navigate = useNavigate();
  const [scrollPct, setScrollPct] = useState(0);
  
  // Utilisation du namespace global (pas de paramètre si c'est 'translation.json')
  // Si votre fichier s'appelle différemment, mettez useTranslation('nomDuFichier')
  const { t, i18n } = useTranslation(); 

  useReveal();

  // Progress bar on scroll
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct(h > 0 ? Math.round((window.scrollY / h) * 100) : 0);
    };
    window.addEventListener('scroll', onScroll);
    window.scrollTo({ top: 0, behavior: 'instant' });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Définition des données dynamiques basées sur la traduction
  const values = [
    { 
      icon: Eye, 
      number: '01', 
      title: t('about.values.v1_title'), 
      desc: t('about.values.v1_desc'), 
      color: 'blue'   
    },
    { 
      icon: Heart, 
      number: '02', 
      title: t('about.values.v2_title'), 
      desc: t('about.values.v2_desc'), 
      color: 'red'    
    },
    { 
      icon: Target, 
      number: '03', 
      title: t('about.values.v3_title'), 
      desc: t('about.values.v3_desc'), 
      color: 'green'  
    },
    { 
      icon: Handshake, 
      number: '04', 
      title: t('about.values.v4_title'), 
      desc: t('about.values.v4_desc'), 
      color: 'purple' 
    },
  ];

  const storyStats = [
    { value: '2020', label: t('about.story.stat_year') },
    { value: '200+', label: t('about.story.stat_partners') },
    { value: '50K+', label: t('about.story.stat_beneficiaries') },
  ];

  const contactItems = [
    { 
      icon: Mail, 
      image: ecrireNousImg, 
      title: t('about.contact.write_title'), 
      value: 'donactcontact@gmail.com', 
      href: 'mailto:donactcontact@gmail.com', 
      note: t('about.contact.write_note') 
    },
    { 
      icon: Phone, 
      image: appelerImg, 
      title: t('about.contact.call_title'), 
      value: '+216 92 345 678', 
      href: 'tel:+21692345678', 
      note: t('about.contact.call_note') 
    },
    { 
      icon: MapPin, 
      image: adresseImg, 
      title: t('about.contact.visit_title'), 
      value: '123 Av. de l\'Espoir, Tunis 1000', 
      href: '', 
      note: t('about.contact.visit_note') 
    },
  ];

  const socialItems = [
    { 
      icon: Facebook, 
      image: viesTransformeesImg, 
      label: t('about.contact.fb_label'), 
      href: 'https://facebook.com', 
      color: 'facebook'  
    },
    { 
      icon: Instagram, 
      image: souriresImg, 
      label: t('about.contact.ig_label'), 
      href: 'https://instagram.com', 
      color: 'instagram' 
    },
    { 
      icon: Twitter, 
      image: urgenceSolidaireImg, 
      label: t('about.contact.tw_label'), 
      href: 'https://twitter.com', 
      color: 'twitter'   
    },
    { 
      icon: Linkedin, 
      image: impactProImg, 
      label: t('about.contact.li_label'), 
      href: 'https://linkedin.com', 
      color: 'linkedin'  
    },
  ];

  return (
    <div className="au" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>

      {/* Progress bar */}
      <div className="au-progress" style={{ width: `${scrollPct}%` }} aria-hidden="true" />

      {/* ══════════════════════════════
          HERO
      ══════════════════════════════ */}
      <section className="au-hero">
        <div className="au-hero-bg">
          <img src={heroBg} alt="" className="au-hero-img" aria-hidden="true" />
          <div className="au-hero-overlay au-hero-overlay--dark" />
          <div className="au-hero-overlay au-hero-overlay--gradient" />
          <div className="au-hero-grain" aria-hidden="true" />
        </div>

        <div className="au-hero-content">
          <div className="au-hero-badge" data-reveal>
            <Sparkles size={13} />
            <span>{t('about.hero.badge')}</span>
          </div>

          <h1 className="au-hero-title" data-reveal>
            {t('about.hero.title_part1')}<br />
            <em dangerouslySetInnerHTML={{ __html: t('about.hero.title_part2') }} />
          </h1>

          <p className="au-hero-sub" data-reveal>
            {t('about.hero.subtitle')}
          </p>

          <div className="au-hero-actions" data-reveal>
            <button className="au-btn au-btn--primary au-btn--lg" onClick={() => navigate('/register-donneur')}>
              <Heart size={17} fill="currentColor" />
              {t('about.hero.btn_donor')}
            </button>
            <button className="au-btn au-btn--ghost au-btn--lg" onClick={() => navigate('/associations')}>
              <Globe size={16} />
              {t('about.hero.btn_actions')}
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="au-hero-trust" data-reveal>
            <span><Shield size={14} /> {t('about.hero.trust_secure')}</span>
            <span className="au-sep" />
            <span><Eye size={14} /> {t('about.hero.trust_transparency')}</span>
            <span className="au-sep" />
            <span><Zap size={14} /> {t('about.hero.trust_impact')}</span>
          </div>
        </div>

        <button
          className="au-hero-scroll"
          onClick={() => document.querySelector('.au-story')?.scrollIntoView({ behavior: 'smooth' })}
          aria-label={t('about.hero.scroll_down')}
        >
          <ChevronDown size={22} />
          <span>{t('about.hero.scroll_down')}</span>
        </button>
      </section>

      {/* ══════════════════════════════
          STORY
      ══════════════════════════════ */}
      <section className="au-story au-section">
        <div className="au-container">
          <div className="au-section-head" data-reveal>
            <div className="au-tag"><Sparkles size={12} /> {t('about.story.tag')}</div>
            <h2 className="au-section-title" dangerouslySetInnerHTML={{ __html: t('about.story.title') }} />
          </div>

          <div className="au-story-grid">
            {/* Text */}
            <div className="au-story-text">
              <div className="au-quote" data-reveal>
                <Quote size={20} className="au-quote-icon" />
                <p>{t('about.story.quote')}</p>
              </div>

              <p className="au-para" data-reveal>
                <span dangerouslySetInnerHTML={{ __html: t('about.story.para1') }} />
              </p>
              <p className="au-para" data-reveal>
                <span dangerouslySetInnerHTML={{ __html: t('about.story.para2') }} />
              </p>

              <div className="au-story-stats" data-reveal>
                {storyStats.map((s, i) => (
                  <div key={i} className="au-story-stat">
                    <div className="au-story-stat-val"><Counter target={s.value} /></div>
                    <div className="au-story-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Image */}
            <div className="au-story-visual" data-reveal>
              <div className="au-story-img-wrap">
                <img src={charityImg} alt="Action solidaire en Tunisie" className="au-story-img" />
                <div className="au-story-img-badge">
                  <Users size={14} />
                  <span>{t('about.story.img_badge')}</span>
                </div>
              </div>
              <div className="au-story-ring" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          VALUES
      ══════════════════════════════ */}
      <section className="au-values au-section">
        <div className="au-container">
          <div className="au-section-head au-section-head--center" data-reveal>
            <div className="au-tag"><Heart size={12} fill="currentColor" /> {t('about.values.tag')}</div>
            <h2 className="au-section-title" dangerouslySetInnerHTML={{ __html: t('about.values.title') }} />
            <p className="au-section-sub">{t('about.values.subtitle')}</p>
          </div>

          <div className="au-values-grid">
            {values.map((item, i) => {
              const Icon = item.icon;
              return (
                <article key={i} className={`au-value-card au-value-card--${item.color}`} data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
                  <div className="au-value-top">
                    <span className="au-value-num">{item.number}</span>
                    <div className="au-value-icon"><Icon size={22} /></div>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                  <div className="au-value-arrow"><ArrowRight size={15} /></div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          CONTACT
      ══════════════════════════════ */}
      <section className="au-contact au-section">
        <div className="au-container">
          <div className="au-section-head au-section-head--center" data-reveal>
            <div className="au-tag"><Handshake size={12} /> {t('about.contact.tag')}</div>
            <h2 className="au-section-title" dangerouslySetInnerHTML={{ __html: t('about.contact.title') }} />
            <p className="au-section-sub">{t('about.contact.subtitle')}</p>
          </div>

          <div className="au-contact-grid">
            {contactItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <a
                  key={i}
                  href={item.href || undefined}
                  className={`au-contact-card${item.href ? ' au-contact-card--link' : ''}`}
                  target={item.href?.startsWith('http') ? '_blank' : undefined}
                  rel={item.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                  data-reveal
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <div className="au-contact-img-wrap">
                    <img src={item.image} alt="" className="au-contact-img" />
                    <div className="au-contact-img-overlay" />
                  </div>
                  <div className="au-contact-body">
                    <div className="au-contact-icon"><Icon size={18} /></div>
                    <h3>{item.title}</h3>
                    <span className="au-contact-val">{item.value}</span>
                    {item.note && <p className="au-contact-note">{item.note}</p>}
                  </div>
                  {item.href && <ExternalLink size={13} className="au-contact-ext" />}
                </a>
              );
            })}
          </div>

          {/* Social */}
          <div className="au-social" data-reveal>
            <h3 className="au-social-title">{t('about.contact.social_title')}</h3>
            <p className="au-social-sub">{t('about.contact.social_sub')}</p>
            <div className="au-social-grid">
              {socialItems.map((item, i) => {
                const Icon = item.icon;
                return (
                  <a key={i} href={item.href} target="_blank" rel="noopener noreferrer"
                    className={`au-social-card au-social-card--${item.color}`}
                    style={{ transitionDelay: `${i * 60}ms` }}
                  >
                    <img src={item.image} alt="" className="au-social-img" />
                    <div className="au-social-overlay" />
                    <div className="au-social-content">
                      <div className="au-social-icon"><Icon size={18} /></div>
                      <span>{item.label}</span>
                    </div>
                    <ArrowRight size={14} className="au-social-arrow" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Bottom image */}
          <div className="au-join-visual" data-reveal>
            <div className="au-join-img-wrap">
              <img src={rejoindreImg} alt="Communauté Don'Act en action" className="au-join-img" />
              <div className="au-join-overlay" />
              <div className="au-join-caption">
                <Heart size={14} fill="currentColor" />
                <span>{t('about.contact.join_caption')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          CTA FINAL
      ══════════════════════════════ */}
      <section className="au-cta">
        <div className="au-cta-glow" aria-hidden="true" />
        <div className="au-cta-inner">
          <div className="au-cta-icon" data-reveal>
            <Sparkles size={28} />
          </div>
          <h2 className="au-cta-title" data-reveal>
            <span dangerouslySetInnerHTML={{ __html: t('about.cta.title') }} />
          </h2>
          <p className="au-cta-sub" data-reveal>
            {t('about.cta.subtitle')}
          </p>
          <button className="au-btn au-btn--white au-btn--xl" data-reveal onClick={() => navigate('/register-donneur')}>
            <Heart size={18} fill="currentColor" />
            {t('about.cta.btn')}
            <ArrowRight size={17} />
          </button>
          <p className="au-cta-note" data-reveal>
            <Shield size={13} /> {t('about.cta.note')}
          </p>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;