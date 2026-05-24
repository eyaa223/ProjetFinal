import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Crown, Award, Trophy } from "lucide-react";
import "./TopDonateurs.css";
import { useTranslation } from 'react-i18next'; // Import du hook

const BADGE_COLORS = {
  1: { 
    color: "#fff", 
    bg: "linear-gradient(135deg, #ffd700 0%, #ffed4a 50%, #ffe066 100%)",
    shadow: "0 0 40px rgba(255, 215, 0, 0.6)",
    icon: Crown
  }, 
  2: { 
    color: "#fff", 
    bg: "linear-gradient(135deg, #c0c0c0 0%, #e5e5e5 50%, #f5f5f5 100%)", 
    shadow: "0 0 30px rgba(192, 192, 192, 0.5)",
    icon: Award
  }, 
  3: { 
    color: "#fff", 
    bg: "linear-gradient(135deg, #cd7f32 0%, #d4a574 50%, #f7c391 100%)", 
    shadow: "0 0 30px rgba(205, 127, 50, 0.5)",
    icon: Trophy
  }
};

const TopDonateurs = () => {
  const { t, i18n } = useTranslation(); // Hook de traduction
  const [topDonateurs, setTopDonateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTopDonateurs = useCallback(async () => {
    try {
      setError("");
      const res = await axios.get("http://localhost:5000/api/top-month");
      setTopDonateurs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Erreur API:", err);
      setError(t('top.error')); // Traduction de l'erreur
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchTopDonateurs();
  }, [fetchTopDonateurs]);

  const formatAmount = (amount) => {
    const num = Number(amount);
    // Utilisation de la locale actuelle pour le formatage des nombres
    const locale = i18n.language === 'ar' ? 'ar-TN' : (i18n.language === 'en' ? 'en-US' : 'fr-FR');
    
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M DT`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(0)}K DT`;
    return num.toLocaleString(locale) + " DT";
  };

  const getProgressBarStyle = (rank) => {
    const progress = (4 - rank) * 25; 
    return { width: `${progress}%` };
  };

  return (
    <div className="top-podium-container" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="top-header">
        <div className="top-title-wrap">
          <h1 className="top-podium-title">
            <span className="title-icon">🏆</span>
            {t('top.title')}
          </h1>
          <p className="top-subtitle">
            {t('top.subtitle')}
          </p>
        </div>
      </div>

      {loading && (
        <div className="top-loading">
          <div className="loading-spinner"></div>
          <p>{t('top.loading')}</p>
        </div>
      )}

      {error && !loading && (
        <div className="top-error">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {!loading && topDonateurs.length === 0 && (
        <div className="top-empty">
          <div className="empty-icon">🥇</div>
          <h3>{t('top.empty_title')}</h3>
          <p>{t('top.empty_sub')}</p>
        </div>
      )}

      {!loading && topDonateurs.length > 0 && (
        <div className={`podium-arena ${topDonateurs.length ? "reveal" : ""}`}>
          <div className="podium-platform"></div>
          
          <div className="podium-wrap">
            {topDonateurs.slice(0, 3).map((donateur, index) => {
              const rank = donateur.rank || (index + 1);
              const BadgeIcon = BADGE_COLORS[rank]?.icon || Crown;
              
              return (
                <div
                  key={donateur.id || index}
                  className={`podium-card podium-rank-${rank}`}
                  style={{
                    '--bg-gradient': BADGE_COLORS[rank]?.bg || '#64748b',
                    '--text-color': BADGE_COLORS[rank]?.color || '#fff',
                    '--shadow-glow': BADGE_COLORS[rank]?.shadow || '0 0 20px rgba(100, 116, 139, 0.5)',
                  }}
                >
                  <div className="podium-rank-badge">
                    <BadgeIcon size={28} />
                    <span>{rank}</span>
                  </div>

                  <div className="podium-avatar">
                    {donateur.avatar ? (
                      <img 
                        src={donateur.avatar} 
                        alt={donateur.nom}
                        className="avatar-img"
                      />
                    ) : (
                      <div className="avatar-placeholder">
                        {donateur.nom.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="podium-info">
                    <h3 className="podium-name">{donateur.nom}</h3>
                    <div className="podium-amount">
                      <span className="amount-icon">💰</span>
                      <span className="amount-value">{formatAmount(donateur.total_dons)}</span>
                    </div>
                    <div className="podium-progress">
                      <div 
                        className="progress-fill" 
                        style={getProgressBarStyle(rank)}
                      ></div>
                    </div>
                  </div>

                  <div className="podium-stats">
                    <span className="stat-item">
                      {/* Gestion simple du pluriel pour "dons" */}
                      <strong>{donateur.nb_dons || 0}</strong> {t('top.stats_dons')}
                    </span>
                    <span className="stat-item">
                      <strong>{donateur.moyenne_don ? formatAmount(donateur.moyenne_don) : '—'}</strong> {t('top.stats_avg')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {topDonateurs.length > 3 && (
            <div className="top-contenders">
              <h4>{t('top.contenders_title')}</h4>
              <div className="contenders-list">
                {topDonateurs.slice(3, 10).map((d, index) => (
                  <div key={d.id || index} className="contender-item">
                    <span className="contender-rank">{index + 4}.</span>
                    <span className="contender-name">{d.nom}</span>
                    <span className="contender-amount">{formatAmount(d.total_dons)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TopDonateurs;