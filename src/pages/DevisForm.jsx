import { useState, useEffect } from "react";
import { Plus, Trash2, BookOpen, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const formatGNF = n => new Intl.NumberFormat("fr-FR").format(n || 0) + " GNF";
const EMPTY_LINE = { description: "", quantite: 1, prix_unitaire: 0, total: 0 };

export default function DevisForm() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [showBiblio, setShowBiblio] = useState(false);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const validite = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
  const [form, setForm] = useState({ client_id: "", nom_client: "", adresse_client: "", email_client: "", telephone_client: "", date_devis: today, date_validite: validite, notes: "Validité du devis : 30 jours. Paiement à réception de facture.", statut: "Brouillon", lignes: [{ ...EMPTY_LINE }] });

  useEffect(() => {
    async function load() {
      const [cls, svcs] = await Promise.all([base44.entities.Client.list(), base44.entities.ServiceBibliotheque.list()]);
      setClients(cls); setServices(svcs);
    }
    load();
  }, []);

  function selectClient(clientId) {
    const c = clients.find(c => c.id === clientId);
    if (!c) return;
    setForm(p => ({ ...p, client_id: c.id, nom_client: c.nom, adresse_client: c.adresse || "", email_client: c.email || "", telephone_client: c.telephone || "" }));
  }

  function updateLine(idx, field, value) {
    setForm(p => {
      const lignes = [...p.lignes];
      lignes[idx] = { ...lignes[idx], [field]: value };
      if (field === "quantite" || field === "prix_unitaire") lignes[idx].total = (parseFloat(lignes[idx].quantite) || 0) * (parseFloat(lignes[idx].prix_unitaire) || 0);
      return { ...p, lignes };
    });
  }

  function addLine() { setForm(p => ({ ...p, lignes: [...p.lignes, { ...EMPTY_LINE }] })); }
  function removeLine(idx) { setForm(p => ({ ...p, lignes: p.lignes.filter((_, i) => i !== idx) })); }
  function addFromBiblio(svc) {
    const ligne = { description: svc.nom + (svc.description ? ` — ${svc.description}` : ""), quantite: 1, prix_unitaire: svc.prix_unitaire, total: svc.prix_unitaire };
    setForm(p => ({ ...p, lignes: [...p.lignes.filter(l => l.description || l.prix_unitaire), ligne] }));
    setShowBiblio(false);
  }

  const total = form.lignes.reduce((s, l) => s + (parseFloat(l.total) || 0), 0);

  async function handleSave() {
    if (!form.nom_client) return;
    setSaving(true);
    const count = await base44.entities.Devis.list();
    const num = `DEV-${String(count.length + 1).padStart(4, "0")}`;
    await base44.entities.Devis.create({ ...form, numero_devis: num, montant_total: total });
    navigate("/devis");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/devis")}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-xl font-bold">Nouveau devis</h1>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
        <p className="text-sm font-semibold">Client</p>
        <Select onValueChange={selectClient}>
          <SelectTrigger className="rounded-lg"><SelectValue placeholder="Sélectionner un client existant" /></SelectTrigger>
          <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}</SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-xs text-muted-foreground">Nom *</label><Input value={form.nom_client} onChange={e => setForm(p => ({ ...p, nom_client: e.target.value }))} placeholder="Nom client" /></div>
          <div><label className="text-xs text-muted-foreground">Adresse</label><Input value={form.adresse_client} onChange={e => setForm(p => ({ ...p, adresse_client: e.target.value }))} placeholder="Adresse" /></div>
          <div><label className="text-xs text-muted-foreground">Email</label><Input value={form.email_client} onChange={e => setForm(p => ({ ...p, email_client: e.target.value }))} placeholder="email@..." /></div>
          <div><label className="text-xs text-muted-foreground">Téléphone</label><Input value={form.telephone_client} onChange={e => setForm(p => ({ ...p, telephone_client: e.target.value }))} placeholder="+224..." /></div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <p className="text-sm font-semibold mb-3">Dates</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-muted-foreground">Date du devis</label><Input type="date" value={form.date_devis} onChange={e => setForm(p => ({ ...p, date_devis: e.target.value }))} /></div>
          <div><label className="text-xs text-muted-foreground">Valide jusqu'au</label><Input type="date" value={form.date_validite} onChange={e => setForm(p => ({ ...p, date_validite: e.target.value }))} /></div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Prestations</p>
          <Button variant="outline" size="sm" className="gap-1 rounded-lg" onClick={() => setShowBiblio(true)}><BookOpen className="h-3.5 w-3.5" /> Bibliothèque</Button>
        </div>
        <div className="space-y-2">
          {form.lignes.map((ligne, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
              <div className="col-span-5"><Input placeholder="Description" value={ligne.description} onChange={e => updateLine(idx, "description", e.target.value)} className="text-xs" /></div>
              <div className="col-span-2"><Input type="number" placeholder="Qté" value={ligne.quantite} onChange={e => updateLine(idx, "quantite", e.target.value)} className="text-xs" /></div>
              <div className="col-span-3"><Input type="number" placeholder="Prix" value={ligne.prix_unitaire} onChange={e => updateLine(idx, "prix_unitaire", e.target.value)} className="text-xs" /></div>
              <div className="col-span-1 text-xs text-right font-medium text-primary">{(ligne.total || 0).toLocaleString("fr-FR")}</div>
              <div className="col-span-1">{form.lignes.length > 1 && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeLine(idx)}><Trash2 className="h-3 w-3" /></Button>}</div>
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mt-2 gap-1 text-primary" onClick={addLine}><Plus className="h-3.5 w-3.5" /> Ajouter une ligne</Button>
        <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
          <span className="text-sm font-semibold">Total</span>
          <span className="text-lg font-bold text-primary">{formatGNF(total)}</span>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <p className="text-sm font-semibold mb-2">Notes / Conditions</p>
        <textarea className="w-full text-sm border border-input rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring" rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
      </div>
      <Button className="w-full rounded-xl" onClick={handleSave} disabled={saving || !form.nom_client}>{saving ? "Enregistrement..." : "Enregistrer le devis"}</Button>
      <Dialog open={showBiblio} onOpenChange={setShowBiblio}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Bibliothèque de services</DialogTitle></DialogHeader>
          {services.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm"><p>Aucun service configuré.</p><p className="text-xs mt-1">Ajoutez des services dans le module Bibliothèque.</p></div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {services.map(svc => (
                <button key={svc.id} className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent transition-colors" onClick={() => addFromBiblio(svc)}>
                  <div className="flex justify-between items-center"><span className="text-sm font-medium">{svc.nom}</span><span className="text-xs font-bold text-primary">{formatGNF(svc.prix_unitaire)}</span></div>
                  {svc.description && <p className="text-xs text-muted-foreground mt-0.5">{svc.description}</p>}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
