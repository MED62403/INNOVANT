# SANYA SERVICES

Application de gestion pour une entreprise de services environnementaux (collecte des ordures, nettoyage, désinfection) — Guinée, GNF.

## Stack technique

- **Frontend** : React 18 + Vite 6 + TailwindCSS (shadcn/ui)
- **Backend** : Supabase (PostgreSQL + Auth + RLS)
- **Déploiement** : Vercel

## Démarrage local

```bash
npm install
cp .env.example .env.local
# Remplir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local
npm run dev
```

## Variables d'environnement

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Base de données

Exécuter `supabase/migrations/001_initial_schema.sql` dans le SQL Editor de votre projet Supabase.

## Déploiement Vercel

1. Importer le repo dans Vercel
2. Framework : Vite — Build : `npm run build` — Output : `dist`
3. Ajouter les variables d'environnement Supabase dans les settings Vercel
