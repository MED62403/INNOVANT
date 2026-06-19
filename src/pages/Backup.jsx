import { useState } from 'react';
import { Download, HardDrive, FileSpreadsheet, Users, Loader2, Shield } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { exportCSV } from '@/lib/exportCSV';
import { SUPERADMIN_EMAIL } from '@/lib/permissions';

const EXPORTS = [
  { key: 'clients',        label: 'Clients',        desc: 'Liste complète des clients',      entity: 'Client',             gradient: 'from-blue-500 to-blue-700',    icon: FileSpreadsheet },
  { key: 'interventions',  label: 'Interventions',  desc: 'Toutes les interventions',         entity: 'Intervention',       gradient: 'from-emerald-500 to-emerald-700', icon: FileSpreadsheet },
  { key: 'factures',       label: 'Factures',       desc: 'Historique des factures',          entity: 'Facture',            gradient: 'from-violet-500 to-violet-700', icon: FileSpreadsheet },
  { key: 'paiements',      label: 'Paiements',      desc: 'Tous les paiements',               entity: 'Paiement',           gradient: 'from-amber-500 to-amber-700',  icon: FileSpreadsheet },
  { key: 'depenses',       label: 'Dépenses',       desc: 'Historique des dépenses',          entity: 'Depense',            gradient: 'from-red-500 to-red-700',      icon: FileSpreadsheet },
  { key: 'stocks',         label: 'Stocks',         desc: 'État du stock',                    entity: 'Stock',              gradient: 'from-teal-500 to-teal-700',    icon: FileSpreadsheet },
  { key: 'personnel',      label: 'Personnel',      desc: 'Liste du personnel',               entity: 'Personnel',          gradient: 'from-indigo-500 to-indigo-700',icon: FileSpreadsheet },
  { key: 'devis',          label: 'Devis',          desc: 'Tous les devis',                   entity: 'Devis',              gradient: 'from-pink-500 to-pink-700',    icon: FileSpreadsheet },
  { key: 'users',          label: 'Utilisateurs',   desc: 'Liste des membres',                entity: 'User',               gradient: 'from-slate-500 to-slate-700',  icon: Users },
];

export default function Backup() {
  const [exporting, setExporting] = useState(null);

  async function handleExport(exp) {
    setExporting(exp.key);
    const data = await base44.entities[exp.entity].list();
    exportCSV(data, `sanya_${exp.key}_${new Date().toISOString().slice(0, 10)}.csv`);
    setExporting(null);
  }

  async function handleFullBackup() {
    setExporting('complet');
    try {
      const [clients, interventions, factures, paiements, depenses, stock, personnel, devis, users] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.Intervention.list(),
        base44.entities.Facture.list(),
        base44.entities.Paiement.list(),
        base44.entities.Depense.list(),
        base44.entities.Stock.list(),
        base44.entities.Personnel.list(),
        base44.entities.Devis.list(),
        base44.entities.User.list(),
      ]);
      const data = {
        metadata: { exported_at: new Date().toISOString(), app: 'SANYA SERVICE' },
        clients, interventions, factures, paiements, depenses, stock, personnel, devis, users,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sanya_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Erreur lors de l\'export : ' + e.message);
    }
    setExporting(null);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <Shield className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Sauvegarde</h1>
          <p className="text-xs text-muted-foreground">Espace réservé Super Administrateur</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#1a7a4a] to-[#15623b] rounded-2xl p-5 mb-6 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2"><HardDrive className="h-5 w-5" />Sauvegarde complète</h3>
            <p className="text-sm text-white/80 mt-1">Exporte toutes les données SANYA en un seul fichier JSON.</p>
          </div>
          <Button
            onClick={handleFullBackup}
            disabled={exporting === 'complet'}
            className="bg-white text-[#1a7a4a] hover:bg-white/90 rounded-xl shrink-0"
          >
            {exporting === 'complet' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting === 'complet' ? 'Export...' : 'Télécharger JSON'}
          </Button>
        </div>
      </div>

      <p className="text-sm font-semibold text-foreground mb-3">Exports individuels (CSV)</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {EXPORTS.map(exp => {
          const Icon = exp.icon;
          return (
            <div key={exp.key} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${exp.gradient} flex items-center justify-center shrink-0`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">{exp.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{exp.desc}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                disabled={exporting === exp.key}
                onClick={() => handleExport(exp)}
              >
                {exporting === exp.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
