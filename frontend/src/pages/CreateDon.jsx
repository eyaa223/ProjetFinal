import { useEffect, useMemo, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './CreateDon.css';

const API = 'http://localhost:5000';

const QUICK_AMOUNTS = [10, 25, 50, 100];

const CreateDon = () => {
  const { user } = useContext(AuthContext);
  const { id } = useParams(); // beneficiaire_id
  const navigate = useNavigate();

  const [montant, setMontant] = useState('');
  const [numeroBancaire, setNumeroBancaire] = useState('');
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const authHeaders = useMemo(() => {
    if (!user?.token) return {};
    return { Authorization: `Bearer ${user.token}` };
  }, [user?.token]);

  useEffect(() => {
    if (user?.numero_bancaire && !numeroBancaire) {
      setNumeroBancaire(String(user.numero_bancaire));
    }
  }, [user?.numero_bancaire, numeroBancaire]);

  const normalizeBank = (v) => String(v || '').replace(/\s+/g, '').trim();

  const validate = () => {
    const m = Number(montant);

    if (!id) return 'Bénéficiaire introuvable (id manquant).';
    if (!user?.token) return 'Vous devez être connecté.';

    if (!montant || Number.isNaN(m)) return 'Veuillez saisir un montant valide.';
    if (m <= 0) return 'Le montant doit être supérieur à 0.';

    const bank = normalizeBank(numeroBancaire);
    if (!bank) return 'Veuillez saisir votre numéro bancaire.';
    if (bank.length < 8) return 'Numéro bancaire trop court.';

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API}/api/donations`,
        {
          beneficiaire_id: id,
          montant: Number(montant),
          numero_bancaire: normalizeBank(numeroBancaire),
          // NOTE: message/anonymous not sent unless your backend supports it
        },
        { headers: authHeaders },
      );

      setSuccessMsg('✓ Don créé avec succès !');
      setTimeout(() => navigate('/dashboard-donneur'), 900);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Erreur lors de la création du don.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-don-page">
      <div className="create-don-shell">
        <div className="create-don-head">
          <div>
            <h1 className="create-don-title">Faire un don</h1>
            <p className="create-don-subtitle">Bénéficiaire ID: {id}</p>
          </div>

          <button type="button" className="btn btn--ghost" onClick={() => navigate(-1)} disabled={loading}>
            ← Retour
          </button>
        </div>

        {error && <div className="create-don-alert create-don-alert--danger">{error}</div>}
        {successMsg && <div className="create-don-alert create-don-alert--success">{successMsg}</div>}

        <form onSubmit={handleSubmit} className="create-don-card">
          <div className="create-don-section">
            <div className="create-don-sectionTitle">Montant</div>

            <div className="create-don-quick">
              {QUICK_AMOUNTS.map((a) => {
                const isActive = String(a) === String(montant);
                return (
                  <button
                    key={a}
                    type="button"
                    className={`quick-btn ${isActive ? 'is-active' : ''}`}
                    onClick={() => setMontant(String(a))}
                    disabled={loading}
                  >
                    {a} DT
                  </button>
                );
              })}
            </div>

            <div className="field">
              <label>Montant personnalisé (DT)</label>
              <input
                type="number"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                required
                min="1"
                step="1"
                placeholder="Ex: 50"
                disabled={loading}
              />
            </div>
          </div>

          <div className="create-don-section">
            <div className="create-don-sectionTitle">Paiement</div>

            <div className="field">
              <label>Numéro bancaire</label>
              <input
                type="text"
                value={numeroBancaire}
                onChange={(e) => setNumeroBancaire(e.target.value)}
                required
                placeholder="XXXX XXXX XXXX XXXX"
                disabled={loading}
              />
              <div className="create-don-hint">Astuce: vous pouvez mettre des espaces, ils seront supprimés automatiquement.</div>
            </div>
          </div>

          <div className="create-don-section">
            <div className="create-don-sectionTitle">Message (optionnel)</div>

            <div className="field">
              <label>Message</label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Un mot d'encouragement..."
                maxLength={100}
                disabled={loading}
              />
            </div>

            <label className="anon-row">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} disabled={loading} />
              <span>Rester anonyme</span>
            </label>

            <div className="create-don-info">
              Les paiements sont sécurisés. Vous recevrez une confirmation après validation.
            </div>
          </div>

          <button className="btn btn--primary btn--block" type="submit" disabled={loading || !montant}>
            {loading ? 'Traitement...' : 'Valider le don'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateDon;