# 🌱 Système d'Irrigation Automatique avec IA

Un système complet d'irrigation automatique utilisant ESP32, intelligence artificielle et architecture MERN.

## 🏗️ Architecture

### Backend (Node.js + Express + MongoDB)
- **Authentification sécurisée** : JWT avec refresh tokens, RBAC (user/technician/developer)
- **API REST complète** : Gestion des utilisateurs, dispositifs, zones, données capteurs
- **Intelligence Artificielle** : Intégration GROQ pour suggestions et chat
- **Services internes** : Scheduler, notifications email, diagnostics
- **Tests** : Jest + Supertest pour tous les endpoints

### Frontend (React + TailwindCSS)
- **Dashboard temps réel** : Vue d'ensemble des zones avec graphiques
- **Gestion des zones** : CRUD avec validation des limites (4 zones/device, 12 capteurs)
- **Chat IA intégré** : Assistant intelligent pour optimisation
- **Interface responsive** : Design moderne avec shadcn/ui

### Firmware ESP32 (C++ + FreeRTOS)
- **Tâches multiples** : Capteurs, communication, contrôle, WiFi
- **Capteurs** : BME280 + capteurs d'humidité du sol
- **Contrôle** : Pompe + 4 électrovannes via relais
- **Résilience** : Mode local autonome si déconnecté

### Infrastructure
- **Docker Compose** : Déploiement complet avec MongoDB, Redis, Nginx
- **Monitoring** : Prometheus + Grafana avec alertes
- **CI/CD** : GitHub Actions pour tests et déploiement

## 🚀 Installation Rapide

\`\`\`bash
# Cloner le projet
git clone <repository-url>
cd irrigation-system

# Configuration automatique
chmod +x scripts/setup.sh
./scripts/setup.sh

# Ou installation manuelle
cp .env.example .env
# Configurer vos clés API dans .env
docker-compose up -d --build
\`\`\`

## 📱 Utilisation

### 1. Accès à l'application
- **Dashboard** : http://localhost:3000
- **Grafana** : http://localhost:3001 (admin/admin123)
- **Prometheus** : http://localhost:9090

### 2. Configuration initiale
1. Créer un compte utilisateur
2. Enregistrer un dispositif ESP32 (rôle technician requis)
3. Créer des zones d'irrigation
4. Activer l'IA pour des suggestions automatiques

### 3. ESP32 Setup
\`\`\`cpp
// Configurer dans firmware/main.cpp
#define DEVICE_ID "ESP32_001"
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
\`\`\`

## 🔧 API Endpoints

### Authentification
- `POST /api/auth/signup` - Créer un compte
- `POST /api/auth/login` - Se connecter
- `POST /api/auth/refresh` - Renouveler le token

### Zones
- `GET /api/zones` - Lister les zones
- `POST /api/zones` - Créer une zone (limite: 4/device)
- `PUT /api/zones/:id` - Modifier une zone
- `DELETE /api/zones/:id` - Supprimer une zone

### Données capteurs
- `POST /api/data` - Recevoir données ESP32
- `GET /api/data?zoneId=&start=&end=` - Historique

### Intelligence Artificielle
- `POST /api/ai/chat` - Chat avec l'IA
- `GET /api/ai/suggestions` - Suggestions critiques
- `POST /api/ai/ack` - Accuser réception

## 🧪 Tests

\`\`\`bash
# Tests unitaires backend
npm test

# Tests d'intégration
npm run test:e2e

# Tests avec couverture
npm run test:coverage
\`\`\`

## 📊 Monitoring

### Métriques disponibles
- Statut des dispositifs ESP32
- Données des capteurs en temps réel
- Performance de l'API
- Utilisation des ressources

### Alertes configurées
- Dispositif hors ligne > 2h
- Humidité critique < 20%
- Température extrême > 40°C
- Erreurs API > 5%

## 🔒 Sécurité

- **HTTPS** obligatoire en production
- **JWT** avec rotation automatique
- **Rate limiting** sur toutes les routes
- **Validation** stricte des données
- **RBAC** pour contrôle d'accès

## 🌍 Variables d'environnement

\`\`\`env
# Base de données
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=irrigation_system

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret

# IA
GROQ_API_KEY=your-groq-api-key

# Email (optionnel)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
\`\`\`

## 📈 Évolutions futures

- [ ] Application mobile React Native
- [ ] Intégration météo avancée
- [ ] Machine Learning pour prédictions
- [ ] Support multi-langues
- [ ] API GraphQL
- [ ] Notifications push

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

- **Documentation** : [Wiki du projet]
- **Issues** : [GitHub Issues]
- **Email** : support@irrigation-system.com

---

**Développé avec ❤️ pour l'agriculture de précision**
