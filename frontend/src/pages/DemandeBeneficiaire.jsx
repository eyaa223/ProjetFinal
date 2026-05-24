import { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import demandeImg from '../assets/ajoutdemande.jpg';
import './DemandeBeneficiaire.css';
import { useTranslation } from 'react-i18next';
import { HelpCircle, X, FileText, Paperclip, CheckCircle2, AlertCircle } from 'lucide-react';

const API_BASE = 'http://localhost:5000';

/* ────────────────────────────────────────────────────────────
   🆘 MODAL D'AIDE — BÉNÉFICIAIRE (avec traductions i18n)
   ──────────────────────────────────────────────────────────── */
const BeneficiaireHelpModal = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="help-overlay" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} onClick={onClose}>
      <div className="help-backdrop" />
      <div className="help-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="help-header">
          <h3 className="help-header-title">
            <FileText size={18} className="help-header-icon" />
            {t('beneficiaryRequest.help.modal_title')}
          </h3>
          <button className="help-close" onClick={onClose} aria-label={t('common.close')}>
            <X size={16} />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="help-content">
          
          {/* 1. Preuve de situation (Obligatoire) */}
          <div className="help-section">
            <h4 className="help-section-title">
              <FileText size={16} /> {t('beneficiaryRequest.help.doc1_title')}
            </h4>
            <p className="help-desc">{t('beneficiaryRequest.help.doc1_desc')}</p>
            <p className="help-label">{t('beneficiaryRequest.help.examples_label')} :</p>
            <ul className="help-list">
              <li>{t('beneficiaryRequest.help.doc1_example1')}</li>
              <li>{t('beneficiaryRequest.help.doc1_example2')}</li>
              <li>{t('beneficiaryRequest.help.doc1_example3')}</li>
              <li>{t('beneficiaryRequest.help.doc1_example4')}</li>
            </ul>
            <p className="help-note mandatory">
              <CheckCircle2 size={14} /> {t('beneficiaryRequest.help.doc1_note')}
            </p>
          </div>

          {/* 2. Document justificatif (Optionnel) */}
          <div className="help-section">
            <h4 className="help-section-title">
              <Paperclip size={16} /> {t('beneficiaryRequest.help.doc2_title')}
            </h4>
            <p className="help-desc">{t('beneficiaryRequest.help.doc2_desc')}</p>
            <p className="help-label">{t('beneficiaryRequest.help.examples_label')} :</p>
            <ul className="help-list">
              <li>{t('beneficiaryRequest.help.doc2_example1')}</li>
              <li>{t('beneficiaryRequest.help.doc2_example2')}</li>
              <li>{t('beneficiaryRequest.help.doc2_example3')}</li>
              <li>{t('beneficiaryRequest.help.doc2_example4')}</li>
              <li>{t('beneficiaryRequest.help.doc2_example5')}</li>
            </ul>
            <p className="help-note optional">
              <AlertCircle size={14} /> {t('beneficiaryRequest.help.doc2_note')}
            </p>
          </div>

          {/* Note Générale */}
          <div className="help-footer-warning">
            <AlertCircle size={16} className="footer-warn-icon" />
            <div>
              <strong>{t('beneficiaryRequest.help.general_note_title')}</strong>
              <ul className="footer-list">
                <li>{t('beneficiaryRequest.help.general_note_item1')}</li>
                <li>{t('beneficiaryRequest.help.general_note_item2')}</li>
                <li>{t('beneficiaryRequest.help.general_note_item3')}</li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   COMPOSANT PRINCIPAL : DemandeForm (Bénéficiaire)
   ──────────────────────────────────────────────────────────── */
