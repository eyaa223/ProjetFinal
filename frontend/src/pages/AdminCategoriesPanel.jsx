import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./AdminCategoriesPanel.css";

const API_BASE = "http://localhost:5000";

const slugify = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");

export default function AdminCategoriesPanel({ token }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editIconFile, setEditIconFile] = useState(null);
  const [editIconPreview, setEditIconPreview] = useState(null);
  const [search, setSearch] = useState("");

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3500);
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/admin/categories`, {
        headers: authHeaders,
      });
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setCategories([]);
      showMessage("Impossible de charger les catégories", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleIconChange = (e, setter, previewSetter) => {
    const file = e.target.files?.[0] || null;
    setter(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => previewSetter(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      previewSetter(null);
    }
  };

  const createCategory = async (e) => {
    e.preventDefault();
    const finalValue = value?.trim() ? value.trim() : slugify(label);
    if (!finalValue) { showMessage("Value invalide", "error"); return; }
    try {
      setSaving(true);
      const res = await axios.post(
        `${API_BASE}/admin/categories`,
        { value: finalValue, label },
        { headers: authHeaders }
      );
      const created = res.data;
      if (iconFile && created?.id) {
        const form = new FormData();
        form.append("icon", iconFile);
        await axios.post(`${API_BASE}/admin/categories/${created.id}/icon`, form, {
          headers: authHeaders,
        });
      }
      setLabel(""); setValue(""); setIconFile(null); setIconPreview(null);
      await fetchCategories();
      showMessage("Catégorie créée avec succès !");
    } catch (e) {
      const msg = e?.response?.data?.message;
      showMessage(msg || "Erreur lors de la création", "error");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setEditLabel(cat.label || "");
    setEditValue(cat.value || "");
    setEditIconFile(null);
    setEditIconPreview(cat.icon ? `${API_BASE}/upload/${cat.icon}` : null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel(""); setEditValue("");
    setEditIconFile(null); setEditIconPreview(null);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await axios.put(
        `${API_BASE}/admin/categories/${editingId}`,
        { value: editValue, label: editLabel },
        { headers: authHeaders }
      );
      if (editIconFile) {
        const form = new FormData();
        form.append("icon", editIconFile);
        await axios.post(`${API_BASE}/admin/categories/${editingId}/icon`, form, {
          headers: authHeaders,
        });
      }
      cancelEdit();
      await fetchCategories();
      showMessage("Catégorie modifiée !");
    } catch (e) {
      const msg = e?.response?.data?.message;
      showMessage(msg || "Erreur modification", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Supprimer cette catégorie ?")) return;
    try {
      setSaving(true);
      await axios.delete(`${API_BASE}/admin/categories/${id}`, { headers: authHeaders });
      await fetchCategories();
      showMessage("Catégorie supprimée");
    } catch (e) {
      const msg = e?.response?.data?.message;
      showMessage(msg || "Erreur suppression", "error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = categories.filter(
    (c) =>
      (c.label || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.value || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="cat-panel">
      {/* ── HEADER ── */}
      <div className="cat-panel__header">
        <div className="cat-panel__header-left">
          <div className="cat-panel__icon-wrap">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M2 5a2 2 0 0 1 2-2h3.586a1 1 0 0 1 .707.293L10 5h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z" />
            </svg>
          </div>
          <div>
            <h2 className="cat-panel__title">Catégories</h2>
            <p className="cat-panel__subtitle">
              {categories.length} catégorie{categories.length !== 1 ? "s" : ""} au total
            </p>
          </div>
        </div>
        <div className="cat-panel__search-wrap">
          <svg className="cat-panel__search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6.5" cy="6.5" r="4.5" />
            <path d="M11 11l3 3" />
          </svg>
          <input
            className="cat-panel__search"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── TOAST MESSAGE ── */}
      {message.text && (
        <div className={`cat-toast cat-toast--${message.type}`}>
          {message.type === "success" ? (
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="8" cy="8" r="7" /><path d="M5 8l2 2 4-4" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="8" cy="8" r="7" /><path d="M8 5v3M8 11v.5" />
            </svg>
          )}
          {message.text}
        </div>
      )}

      <div className="cat-panel__body">
        {/* ── FORMULAIRE AJOUT ── */}
        <div className="cat-form-card">
          <div className="cat-form-card__header">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="8" cy="8" r="7" /><path d="M8 5v6M5 8h6" />
            </svg>
            Nouvelle catégorie
          </div>

          <form className="cat-form" onSubmit={createCategory}>
            <div className="cat-form__fields">
              <div className="cat-form__field">
                <label className="cat-form__label">Label <span className="cat-form__required">*</span></label>
                <input
                  className="cat-form__input"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="ex: Santé"
                  required
                />
              </div>

              <div className="cat-form__field">
                <label className="cat-form__label">Value <span className="cat-form__hint">(optionnel)</span></label>
                <input
                  className="cat-form__input"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="ex: sante  — généré si vide"
                />
              </div>

              <div className="cat-form__field cat-form__field--file">
                <label className="cat-form__label">Icône</label>
                <label className="cat-upload">
                  {iconPreview ? (
                    <img src={iconPreview} alt="" className="cat-upload__preview" />
                  ) : (
                    <div className="cat-upload__placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span>Choisir une image</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={(e) => handleIconChange(e, setIconFile, setIconPreview)}
                    style={{ display: "none" }}
                  />
                </label>
                {iconPreview && (
                  <button
                    type="button"
                    className="cat-upload__clear"
                    onClick={() => { setIconFile(null); setIconPreview(null); }}
                  >
                    Supprimer l'image
                  </button>
                )}
              </div>
            </div>

            <div className="cat-form__footer">
              <button type="submit" className="cat-btn cat-btn--primary" disabled={saving}>
                {saving ? (
                  <><span className="cat-spinner" /> Enregistrement…</>
                ) : (
                  <><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="8" cy="8" r="7" /><path d="M8 5v6M5 8h6" />
                  </svg> Ajouter la catégorie</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ── LISTE DES CATÉGORIES ── */}
        <div className="cat-list">
          {loading ? (
            <div className="cat-list__empty">
              <span className="cat-spinner cat-spinner--lg" />
              <span>Chargement…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="cat-list__empty">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 14a4 4 0 0 1 4-4h8l4 4h20a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V14z" />
              </svg>
              <span>{search ? "Aucun résultat" : "Aucune catégorie"}</span>
            </div>
          ) : (
            <div className="cat-grid">
              {filtered.map((c) => {
                const isEditing = editingId === c.id;
                return (
                  <div key={c.id} className={`cat-card ${isEditing ? "cat-card--editing" : ""}`}>
                    {isEditing ? (
                      /* ── MODE ÉDITION ── */
                      <form className="cat-card__edit-form" onSubmit={saveEdit}>
                        <div className="cat-card__edit-header">
                          <span className="cat-card__edit-badge">Modification</span>
                          <button type="button" className="cat-card__edit-close" onClick={cancelEdit}>
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M4 4l8 8M12 4l-8 8" />
                            </svg>
                          </button>
                        </div>

                        <div className="cat-card__edit-icon">
                          <label className="cat-upload cat-upload--sm">
                            {editIconPreview ? (
                              <img src={editIconPreview} alt="" className="cat-upload__preview cat-upload__preview--sm" />
                            ) : (
                              <div className="cat-upload__placeholder cat-upload__placeholder--sm">
                                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <path d="M8 3v10M3 8h10" />
                                </svg>
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              onChange={(e) => handleIconChange(e, setEditIconFile, setEditIconPreview)}
                              style={{ display: "none" }}
                            />
                          </label>
                        </div>

                        <div className="cat-card__edit-fields">
                          <div className="cat-form__field">
                            <label className="cat-form__label">Label</label>
                            <input
                              className="cat-form__input"
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              required
                            />
                          </div>
                          <div className="cat-form__field">
                            <label className="cat-form__label">Value</label>
                            <input
                              className="cat-form__input"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="cat-card__edit-actions">
                          <button type="submit" className="cat-btn cat-btn--success cat-btn--sm" disabled={saving}>
                            {saving ? "…" : "Enregistrer"}
                          </button>
                          <button type="button" className="cat-btn cat-btn--ghost cat-btn--sm" onClick={cancelEdit} disabled={saving}>
                            Annuler
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* ── MODE AFFICHAGE ── */
                      <>
                        <div className="cat-card__top">
                          <div className="cat-card__icon-wrap">
                            {c.icon ? (
                              <img
                                src={`${API_BASE}/upload/${c.icon}`}
                                alt={c.label}
                                className="cat-card__icon"
                              />
                            ) : (
                              <div className="cat-card__icon-placeholder">
                                {(c.label?.[0] || "?").toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="cat-card__info">
                            <div className="cat-card__label">{c.label}</div>
                            <div className="cat-card__value">{c.value}</div>
                          </div>
                        </div>

                        <div className="cat-card__actions">
                          <button
                            className="cat-btn cat-btn--ghost cat-btn--sm"
                            onClick={() => startEdit(c)}
                            disabled={saving}
                          >
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                              <path d="M11 2l3 3-9 9H2v-3L11 2z" />
                            </svg>
                            Modifier
                          </button>
                          <button
                            className="cat-btn cat-btn--danger cat-btn--sm"
                            onClick={() => deleteCategory(c.id)}
                            disabled={saving}
                          >
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                              <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" />
                            </svg>
                            Supprimer
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}