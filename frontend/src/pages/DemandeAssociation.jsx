import { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Mail, Phone, User, MapPin, Tag, FileText, Upload,
  CheckCircle, AlertCircle, Loader2, Image as ImageIcon, File,
  ChevronRight, Shield, HelpCircle, X, BadgeCheck, Landmark, Users, CheckCircle2
} from 'lucide-react';
import './DemandeAssociation.css';
import { useTranslation } from 'react-i18next';

const API = 'http://localhost:5000';

/* ────────────────────────────────────────────────────────────
   🆘 MODAL D'AIDE — ASSOCIATION (avec traductions i18n)
   ──────────────────────────────────────────────────────────── */
const AssociationHelpModal = ({ isOpen, onClose }) => {
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
            {t('associationRequest.help.modal_title')}
          </h3>
          <button className="help-close" onClick={onClose} aria-label={t('common.close')}>
            <X size={16} />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="help-content">
          {/* 1. Statut Juridique */}
          <div className="help-section">
            <h4 className="help-section-title">
              <FileText size={16} /> {t('associationRequest.help.doc1_title')}
            </h4>
            <p className="help-desc">{t('associationRequest.help.doc1_desc')}</p>
            <p className="help-label">{t('associationRequest.help.contains_label')} :</p>
            <ul className="help-list">
              <li>{t('associationRequest.help.doc1_item1')}</li>
              <li>{t('associationRequest.help.doc1_item2')}</li>
              <li>{t('associationRequest.help.doc1_item3')}</li>
              <li>{t('associationRequest.help.doc1_item4')}</li>
              <li>{t('associationRequest.help.doc1_item5')}</li>
            </ul>
            <p className="help-note">
              <CheckCircle2 size={14} /> {t('associationRequest.help.doc1_note')}
            </p>
          </div>

          {/* 2. Autorisation Légale */}
          <div className="help-section">
            <h4 className="help-section-title">
              <BadgeCheck size={16} /> {t('associationRequest.help.doc2_title')}
            </h4>
            <p className="help-desc">{t('associationRequest.help.doc2_desc')}</p>
            <p className="help-label">{t('associationRequest.help.contains_label')} :</p>
            <ul className="help-list">
              <li>{t('associationRequest.help.doc2_item1')}</li>
              <li>{t('associationRequest.help.doc2_item2')}</li>
              <li>{t('associationRequest.help.doc2_item3')}</li>
            </ul>
            <p className="help-note">
              <CheckCircle2 size={14} /> {t('associationRequest.help.doc2_note')}
            </p>
          </div>

          {/* 3. RIB */}
          <div className="help-section">
            <h4 className="help-section-title">
              <Landmark size={16} /> {t('associationRequest.help.doc3_title')}
            </h4>
            <p className="help-desc">{t('associationRequest.help.doc3_desc')}</p>
            <p className="help-label">{t('associationRequest.help.contains_label')} :</p>
            <ul className="help-list">
              <li>{t('associationRequest.help.doc3_item1')}</li>
              <li>{t('associationRequest.help.doc3_item2')}</li>
              <li>{t('associationRequest.help.doc3_item3')}</li>
              <li>{t('associationRequest.help.doc3_item4')}</li>
            </ul>
            <p className="help-note">
              <CheckCircle2 size={14} /> {t('associationRequest.help.doc3_note')}
            </p>
            <p className="help-warning">
              <AlertCircle size={14} /> {t('associationRequest.help.doc3_warning')}
            </p>
          </div>

          {/* 4. Bureau Directeur */}
          <div className="help-section">
            <h4 className="help-section-title">
              <Users size={16} /> {t('associationRequest.help.doc4_title')}
            </h4>
            <p className="help-desc">{t('associationRequest.help.doc4_desc')}</p>
            <p className="help-label">{t('associationRequest.help.contains_label')} :</p>
            <ul className="help-list">
              <li>{t('associationRequest.help.doc4_item1')}</li>
              <li>{t('associationRequest.help.doc4_item2')}</li>
              <li>{t('associationRequest.help.doc4_item3')}</li>
            </ul>
            <p className="help-note">
              <CheckCircle2 size={14} /> {t('associationRequest.help.doc4_note')}
            </p>
            <p className="help-warning">
              <AlertCircle size={14} /> {t('associationRequest.help.doc4_warning')}
            </p>
          </div>

          {/* Note Générale */}
          <div className="help-footer-warning">
            <AlertCircle size={16} className="footer-warn-icon" />
            <div>
              <strong>{t('associationRequest.help.general_note_title')}</strong>
              <p>{t('associationRequest.help.general_note_intro')}</p>
              <ul className="footer-list">
                <li>{t('associationRequest.help.general_note_item1')}</li>
                <li>{t('associationRequest.help.general_note_item2')}</li>
                <li>{t('associationRequest.help.general_note_item3')}</li>
              </ul>
              <p className="footer-note">
                <CheckCircle2 size={14} /> {t('associationRequest.help.general_note_conclusion')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   HOOK : Chargement des catégories
   ──────────────────────────────────────────────────────────── */
const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/categories`)
      .then(res => setCategories(Array.isArray(res.data) ? res.data : []))
      .catch(err => {
        console.error('Erreur fetch catégories:', err);
        setCategories([
          { value: 'education', label: 'Éducation' },
          { value: 'health', label: 'Santé' },
          { value: 'food', label: 'Alimentation' },
          { value: 'housing', label: 'Logement' },
          { value: 'emergency', label: 'Urgence' },
          { value: 'skills', label: 'Formation' },
          { value: 'other', label: 'Autre' },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading };
};

/* ────────────────────────────────────────────────────────────
   COMPOSANT PRINCIPAL : DemandeAssociation
   ──────────────────────────────────────────────────────────── */
const DemandeAssociation = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const [loading, setLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const { categories: dbCategories, loading: categoriesLoading } = useCategories();

  const [form, setForm] = useState({
    nom_association: '', email: '', telephone: '', adresse: '',
    responsable: '', categorie: '', description: '',
    logo: null, doc_statut: null, doc_autorisation: null,
    doc_registre: null, doc_cin: null,
  });

  const [filePreviews, setFilePreviews] = useState({ logo: null });
  
  const selectedCategory = useMemo(
    () => dbCategories.find((c) => c.value === form.categorie) || null,
    [form.categorie, dbCategories]
  );

  useEffect(() => {
    return () => {
      if (filePreviews.logo) URL.revokeObjectURL(filePreviews.logo);
    };
  }, [filePreviews.logo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFile = (e) => {
    const { name, files } = e.target;
    const file = files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({ icon: 'warning', title: t('common.file_too_large_title'), text: t('common.file_too_large_text') });
        e.target.value = '';
        return;
      }
      if (name === 'logo') {
        setFilePreviews((prev) => ({ ...prev, [name]: URL.createObjectURL(file) }));
      }
      setForm((prev) => ({ ...prev, [name]: file }));
    }
  };

  const requiredDocs = useMemo(() => [
    { key: 'doc_statut', label: t('associationRequest.doc_statut'), icon: FileText },
    { key: 'doc_autorisation', label: t('associationRequest.doc_autorisation'), icon: Shield },
    { key: 'doc_registre', label: t('associationRequest.doc_registre'), icon: File },
    { key: 'doc_cin', label: t('associationRequest.doc_cin'), icon: User },
  ], [t]);

  const missingDocsCount = requiredDocs.filter((d) => !form[d.key]).length;
  const descriptionLen = useMemo(() => form.description.trim().length, [form.description]);

  const validate = () => {
    if (!form.nom_association.trim()) return t('validation.name_required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return t('validation.email_invalid');
    if (!/^\+?[0-9\s\-()]{8,}$/.test(form.telephone)) return t('validation.phone_invalid');
    if (!form.responsable.trim()) return t('validation.manager_required');
    if (!form.adresse.trim()) return t('validation.address_required');
    if (!form.categorie) return t('validation.category_required');
    if (!form.description.trim() || form.description.trim().length < 20) return t('validation.description_short');
    for (const d of requiredDocs) {
      if (!form[d.key]) return t('validation.doc_required').replace('{doc}', d.label);
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errMsg = validate();
    if (errMsg) {
      Swal.fire({ icon: 'warning', title: t('form.incomplete_title'), text: errMsg });
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.keys(form).forEach((key) => {
        const value = form[key];
        if (value && typeof value === 'object' && value.name) {
          fd.append(key, value);
        } else if (value !== null && value !== undefined) {
          fd.append(key, value);
        }
      });
      
      await axios.post(`${API}/demandes`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      Swal.fire({ 
        icon: 'success', 
        title: t('form.success_title'), 
        text: t('form.success_text'), 
        timer: 2600, 
        showConfirmButton: false 
      });
      navigate('/');
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: t('common.error_title'), text: err.response?.data?.message || t('common.server_error') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="da-page" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="da-shell">
        
        {/* HERO */}
        <header className="da-hero">
          <div className="da-hero-badge">
            <Building2 size={14} />
            <span>{t('associationRequest.hero_badge')}</span>
          </div>
          <h1 className="da-title">{t('associationRequest.title')}</h1>
          <p className="da-subtitle">{t('associationRequest.subtitle')}</p>

          {/* Steps indicator */}
          <div className="da-steps" aria-label={t('associationRequest.progress_label')}>
            <div className={`da-step ${!missingDocsCount ? 'is-complete' : 'is-active'}`}>
              <div className="da-step-number">1</div>
              <span>{t('associationRequest.step_1')}</span>
            </div>
            <div className={`da-step ${missingDocsCount === 0 ? 'is-complete' : missingDocsCount < 4 ? 'is-active' : ''}`}>
              <div className="da-step-number">2</div>
              <span>{t('associationRequest.step_2')}</span>
            </div>
            <div className={`da-step ${missingDocsCount === 0 && descriptionLen >= 20 ? 'is-complete' : ''}`}>
              <div className="da-step-number">3</div>
              <span>{t('associationRequest.step_3')}</span>
            </div>
          </div>
        </header>

        {/* FORM CARD */}
        <div className="da-card">
          <form onSubmit={handleSubmit} className="da-form" noValidate>
            
            {/* 🔘 BOUTON AIDE */}
            <div className="da-help-button-wrap">
              <button type="button" className="da-btn-help" onClick={() => setHelpOpen(true)}>
                <HelpCircle size={16} />
                <span>{t('associationRequest.btn_help')}</span>
              </button>
            </div>

            {/* Section: Identité */}
            <fieldset className="da-section">
              <legend className="da-section-title">
                <Building2 size={18} />
                <span>{t('associationRequest.section_identity')}</span>
              </legend>
              <div className="da-grid">
                <FormField icon={Building2} label={t('associationRequest.label_name')} name="nom_association" type="text" value={form.nom_association} onChange={handleChange} required placeholder={t('associationRequest.placeholder_name')} />
                <FormField icon={Mail} label={t('associationRequest.label_email')} name="email" type="email" value={form.email} onChange={handleChange} required placeholder={t('associationRequest.placeholder_email')} />
                <FormField icon={Phone} label={t('associationRequest.label_phone')} name="telephone" type="tel" value={form.telephone} onChange={handleChange} required placeholder={t('associationRequest.placeholder_phone')} />
                <FormField icon={User} label={t('associationRequest.label_manager')} name="responsable" type="text" value={form.responsable} onChange={handleChange} required placeholder={t('associationRequest.placeholder_manager')} />
                
                <div className="da-field da-wide">
                  <label><MapPin size={16} className="da-field-icon" /> {t('associationRequest.label_address')} <span className="required">*</span></label>
                  <textarea name="adresse" value={form.adresse} onChange={handleChange} rows={2} required placeholder={t('associationRequest.placeholder_address')} />
                </div>
                
                {/* Catégorie dynamique */}
                <div className="da-field da-wide">
                  <label><Tag size={16} className="da-field-icon" /> {t('associationRequest.label_category')} <span className="required">*</span></label>
                  {categoriesLoading ? (
                    <div className="da-loading-mini"><Loader2 size={16} className="da-spinner" /> {t('common.loading')}</div>
                  ) : (
                    <div className="da-category-row">
                      <select name="categorie" value={form.categorie} onChange={handleChange} required disabled={dbCategories.length === 0}>
                        <option value="">{t('associationRequest.placeholder_category')}</option>
                        {dbCategories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                      {selectedCategory && (
                        <div className="da-category-preview">
                          <span className="da-category-label">{selectedCategory.label}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <small className="da-help">{t('associationRequest.help_category')}</small>
                </div>

                {/* Description */}
                <div className="da-field da-wide">
                  <div className="da-label-row">
                    <label><FileText size={16} className="da-field-icon" /> {t('associationRequest.label_description')} <span className="required">*</span></label>
                    <span className={`da-counter ${descriptionLen < 20 ? 'da-counter--warning' : ''}`}>{descriptionLen}{t('associationRequest.counter_desc')}</span>
                  </div>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={4} required placeholder={t('associationRequest.placeholder_description')} />
                  <small className="da-help">{t('associationRequest.help_description')}</small>
                </div>

                {/* Logo upload */}
                <div className="da-field da-wide">
                  <label><ImageIcon size={16} className="da-field-icon" /> {t('associationRequest.label_logo')}</label>
                  <div className="da-logo-upload">
                    <input type="file" name="logo" accept="image/*" onChange={handleFile} className="da-file-input" id="logo-upload" />
                    <label htmlFor="logo-upload" className="da-file-label">
                      {filePreviews.logo ? (
                        <>
                          <img src={filePreviews.logo} alt="Preview" className="da-logo-preview-img" />
                          <span className="da-file-change">{t('associationRequest.btn_change_logo')}</span>
                        </>
                      ) : (
                        <>
                          <Upload size={24} />
                          <span>{t('associationRequest.btn_upload_logo')}</span>
                          <small>{t('associationRequest.logo_hint')}</small>
                        </>
                      )}
                    </label>
                    {filePreviews.logo && (
                      <button type="button" className="da-file-remove" onClick={() => { setFilePreviews({ logo: null }); setForm(prev => ({ ...prev, logo: null })); }}>✕</button>
                    )}
                  </div>
                </div>
              </div>
            </fieldset>

            {/* Section: Documents */}
            <fieldset className="da-section">
              <legend className="da-section-title">
                <FileText size={18} />
                <span>{t('associationRequest.section_docs')}</span>
              </legend>
              
              <div className="da-docs-summary">
                <div className="da-docs-summary-icon">
                  {missingDocsCount === 0 ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                </div>
                <div className="da-docs-summary-text">
                  <strong>
                    {missingDocsCount === 0 
                      ? t('associationRequest.docs_summary_complete') 
                      : t('associationRequest.docs_summary_missing').replace('{count}', missingDocsCount)}
                  </strong>
                  <span>{t('associationRequest.docs_hint')}</span>
                </div>
              </div>

              <div className="da-doc-grid">
                {requiredDocs.map((d) => {
                  const Icon = d.icon;
                  const hasFile = !!form[d.key];
                  return (
                    <div key={d.key} className={`da-file-card ${hasFile ? 'da-file-card--complete' : ''}`}>
                      <div className="da-file-card-header">
                        <div className="da-file-card-icon">
                          <Icon size={20} />
                        </div>
                        <label className="da-file-card-title">
                          {d.label} <span className="required">*</span>
                        </label>
                        {hasFile && <CheckCircle size={18} className="da-file-check" />}
                      </div>
                      
                      <div className="da-file-upload-wrapper">
                        <input type="file" name={d.key} accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} className="da-file-input" id={`file-${d.key}`} />
                        <label htmlFor={`file-${d.key}`} className="da-file-upload-btn">
                          {hasFile ? (
                            <>
                              <File size={16} />
                              <span className="da-file-name">{form[d.key].name}</span>
                              <span className="da-file-change-text">{t('associationRequest.btn_modify_file')}</span>
                            </>
                          ) : (
                            <>
                              <Upload size={16} />
                              <span>{t('associationRequest.btn_select_file')}</span>
                            </>
                          )}
                        </label>
                        {hasFile && (
                          <button type="button" className="da-file-remove-small" onClick={() => setForm(prev => ({ ...prev, [d.key]: null }))}>✕</button>
                        )}
                      </div>
                      
                      <small className="da-file-hint">{t('associationRequest.file_hint')}</small>
                    </div>
                  );
                })}
              </div>
            </fieldset>

            {/* Actions */}
            <div className="da-actions">
              <button type="button" className="da-btn da-btn--secondary" onClick={() => navigate(-1)}>
                {t('associationRequest.btn_cancel')}
              </button>
              <button type="submit" className="da-btn da-btn--primary" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={18} className="da-btn-spinner" />
                    <span>{t('associationRequest.btn_loading')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>{t('associationRequest.btn_submit')}</span>
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>

            <p className="da-privacy">
              <Shield size={14} />
              <span>{t('associationRequest.privacy_text')} <a href="/privacy">{t('associationRequest.privacy_link')}</a></span>
            </p>
          </form>
        </div>
      </div>

      {/* 🔘 MODAL D'AIDE */}
      <AssociationHelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   Composant Field réutilisable
   ──────────────────────────────────────────────────────────── */
const FormField = ({ icon: Icon, label, name, type, value, onChange, required, placeholder }) => (
  <div className="da-field">
    <label>
      {Icon && <Icon size={16} className="da-field-icon" />}
      {label} {required && <span className="required">*</span>}
    </label>
    {type === 'textarea' ? (
      <textarea name={name} value={value} onChange={onChange} required={required} placeholder={placeholder} rows={3} />
    ) : (
      <input type={type} name={name} value={value} onChange={onChange} required={required} placeholder={placeholder} />
    )}
  </div>
);

export default DemandeAssociation;