const DemandeForm = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const [associations, setAssociations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false); // ✅ État pour le modal d'aide

  const [formData, setFormData] = useState({
    nom: '', prenom: '', email: '', telephone: '', cin: '',
    date_naissance: '', adresse: '', genre: '', situation_familiale: '',
    montant_a_collecter: '', description: '', association_id: '',
  });

  const [descriptionLength, setDescriptionLength] = useState(0);
  const [montantValue, setMontantValue] = useState(0);

  const descriptionLen = useMemo(() => descriptionLength, [descriptionLength]);

  const [files, setFiles] = useState({
    doc_identite: null,
    doc_autre: null,
  });

  useEffect(() => {
    const fetchAssociations = async () => {
      try {
        const res = await axios.get(`${API_BASE}/associations/public`);
        setAssociations(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Erreur fetch associations:', err);
        Swal.fire({
          icon: 'warning',
          title: t('demande.err_fetch_assoc'),
          text: t('common.server_error'),
          toast: true,
          position: 'top-end'
        });
      }
    };
    fetchAssociations();
  }, [t]);

  const updateDescriptionLength = useCallback((text) => {
    setDescriptionLength(text.trim().length);
  }, []);

  const updateMontantValue = useCallback((value) => {
    setMontantValue(Number(value) || 0);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'description') updateDescriptionLength(value);
    else if (name === 'montant_a_collecter') updateMontantValue(value);
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles[0]?.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: t('common.file_too_large_title'),
        text: t('common.file_too_large_text'),
        toast: true,
        position: 'top-end'
      });
      return;
    }
    setFiles((prev) => ({ ...prev, [name]: selectedFiles[0] }));
  };

  const validate = () => {
    if (!formData.nom.trim()) return t('demande.err_nom');
    if (!formData.prenom.trim()) return t('demande.err_prenom');
    if (!formData.email.trim()) return t('demande.err_email');
    if (!formData.telephone.trim()) return t('demande.err_telephone');
    if (!formData.cin.trim()) return t('demande.err_cin');
    if (!formData.date_naissance) return t('demande.err_date_naissance');
    if (!formData.adresse.trim()) return t('demande.err_adresse');
    if (!formData.genre) return t('demande.err_genre');
    if (!formData.situation_familiale.trim()) return t('demande.err_situation');
    if (montantValue <= 0) return t('demande.err_montant');
    if (!formData.association_id) return t('demande.err_association');
    if (descriptionLen < 20) return t('demande.err_description');
    if (!files.doc_identite) return t('demande.err_doc_identite');
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errMsg = validate();
    if (errMsg) {
      Swal.fire({ 
        icon: 'warning', 
        title: t('demande.error_title'), 
        text: errMsg,
        toast: true,
        position: 'top-end',
        timer: 4000
      });
      return;
    }

    setLoading(true);
    try {
      const formPayload = new FormData();
      Object.keys(formData).forEach((key) => formPayload.append(key, formData[key]));
      if (files.doc_identite) formPayload.append('doc_identite', files.doc_identite);
      if (files.doc_autre) formPayload.append('doc_autre', files.doc_autre);

      await axios.post(`${API_BASE}/demandes_beneficiaire`, formPayload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Swal.fire({
        icon: 'success',
        title: t('demande.success_title'),
        text: t('demande.success_text'),
        timer: 3500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });

      // Reset form
      setFormData({
        nom: '', prenom: '', email: '', telephone: '', cin: '',
        date_naissance: '', adresse: '', genre: '', situation_familiale: '',
        montant_a_collecter: '', description: '', association_id: ''
      });
      setFiles({ doc_identite: null, doc_autre: null });
      setDescriptionLength(0);
      setMontantValue(0);

      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: t('common.error_title'),
        text: err.response?.data?.message || t('common.server_error'),
        toast: true,
        position: 'top-end'
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedAssociation = useMemo(() => 
    associations.find(a => a.id === formData.association_id),
    [formData.association_id, associations]
  );

  return (
    <div className="db-page" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="db-shell">
        
        {/* HERO */}
        <header className="db-hero">
          <div className="db-hero-media">
            <img src={demandeImg} alt="" className="db-hero-img" />
            <div className="db-hero-overlay">
              <div className="db-hero-badge">{t('demande.hero_badge')}</div>
              <h1 className="db-title">{t('demande.title')}</h1>
            </div>
          </div>
        </header>

        {/* FORM CARD */}
        <div className="db-card">
          <form onSubmit={handleSubmit} className="db-form">
            
            {/* 🔘 BOUTON AIDE — En haut du formulaire */}
            <div className="db-help-button-wrap">
              <button type="button" className="db-btn-help" onClick={() => setHelpOpen(true)}>
                <HelpCircle size={16} />
                <span>{t('demande.btn_help')}</span>
              </button>
            </div>

            <div className="db-grid">
              
              {/* Infos personnelles */}
              <div className="db-field">
                <label>{t('demande.label_nom')} <span className="required">*</span></label>
                <input type="text" name="nom" value={formData.nom} onChange={handleChange} required />
              </div>

              <div className="db-field">
                <label>{t('demande.label_prenom')} <span className="required">*</span></label>
                <input type="text" name="prenom" value={formData.prenom} onChange={handleChange} required />
              </div>

              <div className="db-field">
                <label>{t('demande.label_email')} <span className="required">*</span></label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required />
              </div>

              <div className="db-field">
                <label>{t('demande.label_telephone')} <span className="required">*</span></label>
                <input type="tel" name="telephone" value={formData.telephone} onChange={handleChange} required />
              </div>

              <div className="db-field">
                <label>{t('demande.label_cin')} <span className="required">*</span></label>
                <input type="text" name="cin" value={formData.cin} onChange={handleChange} required maxLength={8} />
              </div>

              <div className="db-field">
                <label>{t('demande.label_date_naissance')} <span className="required">*</span></label>
                <input type="date" name="date_naissance" value={formData.date_naissance} onChange={handleChange} required />
              </div>

              <div className="db-field db-wide">
                <label>{t('demande.label_adresse')} <span className="required">*</span></label>
                <textarea name="adresse" value={formData.adresse} onChange={handleChange} rows={3} required />
              </div>

              <div className="db-field">
                <label>{t('demande.label_genre')} <span className="required">*</span></label>
                <select name="genre" value={formData.genre} onChange={handleChange} required>
                  <option value="">{t('demande.placeholder_select')}</option>
                  <option value="homme">{t('demande.genre_homme')}</option>
                  <option value="femme">{t('demande.genre_femme')}</option>
                </select>
              </div>

              <div className="db-field">
                <label>{t('demande.label_situation')} <span className="required">*</span></label>
                <input 
                  type="text" 
                  name="situation_familiale" 
                  value={formData.situation_familiale} 
                  onChange={handleChange} 
                  placeholder={t('demande.placeholder_situation')} 
                  required 
                />
              </div>

              <div className="db-field">
                <div className="db-label-row">
                  <label>{t('demande.label_montant')} <span className="required">*</span></label>
                  <span className={`db-montant-display ${montantValue > 0 ? 'valid' : ''}`}>
                    {montantValue.toLocaleString()} DT
                  </span>
                </div>
                <input 
                  type="number" 
                  name="montant_a_collecter" 
                  value={formData.montant_a_collecter} 
                  onChange={handleChange} 
                  min="1" step="0.01" required 
                />
              </div>

              <div className="db-field">
                <label>{t('demande.label_association')} <span className="required">*</span></label>
                <div className="db-assoc-preview">
                  <select name="association_id" value={formData.association_id} onChange={handleChange} required>
                    <option value="">{t('demande.placeholder_select')}</option>
                    {associations.map((a) => (
                      <option key={a.id} value={a.id}>{a.nom}</option>
                    ))}
                  </select>
                  {selectedAssociation && (
                    <div className="db-assoc-info">
                      {selectedAssociation.logo ? (
                        <img 
                          src={`${API_BASE}/upload/${selectedAssociation.logo}`} 
                          alt={selectedAssociation.nom}
                          className="db-assoc-logo"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      ) : (
                        <div className="db-assoc-avatar">
                          {selectedAssociation.nom.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span>{selectedAssociation.nom}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="db-field db-wide">
                <div className="db-label-row">
                  <label>{t('demande.label_description')} <span className="required">*</span></label>
                  <span className={`db-counter ${descriptionLen >= 20 ? 'valid' : ''}`}>
                    {descriptionLen}/500
                  </span>
                </div>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  maxLength={500}
                  placeholder={t('demande.placeholder_description')}
                  required
                />
                <small className="db-help">{t('demande.help_description')}</small>
              </div>

              {/* Documents */}
              <div className="db-docs-section">
                <h3 className="db-section-title">
                  <Paperclip size={16} /> {t('demande.section_docs')}
                </h3>
                
                {/* Doc 1: Preuve de situation (Obligatoire) */}
                <div className={`db-file-field ${files.doc_identite ? 'complete' : ''}`}>
                  <label>
                    {t('demande.doc_identite_label')} 
                    <span className="required">*</span>
                    <button type="button" className="db-doc-help-btn" onClick={() => setHelpOpen(true)}>
                      <HelpCircle size={12} />
                    </button>
                  </label>
                  <input 
                    type="file" 
                    name="doc_identite" 
                    accept=".jpg,.jpeg,.png,.pdf" 
                    onChange={handleFileChange} 
                    required 
                  />
                  {files.doc_identite && (
                    <div className="db-file-name">
                      <CheckCircle2 size={12} /> {files.doc_identite.name}
                    </div>
                  )}
                  <small className="db-file-hint">{t('demande.doc_identite_hint')}</small>
                </div>

                {/* Doc 2: Document supplémentaire (Optionnel) */}
                <div className={`db-file-field ${files.doc_autre ? 'complete' : ''}`}>
                  <label>
                    {t('demande.doc_autre_label')}
                    <span className="optional-badge">{t('demande.optional_label')}</span>
                    <button type="button" className="db-doc-help-btn" onClick={() => setHelpOpen(true)}>
                      <HelpCircle size={12} />
                    </button>
                  </label>
                  <input 
                    type="file" 
                    name="doc_autre" 
                    accept=".jpg,.jpeg,.png,.pdf" 
                    onChange={handleFileChange} 
                  />
                  {files.doc_autre && (
                    <div className="db-file-name">
                      <Paperclip size={12} /> {files.doc_autre.name}
                    </div>
                  )}
                  <small className="db-file-hint">{t('demande.doc_autre_hint')}</small>
                </div>
              </div>

            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className={`db-submit ${loading ? 'loading' : ''}`} 
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="db-spinner"></span>
                  {t('demande.btn_loading')}
                </>
              ) : (
                t('demande.btn_submit')
              )}
            </button>

          </form>
        </div>
      </div>

      {/* 🔘 MODAL D'AIDE — Rendu à la fin */}
      <BeneficiaireHelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
};

export default DemandeForm;