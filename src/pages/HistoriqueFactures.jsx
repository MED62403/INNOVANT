import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Eye, CheckCircle, Clock, Filter, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default function HistoriqueFactures() {
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMois, setFilterMois] = useState("tous");
  const [filterStatut, setFilterStatut] = useState("tous");

  useEffect(() => {
    base44.entities.Facture.list().then(data => {
      setFactures(data);
      setLoading(false);
    });
  }, []);

  async function toggleStatut(facture) {
    const newStatut = facture.statut === "Payé" ? "Non payé" : "Payé";
    await base44.entities.Facture.update(facture.id, { statut: newStatut });
    setFactures(prev => prev.map(f => f.id === facture.id ? { ...f, statut: newStatut } : f));
  }

  // Extract unique months from factures
  const moisDisponibles = [...new Set(factures.map(f => f.mois).filter(Boolean))];

  const filtered = factures.filter(f => {
    const moisOk = filterMois === "tous" || f.mois === filterMois;
    const statutOk = filterStatut === "tous" || f.statut === filterStatut || (!f.statut && filterStatut === "Non payé");
    return moisOk && statutOk;
  });

  const totalPayé = filtered.filter(f => f.statut === "Payé").reduce((s, f) => s + (f.montant_total || 0), 0);
  const totalNonPayé = filtered.filter(f => f.statut !== "Payé").reduce((s, f) => s + (f.montant_total || 0), 0);
  const formatGNF = n => new Intl.NumberFormat("fr-FR").format(n) + " GNF";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-foreground mb-6">Historique des factures</h1>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select value={filterMois} onValueChange={setFilterMois}>
          <SelectTrigger className="w-40 rounded-xl h-9 text-sm">
            <SelectValue placeholder="Tous les mois" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les mois</SelectItem>
            {moisDisponibles.map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-36 rounded-xl h-9 text-sm">
            <SelectValue placeholder="Tous" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous</SelectItem>
            <SelectItem value="Payé">Payé</SelectItem>
            <SelectItem value="Non payé">Non payé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-widest text-green-600 font-semibold mb-1">Encaissé</p>
            <p className="text-sm font-bold text-green-700">{formatGNF(totalPayé)}</p>
            <p className="text-[10px] text-green-600">{filtered.filter(f => f.statut === "Payé").length} facture(s)</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-widest text-red-500 font-semibold mb-1">En attente</p>
            <p className="text-sm font-bold text-red-600">{formatGNF(totalNonPayé)}</p>
            <p className="text-[10px] text-red-500">{filtered.filter(f => f.statut !== "Payé").length} facture(s)</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          Aucune facture pour ce filtre.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(facture => (
            <div key={facture.id} className="bg-card rounded-xl border border-border px-4 py-3 flex items-center gap-3 shadow-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground">{facture.numero_facture}</span>
                  <span className="text-[10px] text-muted-foreground">•</span>
                  <span className="text-[11px] text-muted-foreground">{facture.mois}</span>
                </div>
                <p className="font-semibold text-sm text-foreground truncate">{facture.nom_client}</p>
                <p className="text-xs text-muted-foreground truncate">{facture.adresse_client}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-sm font-bold text-primary">{formatGNF(facture.montant_total)}</span>
                <button onClick={() => toggleStatut(facture)}>
                  <Badge
                    variant={facture.statut === "Payé" ? "default" : "destructive"}
                    className="cursor-pointer text-[10px] gap-1"
                  >
                    {facture.statut === "Payé"
                      ? <CheckCircle className="h-2.5 w-2.5" />
                      : <Clock className="h-2.5 w-2.5" />}
                    {facture.statut || "Non payé"}
                  </Badge>
                </button>
              </div>
              <Link to={`/factures/${facture.id}/paiements`}>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 shrink-0" title="Suivi paiements">
                  <Wallet className="h-4 w-4" />
                </Button>
              </Link>
              <Link to={`/factures/${facture.id}`}>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary shrink-0">
                  <Eye className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}