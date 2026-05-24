import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import {
  Search, Filter, X, MapPin, Users, Star, Award, Building2,
  ChevronDown, ChevronUp, RefreshCw, QrCode, ExternalLink,
  GraduationCap, Heart, Utensils, Home, AlertTriangle, BookOpen, Package
} from 'lucide-react';
import './AssociationsListPage.css';
import { useTranslation } from 'react-i18next';
import educationImg  from '../assets/education.png';
import santeImg      from '../assets/sante.png';
import alimentationImg from '../assets/alimentation.png';
import logementImg   from '../assets/logement.jpg';
import urgenceImg    from '../assets/urgence.png';
import formationImg  from '../assets/formation.jpg';
import autreImg      from '../assets/autre.png';
const API_BASE = 'http://192.168.1.21:5000';
const CATEGORY_IMAGES = {
  education:  educationImg,
  health:     santeImg,
  food:       alimentationImg,
  housing:    logementImg,
  emergency:  urgenceImg,
  skills:     formationImg,
  other:      autreImg,
};
const CATEGORY_ICONS = {
  education: GraduationCap,
  health:    Heart,
  food:      Utensils,
  housing:   Home,
  emergency: AlertTriangle,
  skills:    BookOpen,
  other:     Package,
};
const DEFAULT_CATEGORIES = [
  { id: 1, value: 'education', label: 'Éducation'   },
  { id: 2, value: 'health',    label: 'Santé'        },
  { id: 3, value: 'food',      label: 'Alimentation' },
  { id: 4, value: 'housing',   label: 'Logement'     },
  { id: 5, value: 'emergency', label: 'Urgence'      },
  { id: 6, value: 'skills',    label: 'Formation'    },
  { id: 7, value: 'other',     label: 'Autre'        },
];
const AssociationsListPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [associations,      setAssociations]      = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [categories,        setCategories]        = useState(DEFAULT_CATEGORIES);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [searchQuery,       setSearchQuery]       = useState('');
  const [selectedCategories,setSelectedCategories]= useState([]);
  const [showFilters,       setShowFilters]       = useState(false);
  /* ── fetch categories ── */
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const res  = await axios.get(`${API_BASE}/categories`);
        const list = Array.isArray(res.data) ? res.data : [];
        const normalized = list
          .filter(c => c?.value && c?.label)
          .map(c => ({
            id:    c.id ?? c.value,
            value: String(c.value),
            label: String(c.label),
            img:   c.img || c.icon || c.image_url || null,
          }));
        if (normalized.length > 0) setCategories(normalized);
      } catch (err) { console.error('fetchCategories error:', err); }
      finally { setCategoriesLoading(false); }
    };
    fetchCategories();
  }, []);
  const categoryLabelMap = useMemo(() => {
    const map = new Map();
    categories.forEach(c => map.set(String(c.value), String(c.label)));
    return map;
  }, [categories]);
  const categoryLabel = value => categoryLabelMap.get(String(value)) || value || '—';
  /* ── fetch associations ── */
  useEffect(() => {
    const fetchAssociations = async () => {
      try {
        setLoading(true);
        const params = selectedCategories.length > 0 ? { categories: selectedCategories.join(',') } : {};
        const res = await axios.get(`${API_BASE}/associations/public`, { params });
        setAssociations(Array.isArray(res.data) ? res.data : []);
      } catch (err) { console.error('fetchAssociations error:', err); setAssociations([]); }
      finally { setLoading(false); }
    };
    fetchAssociations();
  }, [selectedCategories]);
  /* ── filter client-side ── */
  const filteredAssociations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = [...(associations || [])];
    if (!q) return list;
    return list.filter(a => {
      const nom     = (a.nom         || '').toLowerCase();
      const adresse = (a.adresse     || '').toLowerCase();
      const cat     = String(a.categorie || '').toLowerCase();
      const desc    = (a.description || '').toLowerCase();
      return nom.includes(q) || adresse.includes(q) || cat.includes(q) || desc.includes(q);
    });
  }, [associations, searchQuery]);
  const getStars = (score = 0) => {
    const normalized = Math.round((Number(score) / 100) * 5);
    return Array.from({ length: 5 }, (_, i) => i < normalized);
  };
  const toggleCategory = value =>
    setSelectedCategories(prev =>
      prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]
    );
  const resetFilters = () => { setSearchQuery(''); setSelectedCategories([]); };
  const handleCardClick = id => navigate(`/association/${id}`);
  const handleCardKey   = (e, id) => { if (e.key === 'Enter') navigate(`/association/${id}`); };
  const isPlural        = !loading && filteredAssociations.length !== 1;
  const subtitleKey     = isPlural ? 'associations.header_subtitle_plural' : 'associations.header_subtitle_singular';
  const filterCountKey  = selectedCategories.length > 1 ? 'associations.filter_count_plural' : 'associations.filter_count_singular';
  return (
    <div className="al-page" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* ── HERO HEADER ── */}
      <header className="al-hero">
        {/* decorative orbs */}
        <div className="al-hero-orb al-hero-orb--1" aria-hidden="true" />
        <div className="al-hero-orb al-hero-orb--2" aria-hidden="true" />
        <div className="al-hero-orb al-hero-orb--3" aria-hidden="true" />
        <div className="al-hero-grid"               aria-hidden="true" />

        <div className="al-hero-content">
          <div className="al-hero-icon-wrap">
            <Building2 size={28} />
          </div>
          <h1 className="al-hero-title">{t('associations.header_title')}</h1>
          <p className="al-hero-subtitle">
            
            {' '}{t(subtitleKey)}
          </p>
        </div>
      </header>
      {/* ── TOOLBAR ── */}
      <div className="al-toolbar">
        {/* Search */}
        <div className="al-search-wrap">
          <Search size={18} className="al-search-icon" />
          <input
            type="text"
            placeholder={t('associations.search_placeholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="al-search-input"
          />
          {(searchQuery || selectedCategories.length > 0) && (
            <button type="button" className="al-search-clear" onClick={resetFilters} aria-label={t('associations.btn_reset')}>
              <X size={15} />
            </button>
          )}
        </div>
        {/* Filter controls */}
        <div className="al-filter-bar">
          <button
            type="button"
            className={`al-filter-toggle ${showFilters ? 'al-filter-toggle--open' : ''}`}
            onClick={() => setShowFilters(v => !v)}
          >
            <Filter size={15} />
            <span>{t('associations.filter_btn')}</span>
            {showFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {selectedCategories.length > 0 && (
              <span className="al-filter-badge">{selectedCategories.length}</span>
            )}
          </button>

          {selectedCategories.length > 0 && (
            <button type="button" className="al-filter-reset" onClick={() => setSelectedCategories([])}>
              <RefreshCw size={13} />
              <span>{t('associations.filter_reset')}</span>
            </button>
          )}
        </div>
        {/* Filter Panel */}
        {showFilters && (
          <div className="al-filter-panel">
            <div className="al-filter-panel-head">
              <h3 className="al-filter-panel-title">{t('associations.filter_title')}</h3>
              {selectedCategories.length > 0 && (
                <span className="al-filter-count">
                  {t(filterCountKey).replace('{count}', selectedCategories.length)}
                </span>
              )}
            </div>
            <div className="al-chips-row">
              {categoriesLoading ? (
                <div className="al-chips-loading">
                  <div className="al-spinner-sm" />
                  <span>{t('associations.loading_categories')}</span>
                </div>
              ) : categories.map(cat => {
                const active = selectedCategories.includes(cat.value);
                const Icon   = CATEGORY_ICONS[cat.value] || Package;
                const img    = cat.img
                  ? (cat.img.startsWith('http') ? cat.img : `${API_BASE}/upload/${cat.img}`)
                  : (CATEGORY_IMAGES[cat.value] || autreImg);

                return (
                  <button
                    key={cat.id ?? cat.value}
                    type="button"
                    onClick={() => toggleCategory(cat.value)}
                    className={`al-chip ${active ? 'al-chip--active' : ''}`}
                    aria-pressed={active}
                  >
                    <span className="al-chip-img-wrap">
                      {img
                        ? <img src={img} alt="" className="al-chip-img" />
                        : <Icon size={15} />
                      }
                    </span>
                    <span className="al-chip-label">{cat.label}</span>
                    {active && <span className="al-chip-check" aria-hidden="true">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {/* ── MAIN GRID ── */}
      <main className="al-main">
        {loading ? (
          <div className="al-skeleton-grid">
            {[...Array(6)].map((_, i) => <div key={i} className="al-card al-card--skeleton" />)}
          </div>
        ) : filteredAssociations.length === 0 ? (
          <div className="al-empty">
            <div className="al-empty-icon"><Search size={44} /></div>
            <h2>{t('associations.empty_title')}</h2>
            <p>{t('associations.empty_sub')}</p>
            <button className="al-btn al-btn--primary" onClick={resetFilters}>
              <RefreshCw size={15} />
              {t('associations.empty_btn')}
            </button>
          </div>
        ) : (
          <div className="al-grid">
            {filteredAssociations.map(assoc => {
              const beneficiaries = Number(assoc.beneficiaries_count || 0);
              const stars         = getStars(assoc.score_impact);
              const CategoryIcon  = CATEGORY_ICONS[assoc.categorie] || Package;
              return (
                <article
                  key={assoc.id}
                  className="al-card"
                  onClick={() => handleCardClick(assoc.id)}
                  onKeyDown={e => handleCardKey(e, assoc.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${t('associations.card_cta')} – ${assoc.nom}`}
                >
                  {/* accent stripe */}
                  <div className="al-card-stripe" aria-hidden="true" />
                  {/* Header */}
                  <div className="al-card-head">
                    <div className="al-card-logo">
                      {assoc.logo ? (
                        <img
                          src={`${API_BASE}/upload/${assoc.logo}`}
                          alt=""
                          className="al-card-logo-img"
                          onError={e => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('al-card-logo-placeholder--hidden');
                          }}
                        />
                      ) : null}
                      <div className={`al-card-logo-placeholder ${assoc.logo ? 'al-card-logo-placeholder--hidden' : ''}`}>
                        {String(assoc.nom || 'A')[0]?.toUpperCase()}
                      </div>
                    </div>

                    <div className="al-card-meta">
                      <div className="al-card-title-row">
                        <h3 className="al-card-title">{assoc.nom}</h3>
                        <span className="al-card-cat">
                          <CategoryIcon size={11} />
                          {categoryLabel(assoc.categorie)}
                        </span>
                      </div>
                      {assoc.adresse && (
                        <div className="al-card-location">
                          <MapPin size={13} />
                          <span>{assoc.adresse}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Body */}
                  <div className="al-card-body">
                    <p className="al-card-desc">
                      {assoc.description || t('associations.card_no_desc')}
                    </p>

                    <div className="al-card-metrics">
                      <div className="al-card-metric">
                        <Award size={14} className="al-card-metric-icon" />
                        <div>
                          <span className="al-card-metric-label">{t('associations.card_rank_label')}</span>
                          <span className="al-card-metric-val">{assoc.rang ? `#${assoc.rang}` : '—'}</span>
                        </div>
                      </div>
                      <div className="al-card-metric">
                        <Star size={14} className="al-card-metric-icon" />
                        <div>
                          <span className="al-card-metric-label">{t('associations.card_score_label')}</span>
                          <span className="al-card-metric-val">{assoc.score_impact ?? 0}/100</span>
                        </div>
                      </div>
                    </div>

                    <div className="al-card-stars">
                      {stars.map((active, i) => (
                        <Star
                          key={i} size={14}
                          className={active ? 'al-star--on' : 'al-star--off'}
                          fill={active ? 'currentColor' : 'none'}
                        />
                      ))}
                    </div>

                    <div className="al-card-beneficiaries">
                      <Users size={15} />
                      <span>
                        {beneficiaries.toLocaleString(i18n.language === 'ar' ? 'ar-TN' : 'fr-FR')}
                        {' '}{t('associations.card_beneficiaries')}
                      </span>
                    </div>
                  </div>
                  {/* Footer */}
                  <div className="al-card-foot">
                    <div className="al-card-qr">
                      <QrCode size={16} />
                      <QRCodeSVG
  value={`http://192.168.1.21:3000/association/${assoc.id}`}  /*don't change this ligne it's correct*/ 
                        size={52}
                        bgColor="transparent"
                        fgColor="var(--al-navy)"
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                    <button
                      className="al-card-cta"
                      onClick={e => { e.stopPropagation(); handleCardClick(assoc.id); }}
                    >
                      <span>{t('associations.card_cta')}</span>
                      <ExternalLink size={13} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
export default AssociationsListPage;