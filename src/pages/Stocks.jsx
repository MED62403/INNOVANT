import { useState, useEffect } from "react";
import { Plus, Trash2, Package, AlertTriangle, Pencil, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const UNITES = ["Litre", "Kg", "Unité", "Sac", "Bidon", "Carton"];

async function sendAlerteCritique(produit, newQte) {
  try {
    const me = await base44.auth.me();
    if (!me?.email) return;
    await base44.integrations.Core.SendEmail({
      to: me.email,
      from_name: "SANYA SERVICES — Alertes Stock",
      subject: `⚠️ Stock critique : ${produit.nom_produit}`,
      body: `Bonjour,\n\nCet email est une alerte automatique de SANYA SERVICES.\n\nLe stock du produit "${produit.nom_produit}" est passé sous le seuil critique défini.\n\n• Quantité actuelle : ${newQte} ${produit.unite}\n• Seuil d'alerte    : ${produit.seuil_critique} ${produit.unite}\n\nVeuillez procéder à un réapprovisionnement dès que possible.\n\nCordialement,\nSANYA SERVICES — Système d'alertes automatiques`,
    });
  } catch (e) {
    console.warn("Alerte email non envoyée", e);
  }
}
const EMPTY_FORM = { nom_produit: "", unite: "Unité", quantite: "", seuil_critique: "5", prix_unitaire: "", notes: "" };

const formatGNF = (n) => n ? new Intl.NumberFormat("fr-FR").format(n) + " GNF" : "—";

export default function Stocks() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mouvement, setMouvement] = useState({ id: null, type: null, valeur: "" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const data = await base44.entities.Stock.list();
    setStocks(data);
    setLoading(false);
  }

  function openCreate() {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(item) {
    setEditItem(item);
    setForm({
      nom_produit: item.nom_produit,
      unite: item.unite,
      quantite: String(item.quantite),
      seuil_critique: String(item.seuil_critique),
      prix_unitaire: item.prix_unitaire ? String(item.prix_unitaire) : "",
      notes: item.notes || "",
    });
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!form.nom_produit || form.quantite === "") return;
    const qte = parseFloat(form.quantite);
    const seuil = parseFloat(form.seuil_critique) || 0;
    const data = {
      ...form,
      quantite: qte,
      seuil_critique: seuil,
      prix_unitaire: form.prix_unitaire ? parseFloat(form.prix_unitaire) : undefined,
    };
    if (editItem) {
      await base44.entities.Stock.update(editItem.id, data);
      if (qte <= seuil && editItem.quantite > editItem.seuil_critique) {
        sendAlerteCritique({ ...editItem, ...data }, qte);
      }
    } else {
      await base44.entities.Stock.create(data);
      if (qte <= seuil) {
        sendAlerteCritique({ nom_produit: form.nom_produit, unite: form.unite, seuil_critique: seuil }, qte);
      }
    }
    setShowForm(false);
    loadData();
  }

  async function handleDelete() {
    await base44.entities.Stock.delete(deleteId);
    setDeleteId(null);
    loadData();
  }

  async function handleMouvement() {
    const val = parseFloat(mouvement.valeur);
    if (!val || val <= 0) return;
    const item = stocks.find(s => s.id === mouvement.id);
    const newQte = mouvement.type === "entree"
      ? item.quantite + val
      : Math.max(0, item.quantite - val);
    await base44.entities.Stock.update(mouvement.id, { quantite: newQte });
    if (mouvement.type === "sortie" && newQte <= item.seuil_critique && item.quantite > item.seuil_critique) {
      sendAlerteCritique(item, newQte);
    }
    setMouvement({ id: null, type: null, valeur: "" });
    loadData();
  }

  const critiques = stocks.filter(s => s.quantite <= s.seuil_critique);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">Stocks</h1>
        <Button size="sm" className="gap-2 rounded-lg" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Ajouter
        </Button>
      </div>

      {critiques.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-5 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-700">Stock critique</p>
            <p className="text-xs text-orange-600 mt-0.5">
              {critiques.map(s => s.nom_produit).join(", ")} — approvisionnement requis.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : stocks.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">Aucun produit enregistré.</p>
      ) : (
        <div className="space-y-3">
          {stocks.map(item => {
            const isCritique = item.quantite <= item.seuil_critique;
            return (
              <div key={item.id} className={`bg-card border rounded-xl p-4 shadow-sm ${isCritique ? "border-orange-300" : "border-border"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className={`h-4 w-4 shrink-0 ${isCritique ? "text-orange-500" : "text-primary"}`} />
                      <span className="font-semibold text-foreground">{item.nom_produit}</span>
                      {isCritique && (
                        <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600">Critique</Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground">
                      <span className={`font-bold text-lg ${isCritique ? "text-orange-600" : "text-primary"}`}>{item.quantite}</span>
                      <span className="text-muted-foreground ml-1">{item.unite}</span>
                      <span className="text-muted-foreground text-xs ml-2">(seuil : {item.seuil_critique})</span>
                    </p>
                    {item.prix_unitaire && (
                      <p className="text-xs text-muted-foreground mt-0.5">{formatGNF(item.prix_unitaire)} / {item.unite}</p>
                    )}
                    {mouvement.id === item.id ? (
                      <div className="flex items-center gap-2 mt-3">
                        <Input
                          type="number"
                          className="h-8 w-24 text-sm"
                          placeholder="Qté"
                          value={mouvement.valeur}
                          onChange={e => setMouvement(m => ({ ...m, valeur: e.target.value }))}
                        />
                        <Button size="sm" variant="outline" className="h-8 text-green-700 border-green-300 hover:bg-green-50"
                          onClick={() => setMouvement(m => ({ ...m, type: "entree" }))}>
                          + Entrée
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-red-700 border-red-300 hover:bg-red-50"
                          onClick={() => setMouvement(m => ({ ...m, type: "sortie" }))}>
                          − Sortie
                        </Button>
                        <Button size="sm" className="h-8" onClick={handleMouvement} disabled={!mouvement.valeur || !mouvement.type}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setMouvement({ id: null, type: null, valeur: "" })}>✕</Button>
                      </div>
                    ) : (
                      <button
                        className="text-xs text-primary underline mt-2"
                        onClick={() => setMouvement({ id: item.id, type: null, valeur: "" })}
                      >
                        Enregistrer mouvement
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editItem ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Nom du produit *</label>
              <Input placeholder="Ex: Eau de Javel" value={form.nom_produit} onChange={e => setForm(p => ({ ...p, nom_produit: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Unité</label>
                <Select value={form.unite} onValueChange={v => setForm(p => ({ ...p, unite: v }))}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Quantité *</label>
                <Input type="number" placeholder="0" value={form.quantite} onChange={e => setForm(p => ({ ...p, quantite: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Seuil d'alerte</label>
                <Input type="number" placeholder="5" value={form.seuil_critique} onChange={e => setForm(p => ({ ...p, seuil_critique: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Prix unitaire</label>
                <Input type="number" placeholder="GNF" value={form.prix_unitaire} onChange={e => setForm(p => ({ ...p, prix_unitaire: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Input placeholder="Optionnel" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={!form.nom_produit || form.quantite === ""}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}