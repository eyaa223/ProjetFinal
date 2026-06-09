import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Crown, Award, Trophy, Heart, Star, Gift } from "lucide-react";
import "./TopDonateurs.css";
import { useTranslation } from "react-i18next";

const PODIUM_ORDER = [2, 1, 3];

const RANK_CONFIG = {
  1: { MedalIcon: Crown,  label: "1er",   card: "r1", medal: "medal-gold",   avatar: "av-gold",   pill: "pill-gold",   bar: "bar-gold",   barWidth: 100 },
  2: { MedalIcon: Award,  label: "2ème",  card: "r2", medal: "medal-silver", avatar: "av-silver", pill: "pill-silver", bar: "bar-silver", barWidth: 70  },
  3: { MedalIcon: Trophy, label: "3ème",  card: "r3", medal: "medal-bronze", avatar: "av-bronze", pill: "pill-bronze", bar: "bar-bronze", barWidth: 45  },
};

const getInitials = (name = "") =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const TopDonateurs = () => {
  const { t, i18n } = useTranslation();
  const [topDonateurs, setTopDonateurs]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");

  const fetchTopDonateurs = useCallback(async () => {
    try {
      setError("");
      const res = await axios.get("http://localhost:5000/api/top-month");
      setTopDonateurs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Erreur API:", err);
      setError(t("top.error", { defaultValue: "Erreur lors du chargement." }));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchTopDonateurs(); }, [fetchTopDonateurs]);

  const isRtl = i18n.language === "ar";

  const podiumSorted = PODIUM_ORDER
    .map((r) => topDonateurs.find((d) => d.rank === r))
    .filter(Boolean);

  return (
    <div className="td-wrap" dir={isRtl ? "rtl" : "ltr"}>

      {/* ── Hero ── */}
      <header className="td-hero">
        <div className="td-hero-crown" aria-hidden="true"><Crown size={26} /></div>
        <h1 className="td-hero-title">
          <Trophy size={18} className="td-title-icon" aria-hidden="true" />
          {t("top.title", { defaultValue: "Top Donneurs du Mois" })}
        </h1>
        <p className="td-hero-tagline">
          {t("top.tagline", { defaultValue: "Les héros de la générosité qui font la différence" })}
        </p>
        <div className="td-divider" aria-hidden="true">
          <span className="td-divider-line" />
          <Heart size={13} className="td-deco-heart" />
          <span className="td-divider-dot" />
          <Star size={13} className="td-deco-star" />
          <span className="td-divider-line" />
        </div>
      </header>

      {/* ── Loading ── */}
      {loading && (
        <div className="td-loading">
          <span className="td-spinner" aria-hidden="true" />
          <p>{t("top.loading", { defaultValue: "Chargement…" })}</p>
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div className="td-error" role="alert">
          <span aria-hidden="true">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && !error && topDonateurs.length === 0 && (
        <div className="td-empty">
          <div className="td-empty-icon" aria-hidden="true">🥇</div>
          <h3>{t("top.empty_title", { defaultValue: "Aucun donateur ce mois-ci" })}</h3>
          <p>{t("top.empty_sub",   { defaultValue: "Soyez le premier à contribuer !" })}</p>
        </div>
      )}

      {/* ── Podium ── */}
      {!loading && !error && podiumSorted.length > 0 && (
        <div className="td-content">
          <div className="td-podium" role="list" aria-label="Podium">
            {podiumSorted.map((donateur) => {
              const rank = donateur.rank;
              const cfg  = RANK_CONFIG[rank] || RANK_CONFIG[3];
              const { MedalIcon } = cfg;

              return (
                <article
                  key={donateur.id}
                  className={`td-card ${cfg.card}`}
                  role="listitem"
                  aria-label={`#${rank} ${donateur.nom}`}
                >
                  {/* Médaille coin */}
                  <div className={`td-medal ${cfg.medal}`} aria-hidden="true">
                    <MedalIcon size={13} />
                  </div>

                  {/* Emoji médaille */}
                  <div className="td-medal-emoji" aria-hidden="true">
                    {donateur.medal}
                  </div>

                  {/* Avatar */}
                  <div className={`td-avatar ${cfg.avatar}`}>
                    <span>{getInitials(donateur.nom)}</span>
                  </div>

                  {/* Pill rang */}
                  <span className={`td-pill ${cfg.pill}`}>{cfg.label}</span>

                  {/* Badge backend */}
                  <p className="td-badge-label">{donateur.badge}</p>

                  {/* Nom */}
                  <p className="td-name">{donateur.nom}</p>

                  {/* ✅ Nombre de dons — seule métrique affichée */}
                  <div className="td-don-count">
                    <Gift size={13} className="td-don-icon" aria-hidden="true" />
                    <span>
                      {donateur.nombre_dons}{" "}
                      {donateur.nombre_dons > 1
                        ? t("top.dons", { defaultValue: "dons" })
                        : t("top.don",  { defaultValue: "don" })}
                    </span>
                  </div>

                  {/* Barre */}
                  <div className="td-bar" aria-hidden="true">
                    <div className={`td-bar-fill ${cfg.bar}`} style={{ width: `${cfg.barWidth}%` }} />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TopDonateurs;