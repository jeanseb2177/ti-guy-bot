# 🏕️ Ti-Guy Bot — Mon Camp de Base

Bot de génération de contenu vidéo pour Ti-Guy Desbois, ambassadeur de Mon Camp de Base.

## Fonctionnement

- **Mardi 8h** : Génère automatiquement un script Conseil Plein Air
- **Jeudi 8h** : Génère automatiquement un script Revue Produit
- Dashboard web pour approuver ou rejeter avant publication
- Intégration HeyGen pour générer les vidéos avatar Ti-Guy

## Installation

```bash
npm install
cp .env.example .env
# Remplir les variables dans .env
npm start
```

## Variables d'environnement

| Variable | Requis | Description |
|----------|--------|-------------|
| ANTHROPIC_API_KEY | ✅ | Clé API Anthropic |
| HEYGEN_API_KEY | ⚠️ | Clé API HeyGen (optionnel) |
| HEYGEN_AVATAR_ID | ⚠️ | ID avatar Ti-Guy dans HeyGen |
| DASHBOARD_PASSWORD | ✅ | Mot de passe dashboard |
| PORT | ❌ | Port serveur (défaut: 3000) |

## Déploiement Railway

1. Créer nouveau projet Railway
2. Connecter repo GitHub
3. Ajouter les variables d'environnement
4. Deploy !

## Workflow d'approbation

```
Génération (Anthropic API)
        ↓
HeyGen → vidéo avatar Ti-Guy
        ↓
Dashboard → Jean Seb approuve ✅
        ↓
Publication manuelle sur réseaux sociaux
```
