import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, FileText, CheckCircle, Clock, Eye, Trash2, CheckSquare, AlertTriangle, AlertCircle, FolderOpen } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function FacturesList() {
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [selected, setSelected] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    loadFactures();
  }, []);

  async function loadFactures() {
    const data = await base44.entities.Facture.list();
    setFactures(data);
    setLoading(false);
  }

  async function handleDelete() {
    await base44.entities.Facture.delete(deleteId);
    setDeleteId(null);
    loadFactures();
  }

  async function handleBulkDelete() {
    await Promise.all(selected.map(id => base44.entities.Facture.delete(id)));
    setSelected([]);
    setBulkDeleting(false);
    loadFactures();
  }

  function toggleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleSelectAll() {
    setSelected(prev => prev.length === filtered.length ? [] : filtered.map(f => f.id));
  }

  async function toggleStatut(facture) {
    const newStatut = facture.statut === "Payé" ? "Non payé" : "Payé";
    await base44.entities.Facture.update(facture.id, { statut: newStatut });
    loadFactures();
  }

  const filtered = factures.filter(f =>
    f.nom_client.toLowerCase().includes(search.toLowerCase()) ||
    f.numero_facture.toLowerCase().includes(search.toLowerCase())
  );

  const formatGNF = (n) => new Intl.NumberFormat("fr-GN").format(n) + " GNF";

  function getEcheanceAlert(facture) {
    if (facture.statut === "Payé" || !facture.date_limite_paiement) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Parse dd/mm/yyyy or yyyy-mm-dd
    let parts = facture.date_limite_paiement.split("/");
    let due;
    if (parts.length === 3) {
      due = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    } else {
      due = new Date(facture.date_limite_paiement);
    }
    if (isNaN(due)) return null;
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { type: "overdue", days: Math.abs(diffDays) };
    if (diffDays <= 3) return { type: "soon", days: diffDays };
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">Factures</h1>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <Button size="sm" variant="destructive" className="gap-2 rounded-lg" onClick={() => setBulkDeleting(true)}>
              <Trash2 className="h-4 w-4" />
              Supprimer ({selected.length})
            </Button>
          )}
          <Link to="/factures/collective">
            <Button size="sm" variant="outline" className="gap-2 rounded-lg">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Retélécharger</span>
            </Button>
          </Link>
          <Link to="/factures/nouvelle">
            <Button size="sm" className="gap-2 rounded-lg">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouvelle</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une facture..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 rounded-xl bg-card"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">
            {search ? "Aucune facture trouvée" : "Aucune facture créée"}
          </p>
          {!search && (
            <Link to="/factures/nouvelle">
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Créer votre première facture
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-1 px-1"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              {selected.length === filtered.length ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          )}
          {filtered.map(facture => {
            const alert = getEcheanceAlert(facture);
            return (
            <div
              key={facture.id}
              onClick={() => toggleSelect(facture.id)}
              className={`bg-card rounded-xl border p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                selected.includes(facture.id)
                  ? "border-primary ring-1 ring-primary"
                  : alert?.type === "overdue"
                  ? "border-red-400 ring-1 ring-red-300"
                  : alert?.type === "soon"
                  ? "border-orange-400 ring-1 ring-orange-300"
                  : "border-border"
              }`}
            >
              {alert && (
                <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 mb-3 text-xs font-semibold ${
                  alert.type === "overdue"
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-orange-50 text-orange-700 border border-orange-200"
                }`}>
                  {alert.type === "overdue"
                    ? <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                  {alert.type === "overdue"
                    ? `Échéance dépassée depuis ${alert.days} jour(s)`
                    : alert.days === 0
                    ? "Échéance aujourd'hui !"
                    : `Échéance dans ${alert.days} jour(s)`}
                </div>
              )}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs font-mono text-muted-foreground">{facture.numero_facture}</span>
                  </div>
                  <h3 className="font-semibold text-foreground">{facture.nom_client}</h3>
                  <p className="text-sm text-muted-foreground">{facture.mois}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-sm font-bold text-primary">{formatGNF(facture.montant_total)}</span>
                    <button onClick={() => toggleStatut(facture)}>
                      <Badge
                        variant={facture.statut === "Payé" ? "default" : "destructive"}
                        className="cursor-pointer text-[10px] gap-1"
                      >
                        {facture.statut === "Payé" ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {facture.statut || "Non payé"}
                      </Badge>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <Link to={`/factures/${facture.id}`}>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-primary">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => setDeleteId(facture.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={bulkDeleting} onOpenChange={() => setBulkDeleting(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {selected.length} facture(s) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les {selected.length} factures sélectionnées seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
              Supprimer tout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette facture ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La facture sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}