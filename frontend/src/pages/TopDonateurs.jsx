import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Crown, Award, Trophy, ListOrdered, Heart, Star } from "lucide-react";
import "./TopDonateurs.css";
import { useTranslation } from "react-i18next";

const RANK_CONFIG = {
  1: {
    MedalIcon: Crown,
    BadgeIcon: Trophy,
    label: "Champion",
    card: "r1",
    medal: "medal-gold",
    badge: "badge-gold",
    avatar: "av-gold",
    pill: "pill-gold",
    amount: "amt-gold",
    bar: "bar-gold",
    barWidth: 90,
  },
  2: {
    MedalIcon: Award,
    BadgeIcon: Award,
    label: "Argent",
    card: "r2",
    medal: "medal-silver",
    badge: "badge-silver",
    avatar: "av-silver",
    pill: "pill-silver",
    amount: "amt-silver",
    bar: "bar-silver",
    barWidth: 65,
  },
  3: {
    MedalIcon: Trophy,
    BadgeIcon: Star,
    label: "Bronze",
    card: "r3",
    medal: "medal-bronze",
    badge: "badge-bronze",
    avatar: "av-bronze",
    pill: "pill-bronze",
    amount: "amt-bronze",
    bar: "bar-bronze",
    barWidth: 45,
  },
};

const PODIUM_ORDER = [2, 1, 3];

const getInitials = (name = "") =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const TopDonateurs = () => {
  const { t, i18n } = useTranslation();
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
      setError(t("top.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchTopDonateurs(); }, [fetchTopDonateurs]);

  const formatAmount = (amount) => {
    const num = Number(amount);
    const locale =
      i18n.language === "ar" ? "ar-TN" :
      i18n.language === "en" ? "en-US" : "fr-FR";
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M DT`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(0)}K DT`;
    return num.toLocaleString(locale) + " DT";
  };

  const isRtl = i18n.language === "ar";
  const topThree = topDonateurs.slice(0, 3);
  const podiumSorted = PODIUM_ORDER
    .map((r) => topThree.find((d, i) => (d.rank || i + 1) === r))
    .filter(Boolean);

  return (
    <div className="td-wrap" dir={isRtl ? "rtl" : "ltr"}>

      {/* ── Hero ── */}
      <header className="td-hero">
        <div className="td-hero-crown" aria-hidden="true">
          <Crown size={22} />
        </div>
        <h1 className="td-hero-title">
          <Award size={16} className="td-title-icon" aria-hidden="true" />
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
          <p>{t("top.empty_sub", { defaultValue: "Soyez le premier à contribuer !" })}</p>
        </div>
      )}

      {/* ── Main ── */}
      {!loading && !error && topDonateurs.length > 0 && (
        <div className="td-content">

          {/* Contenders list — au dessus du podium */}
          {topDonateurs.length > 3 && (
            <section className="td-list" aria-label={t("top.contenders_title", { defaultValue: "Autres contributeurs" })}>
              <div className="td-list-head">
                <ListOrdered size={15} aria-hidden="true" />
                <span>{t("top.contenders_title", { defaultValue: "Autres contributeurs" })}</span>
              </div>
              <ul className="td-contenders">
                {topDonateurs.slice(3, 10).map((d, i) => {
                  const r = d.rank || i + 4;
                  const barPct = Math.max(12, 75 - i * 10);
                  return (
                    <li key={d.id || i} className="td-row">
                      <span className="td-row-rank">{r}.</span>
                      <div className="td-row-av">
                        {d.avatar
                          ? <img src={d.avatar} alt={d.nom} />
                          : <span>{getInitials(d.nom)}</span>}
                      </div>
                      <span className="td-row-name">{d.nom}</span>
                      <div className="td-row-bar" aria-hidden="true">
                        <div className="td-row-bar-fill" style={{ width: `${barPct}%` }} />
                      </div>
                      <span className="td-row-amt">{formatAmount(d.total_dons)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Podium */}
          <div className="td-podium" role="list" aria-label="Podium">
            {podiumSorted.map((donateur, i) => {
              const rank = donateur.rank || topThree.indexOf(donateur) + 1;
              const cfg = RANK_CONFIG[rank] || RANK_CONFIG[3];
              const { MedalIcon, BadgeIcon } = cfg;
              return (
                <article
                  key={donateur.id || i}
                  className={`td-card ${cfg.card}`}
                  role="listitem"
                  aria-label={`#${rank} ${donateur.nom}`}
                >
                  <div className={`td-medal ${cfg.medal}`} aria-hidden="true">
                    <MedalIcon size={12} />
                  </div>
                  <div className={`td-badge-ring ${cfg.badge}`} aria-hidden="true">
                    <BadgeIcon size={17} />
                  </div>
                  <div className={`td-avatar ${cfg.avatar}`}>
                    {donateur.avatar
                      ? <img src={donateur.avatar} alt={donateur.nom} className="td-avatar-img" />
                      : <span>{getInitials(donateur.nom)}</span>}
                  </div>
                  <span className={`td-pill ${cfg.pill}`}>{cfg.label}</span>
                  <p className="td-name">{donateur.nom}</p>
                  <div className={`td-amount ${cfg.amount}`}>
                    {formatAmount(donateur.total_dons)}
                  </div>
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