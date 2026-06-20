export const ROLES = {
  SUPERADMIN: 'superAdmin',
  ADMIN: 'Admin',
  COORDINATEUR: 'Coordinateur',
};

export const SUPERADMIN_EMAIL = 'kouroumalayefgi00@gmail.com';

export const PERMISSIONS = {
  voir_clients:          [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.COORDINATEUR],
  creer_client:          [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.COORDINATEUR],
  modifier_client:       [ROLES.SUPERADMIN, ROLES.ADMIN],
  voir_interventions:    [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.COORDINATEUR],
  creer_intervention:    [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.COORDINATEUR],
  valider_intervention:  [ROLES.SUPERADMIN, ROLES.ADMIN],
  voir_factures:         [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.COORDINATEUR],
  creer_facture:         [ROLES.SUPERADMIN, ROLES.ADMIN],
  encaisser_paiement:    [ROLES.SUPERADMIN, ROLES.ADMIN],
  voir_depenses:         [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.COORDINATEUR],
  creer_depense:         [ROLES.SUPERADMIN, ROLES.ADMIN],
  voir_stock:            [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.COORDINATEUR],
  gerer_stock:           [ROLES.SUPERADMIN, ROLES.ADMIN],
  voir_personnel:        [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.COORDINATEUR],
  gerer_personnel:       [ROLES.SUPERADMIN, ROLES.ADMIN],
  voir_rapports:         [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.COORDINATEUR],
  exporter:              [ROLES.SUPERADMIN, ROLES.ADMIN],
  gerer_utilisateurs:    [ROLES.SUPERADMIN, ROLES.ADMIN],
};

export function normalizeRole(role) {
  if (!role || role === 'user') return 'Coordinateur';
  return role;
}

export function isSuperAdmin(email) {
  return email === SUPERADMIN_EMAIL;
}

export function hasPermission(userRole, permission, customPermissions = null) {
  const role = normalizeRole(userRole);
  if (role === ROLES.SUPERADMIN) return true;
  if (customPermissions && typeof customPermissions[permission] === 'boolean') {
    return customPermissions[permission];
  }
  const roles = PERMISSIONS[permission];
  if (!roles) return false;
  return roles.includes(role);
}

export function getEffectivePermissions(userRole, customPermissions = {}) {
  const role = normalizeRole(userRole);
  const result = {};
  Object.keys(PERMISSIONS).forEach(perm => {
    if (typeof customPermissions[perm] === 'boolean') {
      result[perm] = customPermissions[perm];
    } else {
      result[perm] = PERMISSIONS[perm].includes(role);
    }
  });
  return result;
}

export const PERMISSION_LABELS = {
  voir_clients:         'Voir les clients',
  creer_client:         'Créer un client',
  modifier_client:      'Modifier un client',
  voir_interventions:   'Voir les interventions',
  creer_intervention:   'Créer une intervention',
  valider_intervention: 'Valider une intervention',
  voir_factures:        'Voir les factures',
  creer_facture:        'Créer une facture',
  encaisser_paiement:   'Encaisser un paiement',
  voir_depenses:        'Voir les dépenses',
  creer_depense:        'Créer une dépense',
  voir_stock:           'Voir le stock',
  gerer_stock:          'Gérer le stock',
  voir_personnel:       'Voir le personnel',
  gerer_personnel:      'Gérer le personnel',
  voir_rapports:        'Voir les rapports',
  exporter:             'Exporter les données',
  gerer_utilisateurs:   'Gérer les utilisateurs',
};

export const PERM_GROUPS = [
  { label: 'Clients',        color: 'blue',   perms: ['voir_clients', 'creer_client', 'modifier_client'] },
  { label: 'Interventions',  color: 'green',  perms: ['voir_interventions', 'creer_intervention', 'valider_intervention'] },
  { label: 'Facturation',    color: 'amber',  perms: ['voir_factures', 'creer_facture', 'encaisser_paiement'] },
  { label: 'Dépenses',       color: 'orange', perms: ['voir_depenses', 'creer_depense'] },
  { label: 'Stock',          color: 'cyan',   perms: ['voir_stock', 'gerer_stock'] },
  { label: 'Personnel',      color: 'purple', perms: ['voir_personnel', 'gerer_personnel'] },
  { label: 'Rapports',       color: 'yellow', perms: ['voir_rapports', 'exporter'] },
  { label: 'Administration', color: 'red',    perms: ['gerer_utilisateurs'] },
];

export function getRoleLabel(role) {
  const labels = {
    superAdmin:   'Super Administrateur',
    Admin:        'Administrateur',
    Coordinateur: 'Coordinateur',
    user:         'Coordinateur',
  };
  return labels[role] || role;
}
