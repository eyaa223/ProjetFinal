import { Link, useNavigate } from 'react-router-dom';
import { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import logo from '../assets/hedha.png';
import './Navbar.css';
import { useTheme } from '../context/ThemeContext';
import { 
  Sun, Moon, Bell, Search, LayoutDashboard, Trophy, LogOut, 
  ChevronDown, Menu, X, Globe 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English',  flag: '🇬' },
  { code: 'ar', label: 'العربية',  flag: '🇹🇳' },
];

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();

  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const langRef = useRef(null);
  const demandesDesktopRef = useRef(null);
  const demandesMobileRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showDemandesDropdownDesktop, setShowDemandesDropdownDesktop] = useState(false);
  const [showDemandesDropdownMobile, setShowDemandesDropdownMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // ── NOUVEAU : limite d'affichage des notifications ──
  const [notifLimit, setNotifLimit] = useState(5);

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  // Scroll shadow effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Gestion RTL et Langue au chargement/changement
  useEffect(() => {
    const lang = i18n.language;
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [i18n.language]);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate('/login');
  };

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('i18nextLng', code);
    setShowLangDropdown(false);
  };

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      let res;
      if (user.role === 'beneficiaire') {
        res = await axios.get('http://localhost:5000/beneficiaire/notifications', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
      } else {
        res = await axios.get('http://localhost:5000/api/notification', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
      }
      setNotifications(res.data);
    } catch (err) {
      console.error('[Navbar] fetchNotifications error', err);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => Number(n.is_read) === 0).length;

  const markAsRead = async (notificationId) => {
    if (!user) return;
    try {
      const url =
        user.role === 'beneficiaire'
          ? `http://localhost:5000/beneficiaire/notifications/${notificationId}/read`
          : `http://localhost:5000/api/notification/read/${notificationId}`;
      await axios.put(url, {}, { headers: { Authorization: `Bearer ${user.token}` } });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: 1 } : n)),
      );
      await fetchNotifications();
    } catch (err) {
      console.error('Impossible de marquer la notification comme lue', err);
    }
  };

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!searchQuery.trim()) { setSearchResults([]); return; }
      try {
        const res = await axios.get(`http://localhost:5000/associations/public?search=${searchQuery}`);
        setSearchResults(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSearchResults();
  }, [searchQuery]);

  // Click outside handler for all dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setShowSearchDropdown(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifDropdown(false);
      if (langRef.current && !langRef.current.contains(event.target)) setShowLangDropdown(false);
      if (demandesDesktopRef.current && !demandesDesktopRef.current.contains(event.target)) setShowDemandesDropdownDesktop(false);
      if (demandesMobileRef.current && !demandesMobileRef.current.contains(event.target)) setShowDemandesDropdownMobile(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'avocat') return '/avocat/dashboard';
    if (user.role === 'association') return '/association/dashboard';
    if (user.role === 'donneur') return '/dashboard-donneur';
    if (user.role === 'beneficiaire') return '/dashboard-beneficiaire';
    return '/';
  };

  const goDemandeAssociation = () => {
    navigate('/demande');
    setShowDemandesDropdownDesktop(false);
    setShowDemandesDropdownMobile(false);
    setMobileOpen(false);
  };

  const goDemandeAide = () => {
    navigate('/demande-aide');
    setShowDemandesDropdownDesktop(false);
    setShowDemandesDropdownMobile(false);
    setMobileOpen(false);
  };

  // ── Ouvrir/fermer le dropdown notif + reset limite ──
  const handleToggleNotif = () => {
    const next = !showNotifDropdown;
    setShowNotifDropdown(next);
    if (next) {
      setNotifLimit(5); // reset à chaque ouverture
      fetchNotifications();
    }
  };

  return (
    <nav className={`navbar${scrolled ? ' navbar--scrolled' : ''}`} data-theme={theme}>
      <div className="navbar-inner">

        {/* ── Logo ── */}
        <Link to="/" className="nav-logo" onClick={() => setMobileOpen(false)}>
          <div className="nav-logo-mark">
            <img src={logo} alt="Logo" className="nav-logo-img" />
          </div>
          <span className="nav-logo-text">DON<span className="nav-logo-accent">'ACT</span></span>
        </Link>

        {/* ── Search (desktop) ── */}
        <div className="nav-search" ref={searchRef}>
          <Search size={15} className="nav-search-icon" />
          <input
            type="text"
            placeholder={t('nav.search_placeholder') || "Rechercher une association…"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearchDropdown(true)}
            className="nav-search-input"
          />
          {showSearchDropdown && searchResults.length > 0 && (
            <ul className="nav-search-dropdown">
              {searchResults.map((assoc) => (
                <li
                  key={assoc.id}
                  onClick={() => {
                    navigate(`/association/${assoc.id}`);
                    setShowSearchDropdown(false);
                    setSearchQuery('');
                    setMobileOpen(false);
                  }}
                  className="nav-search-item"
                >
                  {assoc.logo ? (
                    <img
                      src={`http://localhost:5000/upload/${assoc.logo}`}
                      alt={assoc.nom}
                      className="nav-search-img"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="nav-search-avatar">{assoc.nom?.charAt(0)?.toUpperCase()}</div>
                  )}
                  <span className="nav-search-text">{assoc.nom}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Desktop links ── */}
        <div className="nav-links">
          <Link to="/" className="nav-link">{t('nav.home')}</Link>
          <Link to="/about" className="nav-link">{t('nav.about')}</Link>

          {/* Dropdown Demande */}
          <div className="nav-dropdown" ref={demandesDesktopRef}>
            <button
              className="nav-link nav-link--dropdown"
              type="button"
              onClick={() => setShowDemandesDropdownDesktop((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={showDemandesDropdownDesktop}
            >
              {t('nav.demande')}
              <ChevronDown size={14} className={`nav-chevron${showDemandesDropdownDesktop ? ' nav-chevron--open' : ''}`} />
            </button>
            {showDemandesDropdownDesktop && (
              <div className="nav-dropdown-menu" role="menu">
                <button className="nav-dropdown-item" type="button" onClick={goDemandeAssociation}>
                  <span className="nav-dropdown-dot" />
                  {t('nav.demande_assoc')}
                </button>
                <button className="nav-dropdown-item" type="button" onClick={goDemandeAide}>
                  <span className="nav-dropdown-dot" />
                  {t('nav.demande_aide')}
                </button>
              </div>
            )}
          </div>

          {!user ? (
            <Link to="/login" className="nav-link nav-link--cta">{t('nav.login')}</Link>
          ) : (
            <>
              <button className="nav-link nav-link--icon" onClick={() => navigate(getDashboardPath())} title="Tableau de bord">
                <LayoutDashboard size={17} />
                <span>{t('nav.dashboard')}</span>
              </button>

              <Link to="/top-donateurs" className="nav-link nav-link--icon" title="Top Donneurs">
                <Trophy size={17} />
                <span>{t('nav.top_donors')}</span>
              </Link>

              {/* ── Notifications ── */}
              <div className="nav-notif" ref={notifRef}>
                <button
                  onClick={handleToggleNotif}
                  className="nav-notif-btn"
                  title="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && <span className="nav-notif-badge">{unreadCount}</span>}
                </button>

                {showNotifDropdown && (
                  <div className="nav-notif-dropdown">
                    <div className="nav-notif-header">
                      <span>{t('nav.notifications')}</span>
                      {unreadCount > 0 && (
                        <span className="nav-notif-count">{unreadCount} non lues</span>
                      )}
                    </div>

                    {notifications.length === 0 ? (
                      <div className="nav-notif-empty">
                        <Bell size={28} opacity={0.3} />
                        <p>{t('nav.no_notifications')}</p>
                      </div>
                    ) : (
                      <>
                        {notifications.slice(0, notifLimit).map((n) => (
                          <div
                            key={n.id}
                            className={`nav-notif-item${Number(n.is_read) === 0 ? ' unread' : ''}`}
                            onClick={() => markAsRead(n.id)}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="nav-notif-dot" />
                            <div>
                              <div className="nav-notif-msg">{n.message}</div>
                              <small>{new Date(n.created_at).toLocaleString()}</small>
                            </div>
                          </div>
                        ))}

                        {/* ── Bouton Voir plus ── */}
                        {notifLimit < notifications.length && (
                          <button
                            className="nav-notif-voir-plus"
                            onClick={() => setNotifLimit((prev) => prev + 5)}
                          >
                            Voir plus ({notifications.length - notifLimit} restantes)
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <button className="nav-logout-btn" onClick={handleLogout} title="Déconnexion">
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>

        {/* ── Controls right (Theme + Lang + Burger) ── */}
        <div className="nav-controls">
          
          {/* Language Switcher */}
          <div className="nav-lang-switcher" ref={langRef}>
            <button
              className="nav-lang-btn"
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              title="Changer la langue"
            >
              <Globe size={17} />
              <span className="nav-lang-code">{currentLang.code.toUpperCase()}</span>
              <ChevronDown size={12} className={`nav-lang-chevron ${showLangDropdown ? 'rotated' : ''}`} />
            </button>

            {showLangDropdown && (
              <div className="nav-lang-dropdown">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    className={`nav-lang-option ${lang.code === i18n.language ? 'active' : ''}`}
                    onClick={() => changeLanguage(lang.code)}
                  >
                    <span className="lang-flag">{lang.flag}</span>
                    <span>{lang.label}</span>
                    {lang.code === i18n.language && <span className="lang-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button onClick={toggleTheme} className="nav-theme-btn" aria-label="Changer le thème">
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>

          {/* Mobile Burger */}
          <button
            className="nav-burger"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      <div className={`nav-mobile${mobileOpen ? ' nav-mobile--open' : ''}`}>
        <Link to="/" className="nav-mobile-link" onClick={() => setMobileOpen(false)}>{t('nav.home')}</Link>
        <Link to="/about" className="nav-mobile-link" onClick={() => setMobileOpen(false)}>{t('nav.about')}</Link>

        {/* Mobile search */}
        <div className="nav-search nav-search--mobile">
          <Search size={14} className="nav-search-icon" />
          <input
            type="text"
            placeholder={t('nav.search_placeholder') || "Rechercher..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="nav-search-input"
          />
        </div>

        {/* Dropdown Demande mobile */}
        <div className="nav-dropdown nav-dropdown--mobile">
          <button
            className="nav-mobile-link nav-mobile-link--dropdown"
            type="button"
            onClick={() => setShowDemandesDropdownMobile((v) => !v)}
          >
            {t('nav.demande')}
            <ChevronDown size={14} className={`nav-chevron${showDemandesDropdownMobile ? ' nav-chevron--open' : ''}`} />
          </button>
          {showDemandesDropdownMobile && (
            <div className="nav-dropdown-menu nav-dropdown-menu--mobile" role="menu">
              <button className="nav-dropdown-item" type="button" onClick={goDemandeAssociation}>
                <span className="nav-dropdown-dot" /> {t('nav.demande_assoc')}
              </button>
              <button className="nav-dropdown-item" type="button" onClick={goDemandeAide}>
                <span className="nav-dropdown-dot" /> {t('nav.demande_aide')}
              </button>
            </div>
          )}
        </div>

        {/* Mobile Language Switcher */}
        <div className="nav-mobile-lang">
           <span className="nav-mobile-lang-label">{t('nav.language')}:</span>
           <div className="nav-mobile-lang-options">
             {LANGUAGES.map(lang => (
               <button
                 key={lang.code}
                 className={`nav-mobile-lang-btn ${lang.code === i18n.language ? 'active' : ''}`}
                 onClick={() => changeLanguage(lang.code)}
               >
                 {lang.flag} {lang.label}
               </button>
             ))}
           </div>
        </div>

        {!user ? (
          <>
            <Link to="/login" className="nav-mobile-link" onClick={() => setMobileOpen(false)}>{t('nav.login')}</Link>
            <Link to="/register-donneur" className="nav-mobile-btn" onClick={() => setMobileOpen(false)}>{t('nav.register')}</Link>
          </>
        ) : (
          <>
            <Link to="/top-donateurs" className="nav-mobile-link" onClick={() => setMobileOpen(false)}>
              <Trophy size={15} style={{ marginRight: 6 }} />{t('nav.top_donors')}
            </Link>
            <button className="nav-mobile-link" onClick={() => { navigate(getDashboardPath()); setMobileOpen(false); }}>
              <LayoutDashboard size={15} style={{ marginRight: 6 }} />{t('nav.dashboard')}
            </button>
            <button className="nav-mobile-btn nav-mobile-btn--danger" onClick={handleLogout}>
              <LogOut size={15} style={{ marginRight: 6 }} />{t('nav.logout')}
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;