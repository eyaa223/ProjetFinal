import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import './MapPage.css';
import { MapPin, Search, X, ExternalLink, Tag, Building2, Layers, ChevronRight } from 'lucide-react';
import i18n from '../i18n/i18n';
const API_KEY = 'AIzaSyCKIfnT2131JNx9hi5lVRXjMyurZ-gBIf4';

const CATEGORY_COLORS = {
  'Éducation':     '#6366f1',
  'Santé':         '#10b981',
  'Environnement': '#22c55e',
  'Humanitaire':   '#f59e0b',
  'Culture':       '#ec4899',
  'Sport':         '#3b82f6',
  'Social':        '#8b5cf6',
  'default':       '#14b8a6',
};
const getCategoryColor = (cat) => CATEGORY_COLORS[cat] || CATEGORY_COLORS['default'];

// ── SVG marker encodé pour google.maps.Marker ─────────────────────
const buildMarkerIcon = (color) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="38" height="50" viewBox="0 0 38 50">
      <defs>
        <filter id="s" x="-30%" y="-10%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3"
            flood-color="${color}" flood-opacity="0.45"/>
        </filter>
      </defs>
      <path d="M19 2C10.716 2 4 8.716 4 17c0 10.5 15 31 15 31s15-20.5 15-31C34 8.716 27.284 2 19 2z"
            fill="${color}" filter="url(#s)" stroke="white" stroke-width="1.5"/>
      <circle cx="19" cy="17" r="7" fill="white" opacity="0.92"/>
      <circle cx="19" cy="17" r="4" fill="${color}"/>
    </svg>`.trim();
  return {
    url:        'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new window.google.maps.Size(38, 50),
    anchor:     new window.google.maps.Point(19, 50),
  };
};

// ── Charge Google Maps UNE seule fois ─────────────────────────────────
let gmapsPromise = null;
const loadGoogleMaps = () => {
  if (gmapsPromise) return gmapsPromise;
  gmapsPromise = new Promise((resolve) => {
    if (window.google?.maps?.Map) { resolve(); return; }
    const cb = '__gmapsReady__';
    window[cb] = () => { resolve(); delete window[cb]; };
    if (!document.getElementById('gmap-script')) {
      const s = document.createElement('script');
      s.id    = 'gmap-script';
      const lang = i18n.language?.startsWith('ar') ? 'ar' : (i18n.language?.split('-')[0] || 'fr');
      s.src   = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&language=${lang}&loading=async&callback=${cb}`;
      s.async = true;
      document.head.appendChild(s);
    }
  });
  return gmapsPromise;
};

