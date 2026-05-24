from flask import Flask, jsonify
import mysql.connector
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
import numpy as np

app = Flask(__name__)

DB_CONFIG = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': 'eyaeya',
    'database': 'charity',
    'port': 3306
}

# ------------------ SAFE CONVERT ------------------
def safe_float(df):
    return df.apply(pd.to_numeric, errors='coerce').fillna(0).astype(float)

# ------------------ DATA FETCH ------------------
def get_association_features():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT
            a.id AS association_id,
            a.nom AS nom_association,
            COUNT(DISTINCT b.id) AS nb_beneficiaires,
            COUNT(DISTINCT CASE WHEN b.montant_restant = 0 THEN b.id END) AS nb_beneficiaires_aides,
            COALESCE(SUM(d.montant), 0) AS montant_total_collecte,
            COALESCE(AVG(b.pourcentage), 0) AS pourcentage_moyen,
            COUNT(DISTINCT d.id) AS nb_dons
        FROM associations a
        LEFT JOIN beneficiaires b ON b.association_id = a.id
        LEFT JOIN donations d ON d.beneficiaire_id = b.id
        WHERE a.blocked = 0
        GROUP BY a.id, a.nom
    """

    cursor.execute(query)
    rows = cursor.fetchall()

    cursor.close()
    conn.close()
    return rows

# ------------------ CATEGORY SIMPLE ------------------
def get_category(score):
    if score >= 60:
        return "Fort impact"
    elif score >= 30:
        return "Impact modéré"
    else:
        return "Faible impact"

# ------------------ API ------------------
@app.route('/classify', methods=['GET'])
def classify():
    data = get_association_features()

    if not data:
        return jsonify([])

    df = pd.DataFrame(data)

    features = [
        'nb_beneficiaires',
        'nb_beneficiaires_aides',
        'montant_total_collecte',
        'pourcentage_moyen',
        'nb_dons'
    ]

    # ------------------ CLEAN DATA ------------------
    X = safe_float(df[features])

    # ------------------ NORMALISATION ------------------
    min_vals = X.min()
    max_vals = X.max()
    denom = (max_vals - min_vals).replace(0, 1e-9)

    X_norm = (X - min_vals) / denom
    X_norm = X_norm.fillna(0)

    # ------------------ SCORE IA (0 → 100) ------------------
    df['score_impact'] = (
        X_norm['montant_total_collecte'] * 0.40 +
        X_norm['nb_dons'] * 0.25 +
        X_norm['nb_beneficiaires_aides'] * 0.20 +
        X_norm['pourcentage_moyen'] * 0.10 +
        X_norm['nb_beneficiaires'] * 0.05
    ) * 100

    # bonus léger
    df['score_impact'] += (
        X_norm['montant_total_collecte'] /
        (X_norm['nb_beneficiaires'] + 1)
    ) * 10

    df['score_impact'] = df['score_impact'].fillna(0)
    df['score_impact'] = df['score_impact'].clip(0, 100).round(1)

    # ------------------ CLUSTERING SAFE ------------------
    X_scaled = StandardScaler().fit_transform(X)

    n_clusters = min(3, len(df))

    if n_clusters > 1:
        km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        df['cluster'] = km.fit_predict(X_scaled)

        cluster_score = df.groupby('cluster')['score_impact'].mean().sort_values(ascending=False)

        labels = {}
        clusters = list(cluster_score.index)

        # SAFE mapping (plus d'erreur index)
        labels[clusters[0]] = "Fort impact"

        if len(clusters) > 1:
            labels[clusters[1]] = "Impact modéré"

        if len(clusters) > 2:
            labels[clusters[2]] = "Faible impact"

        df['categorie'] = df['cluster'].map(labels)

    else:
        df['categorie'] = df['score_impact'].apply(get_category)

    # ------------------ RANKING ------------------
    df = df.sort_values('score_impact', ascending=False)
    df['rang'] = range(1, len(df) + 1)

    # ------------------ RESULT ------------------
    result = df[[
        'rang',
        'association_id',
        'nom_association',
        'score_impact',
        'categorie',
        'nb_beneficiaires',
        'nb_beneficiaires_aides',
        'montant_total_collecte',
        'pourcentage_moyen',
        'nb_dons'
    ]].to_dict(orient='records')

    return jsonify(result)

# ------------------ RUN ------------------
if __name__ == '__main__':
    app.run(port=5001, debug=True)

@app.route('/')
def home():
    return "API Charity AI is running 🚀"


if __name__ == '__main__':
    app.run(port=5001, debug=True)