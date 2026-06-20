import { useState, useEffect } from "react";
import { Plus, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const CATEGORIES = ["Salaires","Carburant / Transport","Matériel / Équipement","Produits d'entretien","Loyer / Locaux","Communication","Impôts / Taxes","Autre"];
const formatGNF = (n) => new Intl.NumberFormat("fr-FR").format(n || 0) + " GNF";

function getMoisActuel() {
  const d = new Date();
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).replace(/^\w/, c => c.toUpperCase());
}

export default function Depenses() {
  const [depenses, setDepenses] = useState([]);
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedMois, setSelectedMois] = useState(getMoisActuel());
  const [form, setForm] = useState({ libelle: "", categorie: "", montant: "", date_depense: new Date().toISOString().split("T")[0], mois: getMoisActuel(), notes: "" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [deps, facts] = await Promise.all([base44.entities.Depense.list("-date_depense"), base44.entities.Facture.list()]);
    setDepenses(deps); setFactures(facts); setLoading(false);
  }

  async function handleSubmit() {
    if (!form.libelle || !form.categorie || !form.montant) return;
    await base44.entities.Depense.create({ ...form, montant: parseFloat(form.montant) });
    setShowForm(false);
    setForm({ libelle: "", categorie: "", montant: "", date_depense: new Date().toISOString().split("T")[0], mois: getMoisActuel(), notes: "" });
    loadData();
  }

  async function handleDelete() {
    await base44.entities.Depense.delete(deleteId);
    setDeleteId(null); loadData();
  }

  const allMois = [...new Set([...depenses.map(d => d.mois), ...factures.map(f => f.mois)].filter(Boolean))].sort();
  const depensesMois = depenses.filter(d => d.mois === selectedMois);
  const facturesMois = factures.filter(f => f.mois === selectedMois);
  const totalDepenses = depensesMois.reduce((s, d) => s + (d.montant || 0), 0);
  const totalRecettes = facturesMois.filter(f => f.statut === "Payé").reduce((s, f) => s + (f.montant_total || 0), 0);
  const totalFacture = facturesMois.reduce((s, f) => s + (f.montant_total || 0), 0);
  const beneficeNet = totalRecettes - totalDepenses;
  const parCategorie = CATEGORIES.map(cat => ({ cat, total: depensesMois.filter(d => d.categorie === cat).reduce((s, d) => s + (d.montant || 0), 0) })).filter(x => x.total > 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">Dépenses</h1>
        <Button size="sm" className="gap-2 rounded-lg" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" />Ajouter</Button>
      </div>
      <div className="mb-5">
        <Select value={selectedMois} onValueChange={setSelectedMois}>
          <SelectTrigger className="w-52 rounded-xl"><SelectValue placeholder="Sélectionner un mois" /></SelectTrigger>
          <SelectContent>
            {allMois.length === 0 && <SelectItem value={getMoisActuel()}>{getMoisActuel()}</SelectItem>}
            {allMois.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <TrendingUp className="h-4 w-4 text-green-600 mx-auto mb-1" />
          <p className="text-[10px] text-green-700 font-medium uppercase tracking-wide">Recettes encaissées</p>
          <p className="text-sm font-bold text-green-800 mt-0.5">{formatGNF(totalRecettes)}</p>
          {totalFacture !== totalRecettes && <p className="text-[10px] text-green-600 mt-0.5">/ {formatGNF(totalFacture)} facturé</p>}
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <TrendingDown className="h-4 w-4 text-red-500 mx-auto mb-1" />
          <p className="text-[10px] text-red-700 font-medium uppercase tracking-wide">Dépenses</p>
          <p className="text-sm font-bold text-red-700 mt-0.5">{formatGNF(totalDepenses)}</p>
        </div>
        <div className={`rounded-xl p-3 text-center border ${beneficeNet >= 0 ? "bg-primary/10 border-primary/30" : "bg-orange-50 border-orange-200"}`}>
          <Wallet className={`h-4 w-4 mx-auto mb-1 ${beneficeNet >= 0 ? "text-primary" : "text-orange-500"}`} />
          <p className={`text-[10px] font-medium uppercase tracking-wide ${beneficeNet >= 0 ? "text-primary" : "text-orange-700"}`}>Bénéfice net</p>
          <p className={`text-sm font-bold mt-0.5 ${beneficeNet >= 0 ? "text-primary" : "text-orange-700"}`}>{formatGNF(beneficeNet)}</p>
        </div>
      </div>
      {parCategorie.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Répartition par catégorie</p>
          <div className="space-y-2">
            {parCategorie.map(({ cat, total }) => (
              <div key={cat} className="flex items-center justify-between"><span className="text-sm text-foreground">{cat}</span><span className="text-sm font-semibold text-destructive">{formatGNF(total)}</span></div>
            ))}
          </div>
        </div>
      )}
      {loading ? <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
        : depensesMois.length === 0 ? <p className="text-center text-muted-foreground py-10">Aucune dépense enregistrée pour ce mois.</p>
        : <div className="space-y-3">{depensesMois.map(dep => (
          <div key={dep.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">{dep.libelle}</p>
              <div className="flex items-center gap-2 mt-1"><Badge variant="outline" className="text-[10px]">{dep.categorie}</Badge><span className="text-xs text-muted-foreground">{dep.date_depense}</span></div>
              {dep.notes && <p className="text-xs text-muted-foreground mt-1 italic">{dep.notes}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-bold text-destructive text-sm">{formatGNF(dep.montant)}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(dep.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}</div>}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nouvelle dépense</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-sm font-medium text-foreground mb-1 block">Libellé *</label><Input placeholder="Ex: Achat carburant" value={form.libelle} onChange={e => setForm(p => ({ ...p, libelle: e.target.value }))} /></div>
            <div><label className="text-sm font-medium text-foreground mb-1 block">Catégorie *</label><Select value={form.categorie} onValueChange={v => setForm(p => ({ ...p, categorie: v }))}><SelectTrigger className="rounded-lg"><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="text-sm font-medium text-foreground mb-1 block">Montant (GNF) *</label><Input type="number" placeholder="0" value={form.montant} onChange={e => setForm(p => ({ ...p, montant: e.target.value }))} /></div>
            <div><label className="text-sm font-medium text-foreground mb-1 block">Date</label><Input type="date" value={form.date_depense} onChange={e => setForm(p => ({ ...p, date_depense: e.target.value }))} /></div>
            <div><label className="text-sm font-medium text-foreground mb-1 block">Mois</label><Input placeholder="Ex: Mai 2025" value={form.mois} onChange={e => setForm(p => ({ ...p, mois: e.target.value }))} /></div>
            <div><label className="text-sm font-medium text-foreground mb-1 block">Notes</label><Input placeholder="Optionnel" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button><Button onClick={handleSubmit} disabled={!form.libelle || !form.categorie || !form.montant}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer cette dépense ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