function getDarkStyle() {
  return [
    { elementType: 'geometry', stylers: [{ color: '#0f1117' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0f1117' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8892a4' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1e2433' }] },
    { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9aa3af' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#c4cbd8' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#131b2e' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e2433' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#141821' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2a3448' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#8892a4' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1a2132' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#070d1a' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#2a3a4c' }] },
  ];
}

function getLightStyle() {
  return [
    { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8f7' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f0f4f8' }] },
  ];
}

// ════════════════════════════════════════════════════════════════════════════
const MapPage = () => {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const navigate  = useNavigate();

  const mapRef       = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef   = useRef([]);

  const [associations,  setAssociations]  = useState([]);
  const [filtered,      setFiltered]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [selectedCat,   setSelectedCat]   = useState('all');
  const [categories,    setCategories]    = useState(['all']);
  const [selectedAssoc, setSelectedAssoc] = useState(null);
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [mapReady,      setMapReady]      = useState(false);
  const [stats,         setStats]         = useState({ total: 0, withCoords: 0 });

  // RTL support pour l'arabe
  useEffect(() => {
    const isAr = i18n.language?.startsWith('ar');
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language || 'fr';
    return () => { document.documentElement.dir = 'ltr'; };
  }, [i18n.language]);

  // 1. Charger associations
  useEffect(() => {
    (async () => {
      try {
        const res  = await axios.get('http://localhost:5000/associations/public');
        const data = res.data;
        setAssociations(data);
        setFiltered(data);
        const rawCats = ['all', ...new Set(data.map(a => a.categorie).filter(Boolean))];
        setCategories(rawCats);
        setStats({ 
          total: data.length, 
          withCoords: data.filter(a => a.latitude && a.longitude).length 
        });
      } catch (err) {
        console.error('Erreur associations:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 2. Filtrage
  useEffect(() => {
    let r = associations;
    if (selectedCat !== 'all') {
      r = r.filter(a => {
        const catKey = a.categorie;
        const translatedCat = t(`categories.${catKey}`);
        return translatedCat === selectedCat || catKey === selectedCat;
      });
    }
    if (search.trim()) {
      r = r.filter(a =>
        a.nom?.toLowerCase().includes(search.toLowerCase()) ||
        a.adresse?.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFiltered(r);
  }, [search, selectedCat, associations, t]);

  // 3. Init carte
  useEffect(() => {
    loadGoogleMaps().then(() => {
      if (!mapRef.current || googleMapRef.current) return;
      const map = new window.google.maps.Map(mapRef.current, {
        center:           { lat: 33.8869, lng: 9.5375 },
        zoom:             7,
        styles:           theme === 'dark' ? getDarkStyle() : getLightStyle(),
        disableDefaultUI: true,
        zoomControl:      true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_CENTER,
        },
      });
      googleMapRef.current = map;
      setMapReady(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 4. Thème → style carte
  useEffect(() => {
    if (!googleMapRef.current) return;
    googleMapRef.current.setOptions({
      styles: theme === 'dark' ? getDarkStyle() : getLightStyle(),
    });
  }, [theme]);

  // 5. Markers
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

      const marker = new window.google.maps.Marker({
        position,
        map:       googleMapRef.current,
        icon:      buildMarkerIcon(getCategoryColor(assoc.categorie)),
        title:     assoc.nom,
        animation: window.google.maps.Animation.DROP,
      });

      marker.addListener('click', () => {
        setSelectedAssoc(assoc);
        googleMapRef.current.panTo(position);
        googleMapRef.current.setZoom(14);
      });

      // Hover effect
      marker.addListener('mouseover', () => {
        const color = getCategoryColor(assoc.categorie);
        const svg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="46" height="60" viewBox="0 0 38 50">
            <defs><filter id="s"><feDropShadow dx="0" dy="4" stdDeviation="4"
              flood-color="${color}" flood-opacity="0.55"/></filter></defs>
            <path d="M19 2C10.716 2 4 8.716 4 17c0 10.5 15 31 15 31s15-20.5 15-31C34 8.716 27.284 2 19 2z"
                  fill="${color}" filter="url(#s)" stroke="white" stroke-width="1.5"/>
            <circle cx="19" cy="17" r="7" fill="white" opacity="0.92"/>
            <circle cx="19" cy="17" r="4" fill="${color}"/>
          </svg>`.trim();
        marker.setIcon({
          url:        'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
          scaledSize: new window.google.maps.Size(46, 60),
          anchor:     new window.google.maps.Point(23, 60),
        });
      });

      marker.addListener('mouseout', () => {
        marker.setIcon(buildMarkerIcon(getCategoryColor(assoc.categorie)));
      });

      markersRef.current.push(marker);
    });

    if (hasCoords) {
      googleMapRef.current.fitBounds(bounds);
      if (filtered.length === 1) googleMapRef.current.setZoom(14);
    }
  }, [filtered, mapReady]);

  // 6. Focus depuis sidebar
  const focusMarker = useCallback((assoc) => {
    const lat = parseFloat(assoc.latitude);
    const lng = parseFloat(assoc.longitude);
    if (!lat || !lng || !googleMapRef.current) return;
    googleMapRef.current.panTo({ lat, lng });
    googleMapRef.current.setZoom(15);
    setSelectedAssoc(assoc);
  }, []);

  // Helper: afficher le nom de catégorie traduit
  const displayCategory = (cat) => {
    if (!cat) return '';
    const translated = t(`categories.${cat}`);
    return translated !== `categories.${cat}` ? translated : cat;
  };

  return (
    <div className={`mappage ${theme}`} dir={i18n.language?.startsWith('ar') ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div className="mappage-header">
        <div className="mappage-header-inner">
          <div className="mappage-title-group">
            <div className="mappage-icon-wrap"><MapPin size={22} /></div>
            <div>
              <h1 className="mappage-title">{t('map.title')}</h1>
              <p className="mappage-subtitle">
                <span className="mappage-stat">{stats.withCoords}</span> {t('map.located')}{' '}
                <span className="mappage-stat">{stats.total}</span> {t('map.registered')}
              </p>
            </div>
          </div>

          <div className="mappage-controls">
            <div className="mappage-search-wrap">
              <Search size={15} className="mappage-search-icon" />
              <input
                type="text"
                placeholder={t('search.placeholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="mappage-search-input"
                aria-label={t('search.label')}
              />
              {search && (
                <button className="mappage-search-clear" onClick={() => setSearch('')} aria-label={t('search.clear')}>
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="mappage-cat-scroll" role="tablist">
              {categories.map(cat => (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={selectedCat === cat}
                  className={`mappage-cat-chip ${selectedCat === cat ? 'active' : ''}`}
                  style={selectedCat === cat && cat !== 'all'
                    ? { '--chip-color': getCategoryColor(cat) } : {}}
                  onClick={() => setSelectedCat(cat)}
                >
                  {cat !== 'all' && <span className="chip-dot" style={{ background: getCategoryColor(cat) }} />}
                  {cat === 'all' ? t('categories.all') : displayCategory(cat)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mappage-body">
        <button
          className={`mappage-sidebar-toggle ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(v => !v)}
          aria-label={sidebarOpen ? t('sidebar.collapse') : t('sidebar.expand')}
          aria-expanded={sidebarOpen}
        >
          <Layers size={16} />
          <ChevronRight size={14} className={`toggle-chevron ${sidebarOpen ? 'rotated' : ''}`} />
        </button>

        <aside className={`mappage-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-count">
            {filtered.length} {t(filtered.length !== 1 ? 'sidebar.results_plural' : 'sidebar.results')}
          </div>
          <div className="sidebar-list" role="list">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="sidebar-skeleton" />)
              : filtered.length === 0
              ? (
                <div className="sidebar-empty">
                  <MapPin size={32} opacity={0.3} />
                  <p>{t('sidebar.empty')}</p>
                </div>
              )
              : filtered.map(assoc => {
                  const hasCoords  = assoc.latitude && assoc.longitude;
                  const color      = getCategoryColor(assoc.categorie);
                  const isSelected = selectedAssoc?.id === assoc.id;
                  return (
                    <div
                      key={assoc.id}
                      className={`sidebar-card ${isSelected ? 'active' : ''} ${!hasCoords ? 'no-coords' : ''}`}
                      onClick={() => hasCoords ? focusMarker(assoc) : setSelectedAssoc(assoc)}
                      style={isSelected ? { '--card-color': color } : {}}
                      role="listitem"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && hasCoords && focusMarker(assoc)}
                    >
                      <div className="sidebar-card-left">
                        {assoc.logo
                          ? <img src={`http://localhost:5000/upload/${assoc.logo}`} alt={assoc.nom}
                              className="sidebar-card-logo"
                              onError={e => { e.currentTarget.style.display = 'none'; }} />
                          : <div className="sidebar-card-avatar" style={{ background: color }} aria-hidden="true">
                              {assoc.nom?.charAt(0)?.toUpperCase()}
                            </div>
                        }
                      </div>
                      <div className="sidebar-card-info">
                        <div className="sidebar-card-name">{assoc.nom}</div>
                        {assoc.categorie && (
                          <div className="sidebar-card-cat" style={{ color }}>
                            <Tag size={11} /> {displayCategory(assoc.categorie)}
                          </div>
                        )}
                        {assoc.adresse && (
                          <div className="sidebar-card-addr">
                            <MapPin size={11} /> {assoc.adresse}
                          </div>
                        )}
                      </div>
                      {!hasCoords && (
                        <span className="sidebar-card-no-loc" title={t('assoc.noLocation')}>
                          <MapPin size={13} />
                        </span>
                      )}
                    </div>
                  );
                })
            }
          </div>
        </aside>

        <div className="mappage-map-wrap">
          <div ref={mapRef} className="mappage-map" role="application" aria-label={t('map.ariaLabel')} />

          {!mapReady && (
            <div className="map-loading-overlay">
              <div className="map-loading-spinner" />
              <p>{t('map.loading')}</p>
            </div>
          )}

          {selectedAssoc && (
            <div className="mappage-info-panel"
              style={{ '--panel-color': getCategoryColor(selectedAssoc.categorie) }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="info-panel-title"
            >
              <button className="info-panel-close" onClick={() => setSelectedAssoc(null)} aria-label={t('common.close')}>
                <X size={16} />
              </button>
              <div className="info-panel-top">
                {selectedAssoc.logo
                  ? <img src={`http://localhost:5000/upload/${selectedAssoc.logo}`}
                      alt={selectedAssoc.nom} className="info-panel-logo"
                      onError={e => { e.currentTarget.style.display = 'none'; }} />
                  : <div className="info-panel-avatar"
                      style={{ background: getCategoryColor(selectedAssoc.categorie) }}
                      aria-hidden="true">
                      {selectedAssoc.nom?.charAt(0)?.toUpperCase()}
                    </div>
                }
                <div>
                  <h3 id="info-panel-title" className="info-panel-name">{selectedAssoc.nom}</h3>
                  {selectedAssoc.categorie && (
                    <span className="info-panel-badge" style={{
                      background: getCategoryColor(selectedAssoc.categorie) + '22',
                      color:      getCategoryColor(selectedAssoc.categorie),
                    }}>
                      <Tag size={11} /> {displayCategory(selectedAssoc.categorie)}
                    </span>
                  )}
                </div>
              </div>

              {selectedAssoc.adresse && (
                <div className="info-panel-row">
                  <MapPin size={14} className="info-panel-row-icon" />
                  <span>{selectedAssoc.adresse}</span>
                </div>
              )}

              {selectedAssoc.description && (
                <p className="info-panel-desc">
                  {selectedAssoc.description.length > 120
                    ? selectedAssoc.description.slice(0, 120) + '…'
                    : selectedAssoc.description}
                </p>
              )}

              <button className="info-panel-btn"
                onClick={() => navigate(`/association/${selectedAssoc.id}`)}>
                <Building2 size={15} />
                {t('assoc.viewProfile')}
                <ExternalLink size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapPage;