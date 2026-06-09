import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import './MapPage.css';
import {
  MapPin, Search, X, ExternalLink, Tag,
  Building2, Layers, ChevronRight, Globe, AlertCircle,
} from 'lucide-react';
import i18n from '../i18n/i18n';

const API_KEY = 'AIzaSyCKIfnT2131JNx9hi5lVRXjMyurZ-gBIf4';

/* ── Category color palette ─────────────────────────────────── */
const CATEGORY_COLORS = {
  'Éducation':     '#6366f1',
  'Santé':         '#10b981',
  'Environnement': '#22c55e',
  'Humanitaire':   '#f59e0b',
  'Culture':       '#ec4899',
  'Sport':         '#3b82f6',
  'Social':        '#8b5cf6',
  'default':       '#534ab7',
};
const getCategoryColor = (cat) => CATEGORY_COLORS[cat] || CATEGORY_COLORS['default'];

/* ── SVG marker builder ─────────────────────────────────────── */
const buildMarkerIcon = (color, size = { w: 38, h: 50 }) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size.w}" height="${size.h}" viewBox="0 0 38 50">
    <defs>
      <filter id="s" x="-30%" y="-10%" width="160%" height="160%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="${color}" flood-opacity="0.45"/>
      </filter>
    </defs>
    <path d="M19 2C10.716 2 4 8.716 4 17c0 10.5 15 31 15 31s15-20.5 15-31C34 8.716 27.284 2 19 2z"
          fill="${color}" filter="url(#s)" stroke="white" stroke-width="1.5"/>
    <circle cx="19" cy="17" r="7" fill="white" opacity="0.92"/>
    <circle cx="19" cy="17" r="4" fill="${color}"/>
  </svg>`.trim();
  return {
    url:        'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new window.google.maps.Size(size.w, size.h),
    anchor:     new window.google.maps.Point(size.w / 2, size.h),
  };
};

/* ── Google Maps singleton loader ───────────────────────────── */
let gmapsPromise = null;
const loadGoogleMaps = () => {
  if (gmapsPromise) return gmapsPromise;
  gmapsPromise = new Promise((resolve) => {
    if (window.google?.maps?.Map) { resolve(); return; }
    const cb = '__gmapsReady__';
    window[cb] = () => { resolve(); delete window[cb]; };
    if (!document.getElementById('gmap-script')) {
      const s   = document.createElement('script');
      s.id      = 'gmap-script';
      const lang = i18n.language?.startsWith('ar') ? 'ar' : (i18n.language?.split('-')[0] || 'fr');
      s.src     = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&language=${lang}&loading=async&callback=${cb}`;
      s.async   = true;
      document.head.appendChild(s);
    }
  });
  return gmapsPromise;
};

