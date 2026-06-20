-- ============================================================
-- SANYA SERVICES — Migration initiale
-- ============================================================

-- ── Profils utilisateurs (extension de auth.users) ────────
create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  full_name          text,
  role               text not null default 'Coordinateur'
                       check (role in ('superAdmin', 'Admin', 'Coordinateur')),
  permissions_custom jsonb not null default '{}',
  is_active          boolean not null default true,
  is_online          boolean not null default false,
  last_seen          timestamptz,
  created_at         timestamptz not null default now()
);

-- Créer le profil automatiquement à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'Coordinateur')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Clients ───────────────────────────────────────────────
create table if not exists public.clients (
  id                         uuid primary key default gen_random_uuid(),
  nom                        text not null,
  adresse                    text not null,
  telephone                  text,
  email                      text,
  type_service               text not null
                               check (type_service in (
                                 'Ramassage des ordures (poubelle)',
                                 'Nettoyage', 'Désinfection', 'Autre'
                               )),
  nombre_poubelles           integer default 1,
  prix_service               numeric not null default 0,
  jours_collecte             text[] default '{}',
  frequence_nettoyage_semaine integer default 1,
  nb_agents_nettoyage        integer default 1,
  produits_nettoyage         text[] default '{}',
  created_at                 timestamptz not null default now()
);

-- ── Factures ──────────────────────────────────────────────
create table if not exists public.factures (
  id                  uuid primary key default gen_random_uuid(),
  numero_facture      text not null,
  client_id           uuid references public.clients(id) on delete set null,
  nom_client          text not null,
  adresse_client      text,
  mois                text,
  date_facturation    date,
  periode_service     text,
  description_service text not null,
  quantite            numeric default 1,
  prix_unitaire       numeric not null default 0,
  montant_total       numeric not null default 0,
  date_limite_paiement date,
  statut              text not null default 'Non payé'
                        check (statut in ('Non payé', 'Payé')),
  created_at          timestamptz not null default now()
);

-- ── Paiements ─────────────────────────────────────────────
create table if not exists public.paiements (
  id             uuid primary key default gen_random_uuid(),
  facture_id     uuid references public.factures(id) on delete cascade,
  numero_facture text not null,
  nom_client     text not null,
  montant_verse  numeric not null default 0,
  date_paiement  date not null,
  mode_paiement  text not null default 'Espèces'
                   check (mode_paiement in (
                     'Espèces', 'Mobile Money',
                     'Virement bancaire', 'Chèque', 'Autre'
                   )),
  numero_recu    text,
  notes          text,
  created_at     timestamptz not null default now()
);

