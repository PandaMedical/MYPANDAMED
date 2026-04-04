# PandaMed App

Application full-stack PandaMed avec :

- `client/` : interface React + Vite
- `server/` : API Express
- `api/` : point d'entree Vercel pour l'API
- `vercel.json` : configuration de build/deploiement

## Stack de production visee

- Frontend : Vercel
- API : Vercel Functions
- Base de donnees : Supabase PostgreSQL

## Variables d'environnement

Copiez `.env.example` vers `.env` puis renseignez :

- `DATABASE_URL`
- `SESSION_SECRET`
- `PGSSLMODE=require`
- `ENABLE_DEMO_SEED=false`

Exemple Supabase :

`DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres`

## Installation locale

1. Installer les dependances :
   `npm install`
2. Renseigner `.env`
3. Lancer le projet :
   `npm run dev`

Le front tourne sur `http://localhost:5173` et l'API sur `http://localhost:4000`.

## Preparation Supabase

1. Creer un projet Supabase
2. Recuperer la chaine PostgreSQL dans `Project Settings > Database`
3. La placer dans `DATABASE_URL`
4. Lancer localement l'API une premiere fois : les tables et les donnees de seed seront creees automatiquement

Pour une vraie production, laissez `ENABLE_DEMO_SEED=false` afin d'eviter l'insertion des comptes et donnees de demonstration.

## Deploiement Vercel

1. Pousser le projet sur GitHub
2. Importer le repo dans Vercel
3. Ajouter les variables d'environnement :
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `PGSSLMODE=require`
   - `ENABLE_DEMO_SEED=false`
4. Lancer le deploiement

Le build frontend sort dans `client/dist` et l'API est exposee via `api/[...route].js`.