/* ── Map styles ─────────────────────────────────────────────── */
function getDarkStyle() {
  return [
    { elementType: 'geometry',            stylers: [{ color: '#0d1424' }] },
    { elementType: 'labels.text.stroke',  stylers: [{ color: '#0d1424' }] },
    { elementType: 'labels.text.fill',    stylers: [{ color: '#6b7a99' }] },
    { featureType: 'administrative',      elementType: 'geometry',          stylers: [{ color: '#1a2540' }] },
    { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#8892b0' }] },
    { featureType: 'administrative.locality',elementType: 'labels.text.fill', stylers: [{ color: '#b0b8cc' }] },
    { featureType: 'poi',                 elementType: 'labels.text.fill',  stylers: [{ color: '#556080' }] },
    { featureType: 'poi.park',            elementType: 'geometry',          stylers: [{ color: '#0f1a2e' }] },
    { featureType: 'road',               elementType: 'geometry',          stylers: [{ color: '#1e2d4a' }] },
    { featureType: 'road',               elementType: 'geometry.stroke',   stylers: [{ color: '#111d30' }] },
    { featureType: 'road',               elementType: 'labels.text.fill',  stylers: [{ color: '#556080' }] },
    { featureType: 'road.highway',       elementType: 'geometry',          stylers: [{ color: '#253450' }] },
    { featureType: 'road.highway',       elementType: 'labels.text.fill',  stylers: [{ color: '#7a88a8' }] },
    { featureType: 'transit',            elementType: 'geometry',          stylers: [{ color: '#17243a' }] },
    { featureType: 'water',              elementType: 'geometry',          stylers: [{ color: '#060d1c' }] },
    { featureType: 'water',              elementType: 'labels.text.fill',  stylers: [{ color: '#1e3050' }] },
  ];
}

function getLightStyle() {
  return [
    { elementType: 'geometry',           stylers: [{ color: '#f0f4fa' }] },
    { elementType: 'labels.text.fill',   stylers: [{ color: '#334155' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
    { featureType: 'poi',                stylers: [{ visibility: 'simplified' }] },
    { featureType: 'transit',            stylers: [{ visibility: 'off' }] },
    { featureType: 'road',              elementType: 'geometry',         stylers: [{ color: '#ffffff' }] },
    { featureType: 'road',              elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
    { featureType: 'road.highway',      elementType: 'geometry',         stylers: [{ color: '#dde4f0' }] },
    { featureType: 'water',             elementType: 'geometry',         stylers: [{ color: '#bcd8f0' }] },
    { featureType: 'landscape',         elementType: 'geometry',         stylers: [{ color: '#eef2fa' }] },
    { featureType: 'poi.park',          elementType: 'geometry',         stylers: [{ color: '#d9ecd0' }] },
  ];
}

/* ════════════════════════════════════════════════════════════════
   Component
   ════════════════════════════════════════════════════════════════ */
const MapPage = () => {
  const { theme }        = useTheme();
  const { t, i18n }     = useTranslation();
  const navigate         = useNavigate();

  const mapRef           = useRef(null);
  const googleMapRef     = useRef(null);
  const markersRef       = useRef([]);

  const [associations,  setAssociations]  = useState([]);
  const [filtered,      setFiltered]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState(false);
  const [search,        setSearch]        = useState('');
  const [selectedCat,   setSelectedCat]   = useState('all');
  const [categories,    setCategories]    = useState(['all']);
  const [selectedAssoc, setSelectedAssoc] = useState(null);
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [mapReady,      setMapReady]      = useState(false);
  const [stats,         setStats]         = useState({ total: 0, withCoords: 0 });

  const isRtl = i18n.language?.startsWith('ar');

  /* RTL */
  useEffect(() => {
    document.documentElement.dir  = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language || 'fr';
    return () => { document.documentElement.dir = 'ltr'; };
  }, [i18n.language, isRtl]);

  /* 1. Fetch associations */
  useEffect(() => {
    (async () => {
      try {
        const res  = await axios.get('http://localhost:5000/associations/public');
        const data = res.data;
        setAssociations(data);
        setFiltered(data);
        setCategories(['all', ...new Set(data.map(a => a.categorie).filter(Boolean))]);
        setStats({ total: data.length, withCoords: data.filter(a => a.latitude && a.longitude).length });
      } catch {
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* 2. Filter */
  useEffect(() => {
    let r = associations;
    if (selectedCat !== 'all') {
      r = r.filter(a => {
        const translated = t(`categories.${a.categorie}`);
        return translated === selectedCat || a.categorie === selectedCat;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(a =>
        a.nom?.toLowerCase().includes(q) ||
        a.adresse?.toLowerCase().includes(q)
      );
    }
    setFiltered(r);
  }, [search, selectedCat, associations, t]);

  /* 3. Init map */
  useEffect(() => {
    loadGoogleMaps().then(() => {
      if (!mapRef.current || googleMapRef.current) return;
      const map = new window.google.maps.Map(mapRef.current, {
        center:           { lat: 33.8869, lng: 9.5375 },
        zoom:             7,
        styles:           theme === 'dark' ? getDarkStyle() : getLightStyle(),
        disableDefaultUI: true,
        zoomControl:      true,
        zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_CENTER },
      });
      googleMapRef.current = map;
      setMapReady(true);
    });
  }, []); // eslint-disable-line

  /* 4. Theme → map style */
  useEffect(() => {
    if (!googleMapRef.current) return;
    googleMapRef.current.setOptions({ styles: theme === 'dark' ? getDarkStyle() : getLightStyle() });
  }, [theme]);

  /* 5. Markers */
  useEffect(() => {
    if (!mapReady || !googleMapRef.current) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const bounds  = new window.google.maps.LatLngBounds();
    let hasCoords = false;

    filtered.forEach((assoc) => {
      const lat = parseFloat(assoc.latitude);
      const lng = parseFloat(assoc.longitude);
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
      hasCoords = true;
      const position = { lat, lng };
      bounds.extend(position);
      const color  = getCategoryColor(assoc.categorie);
      const marker = new window.google.maps.Marker({
        position,
        map:       googleMapRef.current,
        icon:      buildMarkerIcon(color),
        title:     assoc.nom,
        animation: window.google.maps.Animation.DROP,
      });
      marker.addListener('click', () => {
        setSelectedAssoc(assoc);
        googleMapRef.current.panTo(position);
        googleMapRef.current.setZoom(14);
      });
      marker.addListener('mouseover', () => marker.setIcon(buildMarkerIcon(color, { w: 46, h: 60 })));
      marker.addListener('mouseout',  () => marker.setIcon(buildMarkerIcon(color)));
      markersRef.current.push(marker);
    });

    if (hasCoords) {
      googleMapRef.current.fitBounds(bounds);
      if (filtered.length === 1) googleMapRef.current.setZoom(14);
    }
  }, [filtered, mapReady]);

  /* 6. Focus marker from sidebar */
  const focusMarker = useCallback((assoc) => {
    const lat = parseFloat(assoc.latitude);
    const lng = parseFloat(assoc.longitude);
    if (!lat || !lng || !googleMapRef.current) return;
    googleMapRef.current.panTo({ lat, lng });
    googleMapRef.current.setZoom(15);
    setSelectedAssoc(assoc);
  }, []);

  const displayCategory = (cat) => {
    if (!cat) return '';
    const tr = t(`categories.${cat}`);
    return tr !== `categories.${cat}` ? tr : cat;
  };

  const getInitials = (name = '') =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className={`mp ${theme}`} dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ══ HEADER ══════════════════════════════════════════════ */}
      <header className="mp-header">
        <div className="mp-header-inner">

          <div className="mp-title-group">
            <div className="mp-icon-wrap" aria-hidden="true">
              <Globe size={20} />
            </div>
            <div>
              <h1 className="mp-title">{t('map.title')}</h1>
              <p className="mp-subtitle">
                <span className="mp-stat">{stats.withCoords}</span>{' '}
                {t('map.located')}{' '}
                <span className="mp-stat">{stats.total}</span>{' '}
                {t('map.registered')}
              </p>
            </div>
          </div>

          <div className="mp-controls">
            {/* Search */}
            <div className="mp-search-wrap">
              <Search size={15} className="mp-search-icon" aria-hidden="true" />
              <input
                type="text"
                placeholder={t('search.placeholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="mp-search-input"
                aria-label={t('search.label')}
              />
              {search && (
                <button
                  className="mp-search-clear"
                  onClick={() => setSearch('')}
                  aria-label={t('search.clear')}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Category chips */}
            <div className="mp-chips" role="tablist" aria-label={t('categories.label')}>
              {categories.map(cat => (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={selectedCat === cat}
                  className={`mp-chip ${selectedCat === cat ? 'active' : ''}`}
                  style={selectedCat === cat && cat !== 'all'
                    ? { '--chip-color': getCategoryColor(cat) } : {}}
                  onClick={() => setSelectedCat(cat)}
                >
                  {cat !== 'all' && (
                    <span className="chip-dot" style={{ background: getCategoryColor(cat) }} aria-hidden="true" />
                  )}
                  {cat === 'all' ? t('categories.all') : displayCategory(cat)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ══ BODY ════════════════════════════════════════════════ */}
      <div className="mp-body">

        {/* Sidebar toggle */}
        <button
          className={`mp-toggle ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(v => !v)}
          aria-label={sidebarOpen ? t('sidebar.collapse') : t('sidebar.expand')}
          aria-expanded={sidebarOpen}
        >
          <Layers size={15} aria-hidden="true" />
          <ChevronRight size={13} className={`mp-toggle-chevron ${sidebarOpen ? 'rotated' : ''}`} aria-hidden="true" />
        </button>

        {/* ── SIDEBAR ── */}
        <aside className={`mp-sidebar ${sidebarOpen ? 'open' : ''}`} aria-hidden={!sidebarOpen}>
          <div className="mp-sidebar-count">
            <span>{filtered.length}</span>
            {' '}{t(filtered.length !== 1 ? 'sidebar.results_plural' : 'sidebar.results')}
          </div>

          <div className="mp-sidebar-list" role="list">

            {/* Error state */}
            {fetchError && (
              <div className="mp-sidebar-state">
                <AlertCircle size={28} className="state-icon state-error" />
                <p>{t('map.fetchError', { defaultValue: 'Impossible de charger les associations.' })}</p>
              </div>
            )}

            {/* Loading skeletons */}
            {loading && !fetchError &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="mp-skeleton" aria-hidden="true" />
              ))
            }

            {/* Empty state */}
            {!loading && !fetchError && filtered.length === 0 && (
              <div className="mp-sidebar-state">
                <MapPin size={30} className="state-icon" aria-hidden="true" />
                <p>{t('sidebar.empty')}</p>
              </div>
            )}

            {/* Cards */}
            {!loading && !fetchError && filtered.map(assoc => {
              const hasCoords  = assoc.latitude && assoc.longitude;
              const color      = getCategoryColor(assoc.categorie);
              const isSelected = selectedAssoc?.id === assoc.id;
              return (
                <div
                  key={assoc.id}
                  className={`mp-card ${isSelected ? 'active' : ''} ${!hasCoords ? 'no-coords' : ''}`}
                  onClick={() => hasCoords ? focusMarker(assoc) : setSelectedAssoc(assoc)}
                  style={isSelected ? { '--card-accent': color } : {}}
                  role="listitem"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && hasCoords && focusMarker(assoc)}
                  aria-label={assoc.nom}
                  aria-current={isSelected ? 'true' : undefined}
                >
                  <div className="mp-card-media">
                    {assoc.logo
                      ? <img
                          src={`http://localhost:5000/upload/${assoc.logo}`}
                          alt=""
                          className="mp-card-logo"
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                      : <div className="mp-card-avatar" style={{ background: color }} aria-hidden="true">
                          {getInitials(assoc.nom)}
                        </div>
                    }
                    {/* Color accent bar */}
                    <span className="mp-card-color-bar" style={{ background: color }} aria-hidden="true" />
                  </div>

                  <div className="mp-card-body">
                    <p className="mp-card-name">{assoc.nom}</p>
                    {assoc.categorie && (
                      <span className="mp-card-cat" style={{ color }}>
                        <Tag size={10} aria-hidden="true" />
                        {displayCategory(assoc.categorie)}
                      </span>
                    )}
                    {assoc.adresse && (
                      <span className="mp-card-addr">
                        <MapPin size={10} aria-hidden="true" />
                        {assoc.adresse}
                      </span>
                    )}
                  </div>

                  {!hasCoords && (
                    <span className="mp-card-noloc" title={t('assoc.noLocation')} aria-label={t('assoc.noLocation')}>
                      <MapPin size={12} aria-hidden="true" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── MAP ── */}
        <div className="mp-map-wrap">
          <div
            ref={mapRef}
            className="mp-map"
            role="application"
            aria-label={t('map.ariaLabel')}
          />

          {!mapReady && (
            <div className="mp-map-loading" aria-live="polite">
              <div className="mp-map-spinner" aria-hidden="true" />
              <p>{t('map.loading')}</p>
            </div>
          )}

          {/* Info panel */}
          {selectedAssoc && (
            <div
              className="mp-panel"
              style={{ '--panel-color': getCategoryColor(selectedAssoc.categorie) }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="mp-panel-title"
            >
              <button
                className="mp-panel-close"
                onClick={() => setSelectedAssoc(null)}
                aria-label={t('common.close')}
              >
                <X size={15} />
              </button>

              <div className="mp-panel-top">
                {selectedAssoc.logo
                  ? <img
                      src={`http://localhost:5000/upload/${selectedAssoc.logo}`}
                      alt=""
                      className="mp-panel-logo"
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                    />
                  : <div
                      className="mp-panel-avatar"
                      style={{ background: getCategoryColor(selectedAssoc.categorie) }}
                      aria-hidden="true"
                    >
                      {getInitials(selectedAssoc.nom)}
                    </div>
                }
                <div className="mp-panel-meta">
                  <h3 id="mp-panel-title" className="mp-panel-name">
                    {selectedAssoc.nom}
                  </h3>
                  {selectedAssoc.categorie && (
                    <span className="mp-panel-badge">
                      <Tag size={10} aria-hidden="true" />
                      {displayCategory(selectedAssoc.categorie)}
                    </span>
                  )}
                </div>
              </div>

              {selectedAssoc.adresse && (
                <div className="mp-panel-row">
                  <MapPin size={13} className="mp-panel-row-icon" aria-hidden="true" />
                  <span>{selectedAssoc.adresse}</span>
                </div>
              )}

              {selectedAssoc.description && (
                <p className="mp-panel-desc">
                  {selectedAssoc.description.length > 130
                    ? selectedAssoc.description.slice(0, 130) + '…'
                    : selectedAssoc.description}
                </p>
              )}

              <button
                className="mp-panel-btn"
                onClick={() => navigate(`/association/${selectedAssoc.id}`)}
              >
                <Building2 size={14} aria-hidden="true" />
                {t('assoc.viewProfile')}
                <ExternalLink size={12} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapPage;