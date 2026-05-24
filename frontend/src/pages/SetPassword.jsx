import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const SetPassword = () => {
  const { token } = useParams(); 
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Les mots de passe ne correspondent pas !");
      return;
    }
    try {
      setLoading(true);
      const url = `http://localhost:5000/api/users/set-password/${token}`;
      await axios.put(url, { password }, { headers: { 'Content-Type': 'application/json' } });
      alert("Mot de passe défini avec succès !");
      navigate('/login');
    } catch (err) {
      console.error(err.response?.data || err);
      alert(err.response?.data?.message || "Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Styles CSS intégrés
  const styles = {
    container: {
      maxWidth: '400px',
      margin: '50px auto',
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      backgroundColor: '#f9f9f9'
    },
    title: {
      textAlign: 'center',
      marginBottom: '20px',
      color: '#333'
    },
    inputGroup: {
      marginBottom: '15px',
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      marginBottom: '5px',
      fontWeight: 'bold',
      color: '#555'
    },
    input: {
      padding: '10px',
      borderRadius: '5px',
      border: '1px solid #ccc',
      fontSize: '16px'
    },
    button: {
      padding: '12px',
      width: '100%',
      border: 'none',
      borderRadius: '5px',
      backgroundColor: '#007bff',
      color: '#fff',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'background-color 0.3s'
    },
    buttonDisabled: {
      backgroundColor: '#6c757d',
      cursor: 'not-allowed'
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Définir votre mot de passe</h2>
      <form onSubmit={handleSubmit}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Nouveau mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={styles.input}
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Confirmer mot de passe</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            style={styles.input}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ 
            ...styles.button, 
            ...(loading ? styles.buttonDisabled : {}) 
          }}
        >
          {loading ? "Chargement..." : "Valider"}
        </button>
      </form>
    </div>
  );
};

export default SetPassword;