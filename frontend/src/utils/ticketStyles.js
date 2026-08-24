export const STATUT_LABELS = {
  OUVERT: 'Ouvert',
  EN_COURS: 'En cours',
  RESOLU: 'Résolu',
  FERME: 'Fermé',
};

export const PRIORITE_LABELS = {
  BASSE: 'Faible',
  MOYENNE: 'Moyenne',
  HAUTE: 'Haute',
};

export const STATUT_STYLES = {
  OUVERT: 'bg-blue-50 text-blue-600 border border-blue-100',
  EN_COURS: 'bg-amber-50 text-amber-600 border border-amber-100',
  RESOLU: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  FERME: 'bg-slate-100 text-slate-500 border border-slate-200',
};

export const PRIORITE_STYLES = {
  BASSE: 'bg-emerald-50 text-emerald-600',
  MOYENNE: 'bg-orange-50 text-orange-600',
  HAUTE: 'bg-red-50 text-red-600',
};

export const PRIORITE_DOT = {
  BASSE: '#31a66b',
  MOYENNE: '#f59e0b',
  HAUTE: '#ef4444',
};

export const CATEGORIE_COLORS = ['#ef4444', '#f59e0b', '#31a66b', '#8b5cf6', '#3b82f6', '#ec4899'];

export function statutLabel(s) {
  return STATUT_LABELS[s] || s;
}

export function prioriteLabel(p) {
  return PRIORITE_LABELS[p] || p;
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
