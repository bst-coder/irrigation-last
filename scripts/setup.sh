#!/bin/bash

# Script de configuration automatique du système d'irrigation

echo "🌱 Configuration du Système d'Irrigation Automatique"
echo "=================================================="

# Vérifier les prérequis
command -v docker >/dev/null 2>&1 || { echo "❌ Docker requis mais non installé. Abandon." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose requis mais non installé. Abandon." >&2; exit 1; }

# Créer les dossiers nécessaires
echo "📁 Création des dossiers..."
mkdir -p ssl monitoring/grafana/{dashboards,datasources} logs

# Générer les certificats SSL auto-signés (pour développement)
echo "🔐 Génération des certificats SSL..."
if [ ! -f ssl/server.crt ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/server.key \
        -out ssl/server.crt \
        -subj "/C=FR/ST=France/L=Paris/O=IrrigationSystem/CN=localhost"
fi

# Copier le fichier d'environnement
echo "⚙️  Configuration de l'environnement..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Fichier .env créé. Veuillez le configurer avec vos clés API."
fi

# Construire et démarrer les services
echo "🚀 Démarrage des services..."
docker-compose up -d --build

# Attendre que MongoDB soit prêt
echo "⏳ Attente du démarrage de MongoDB..."
sleep 10

# Initialiser la base de données
echo "🗄️  Initialisation de la base de données..."
docker-compose exec mongodb mongosh irrigation_system /docker-entrypoint-initdb.d/init-mongo.js

# Vérifier le statut des services
echo "🔍 Vérification des services..."
docker-compose ps

echo ""
echo "✅ Installation terminée!"
echo ""
echo "🌐 Services disponibles:"
echo "   - Application: http://localhost:3000"
echo "   - Grafana: http://localhost:3001 (admin/admin123)"
echo "   - Prometheus: http://localhost:9090"
echo "   - MongoDB: localhost:27017"
echo ""
echo "📖 Consultez le README.md pour plus d'informations"