-- ── Devis ────────────────────────────────────────────────
create table if not exists public.devis (
  id               uuid primary key default gen_random_uuid(),
  numero_devis     text not null,
  client_id        uuid references public.clients(id) on delete set null,
  nom_client       text not null,
  adresse_client   text,
  email_client     text,
  telephone_client text,
  date_devis       date,
  date_validite    date,
  lignes           jsonb not null default '[]',
  montant_total    numeric not null default 0,
  notes            text,
  statut           text not null default 'Brouillon'
                     check (statut in (
                       'Brouillon', 'Envoyé', 'Accepté', 'Refusé', 'Converti'
                     )),
  facture_id       uuid references public.factures(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- ── Dépenses ──────────────────────────────────────────────
create table if not exists public.depenses (
  id           uuid primary key default gen_random_uuid(),
  libelle      text not null,
  categorie    text not null
                 check (categorie in (
                   'Salaires', 'Carburant / Transport',
                   'Matériel / Équipement', 'Produits d''entretien',
                   'Loyer / Locaux', 'Communication',
                   'Impôts / Taxes', 'Autre'
                 )),
  montant      numeric not null default 0,
  date_depense date not null,
  mois         text not null,
  notes        text,
  created_at   timestamptz not null default now()
);

-- ── Stocks ────────────────────────────────────────────────
create table if not exists public.stocks (
  id            uuid primary key default gen_random_uuid(),
  nom_produit   text not null,
  unite         text not null default 'Unité'
                  check (unite in ('Litre','Kg','Unité','Sac','Bidon','Carton')),
  quantite      numeric not null default 0,
  seuil_critique numeric not null default 5,
  prix_unitaire numeric default 0,
  notes         text,
  created_at    timestamptz not null default now()
);

-- ── Personnel ──────────────────────────────────────────────
create table if not exists public.personnel (
  id                uuid primary key default gen_random_uuid(),
  nom               text not null,
  poste             text not null,
  telephone         text,
  type_remuneration text not null default 'Forfait mensuel'
                      check (type_remuneration in (
                        'Taux horaire', 'Forfait mensuel', 'Par mission'
                      )),
  taux_horaire      numeric,
  salaire_forfait   numeric,
  taux_mission      numeric,
  date_embauche     date,
  notes             text,
  created_at        timestamptz not null default now()
);

-- ── Présences ─────────────────────────────────────────────
create table if not exists public.presences (
  id               uuid primary key default gen_random_uuid(),
  personnel_id     uuid references public.personnel(id) on delete cascade,
  nom_personnel    text not null,
  mois             text not null,
  date             date not null,
  type_jour        text not null default 'Présence'
                     check (type_jour in (
                       'Présence', 'Congé', 'Absence', 'Mission'
                     )),
  heures_travaillees numeric,
  nb_missions      integer default 1,
  notes            text,
  created_at       timestamptz not null default now()
);

-- ── Interventions ───────────────────────────────────────────
create table if not exists public.interventions (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid references public.clients(id) on delete set null,
  nom_client        text not null,
  type_intervention text not null
                      check (type_intervention in (
                        'Ramassage des ordures', 'Nettoyage',
                        'Désinfection', 'Entretien', 'Inspection', 'Autre'
                      )),
  date              date not null,
  jour_semaine      text,
  description       text,
  statut            text not null default 'Réalisée'
                      check (statut in ('Planifiée', 'Réalisée', 'Annulée')),
  technicien        text,
  agents_presents   text[] default '{}',
  produits_utilises text,
  note_satisfaction integer check (note_satisfaction between 1 and 5),
  created_at        timestamptz not null default now()
);

-- ── Bibliothèque de services ──────────────────────────────
create table if not exists public.services_bibliotheque (
  id            uuid primary key default gen_random_uuid(),
  nom           text not null,
  description   text,
  prix_unitaire numeric not null default 0,
  unite         text not null default 'forfait',
  categorie     text
                  check (categorie in (
                    'Ramassage des ordures', 'Nettoyage',
                    'Désinfection', 'Entretien', 'Inspection', 'Autre'
                  )),
  created_at    timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles               enable row level security;
alter table public.clients                enable row level security;
alter table public.factures               enable row level security;
alter table public.paiements              enable row level security;
alter table public.devis                  enable row level security;
alter table public.depenses               enable row level security;
alter table public.stocks                 enable row level security;
alter table public.personnel              enable row level security;
alter table public.presences              enable row level security;
alter table public.interventions          enable row level security;
alter table public.services_bibliotheque  enable row level security;

-- profiles : chaque utilisateur voit/modifie son propre profil
create policy "Voir son propre profil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Modifier son propre profil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins voient tous les profils"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('superAdmin', 'Admin')
    )
  );

create policy "Admins modifient tous les profils"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('superAdmin', 'Admin')
    )
  );

-- Toutes les autres tables : accès complet aux utilisateurs authentifiés
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'clients','factures','paiements','devis','depenses',
    'stocks','personnel','presences','interventions','services_bibliotheque'
  ]
  loop
    execute format(
      'create policy "Accès authentifié - %1$s" on public.%1$s
       for all using (auth.role() = ''authenticated'')', tbl
    );
  end loop;
end;
$$;

-- ============================================================
-- Index utiles pour les performances
-- ============================================================
create index if not exists idx_factures_client_id    on public.factures(client_id);
create index if not exists idx_factures_statut        on public.factures(statut);
create index if not exists idx_factures_mois          on public.factures(mois);
create index if not exists idx_paiements_facture_id   on public.paiements(facture_id);
create index if not exists idx_presences_personnel_id on public.presences(personnel_id);
create index if not exists idx_presences_mois         on public.presences(mois);
create index if not exists idx_interventions_client_id on public.interventions(client_id);
create index if not exists idx_depenses_mois          on public.depenses(mois);
