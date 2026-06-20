import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const CATEGORIES = ["Ramassage des ordures", "Nettoyage", "Désinfection", "Entretien", "Inspection", "Autre"];
const formatGNF = n => new Intl.NumberFormat("fr-FR").format(n || 0) + " GNF";
const EMPTY = { nom: "", description: "", prix_unitaire: "", unite: "forfait", categorie: "" };

export default function ServiceBibliotheque() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const s = await base44.entities.ServiceBibliotheque.list();
    setServices(s);
    setLoading(false);
  }

  function openNew() { setEditId(null); setForm(EMPTY); setShowForm(true); }
  function openEdit(s) { setEditId(s.id); setForm({ nom: s.nom, description: s.description || "", prix_unitaire: s.prix_unitaire, unite: s.unite || "forfait", categorie: s.categorie || "" }); setShowForm(true); }

  async function handleSave() {
    if (!form.nom || !form.prix_unitaire) return;
    const data = { ...form, prix_unitaire: parseFloat(form.prix_unitaire) };
    if (editId) await base44.entities.ServiceBibliotheque.update(editId, data);
    else await base44.entities.ServiceBibliotheque.create(data);
    setShowForm(false);
    load();
  }

  async function handleDelete() {
    await base44.entities.ServiceBibliotheque.delete(deleteId);
    setDeleteId(null);
    load();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Bibliothèque de services</h1>
        <Button size="sm" className="gap-2 rounded-lg" onClick={openNew}><Plus className="h-4 w-4" /> Ajouter</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : services.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Aucun service configuré.</p>
          <Button className="mt-4 rounded-xl" onClick={openNew}>Créer le premier service</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map(s => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{s.nom}</span>
                  {s.categorie && <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{s.categorie}</span>}
                </div>
                {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                <p className="text-sm font-bold text-primary mt-1">{formatGNF(s.prix_unitaire)} / {s.unite}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editId ? "Modifier le service" : "Nouveau service"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-medium mb-1 block">Nom du service *</label><Input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} placeholder="Ex: Nettoyage standard" /></div>
            <div><label className="text-xs font-medium mb-1 block">Description</label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description courte" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs font-medium mb-1 block">Prix unitaire (GNF) *</label><Input type="number" value={form.prix_unitaire} onChange={e => setForm(p => ({ ...p, prix_unitaire: e.target.value }))} /></div>
              <div><label className="text-xs font-medium mb-1 block">Unité</label><Input value={form.unite} onChange={e => setForm(p => ({ ...p, unite: e.target.value }))} placeholder="forfait, h, m²..." /></div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Catégorie</label>
              <Select value={form.categorie} onValueChange={v => setForm(p => ({ ...p, categorie: v }))}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={!form.nom || !form.prix_unitaire}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer ce service ?</AlertDialogTitle><AlertDialogDescription>Il ne sera plus disponible dans la bibliothèque.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}