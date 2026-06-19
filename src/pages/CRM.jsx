import { useState, useEffect } from "react";
import { Search, Plus, Trash2, Pencil, ChevronRight, Phone, Mail, MapPin, Star, Calendar, ClipboardList, Truck, Brush, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import PlanningCollecte from "@/components/crm/PlanningCollecte";
import PlanningNettoyage from "@/components/crm/PlanningNettoyage";

const TYPE_INTERVENTION = ["Ramassage des ordures","Nettoyage","Désinfection","Entretien","Inspection","Autre"];
const STATUTS = ["Planifiée","Réalisée","Annulée"];
const STATUT_COLOR = { "Réalisée": "bg-green-100 text-green-700", "Planifiée": "bg-blue-100 text-blue-700", "Annulée": "bg-red-100 text-red-700" };
const EMPTY_INT = { type_intervention: "", date: new Date().toISOString().split("T")[0], description: "", statut: "Réalisée", technicien: "", note_satisfaction: "" };
const TABS = [{ id: "collecte", label: "Collecte", icon: Truck }, { id: "nettoyage", label: "Nettoyage", icon: Brush }, { id: "clients", label: "Clients", icon: Users }];

export default function CRM() {
  const [clients, setClients] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("collecte");
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [showIntForm, setShowIntForm] = useState(false);
  const [editInt, setEditInt] = useState(null);
  const [intForm, setIntForm] = useState(EMPTY_INT);
  const [deleteIntId, setDeleteIntId] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [cls, ints] = await Promise.all([base44.entities.Client.list(), base44.entities.Intervention.list("-date")]);
    setClients(cls); setInterventions(ints); setLoading(false);
  }

  function openAddInt() { setEditInt(null); setIntForm(EMPTY_INT); setShowIntForm(true); }
  function openEditInt(i) { setEditInt(i); setIntForm({ type_intervention: i.type_intervention, date: i.date, description: i.description || "", statut: i.statut, technicien: i.technicien || "", note_satisfaction: i.note_satisfaction || "" }); setShowIntForm(true); }

  async function handleSaveInt() {
    if (!intForm.type_intervention || !intForm.date) return;
    const data = { ...intForm, note_satisfaction: intForm.note_satisfaction ? parseFloat(intForm.note_satisfaction) : undefined };
    if (editInt) { await base44.entities.Intervention.update(editInt.id, data); }
    else { await base44.entities.Intervention.create({ ...data, client_id: selectedClient.id, nom_client: selectedClient.nom }); }
    setShowIntForm(false); loadData();
  }

  async function handleDeleteInt() { await base44.entities.Intervention.delete(deleteIntId); setDeleteIntId(null); loadData(); }

  const filteredClients = clients.filter(c => c.nom.toLowerCase().includes(search.toLowerCase()) || (c.adresse || "").toLowerCase().includes(search.toLowerCase()));

  if (selectedClient) {
    const clientInts = interventions.filter(i => i.client_id === selectedClient.id);
    const derniereInt = clientInts[0];
    const avgNote = clientInts.filter(i => i.note_satisfaction).length ? (clientInts.reduce((s, i) => s + (i.note_satisfaction || 0), 0) / clientInts.filter(i => i.note_satisfaction).length).toFixed(1) : null;
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => setSelectedClient(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">← Retour au CRM</button>
        <div className="bg-card border border-border rounded-xl p-4 mb-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div><h2 className="text-lg font-bold text-foreground">{selectedClient.nom}</h2><Badge variant="outline" className="text-[10px] mt-1">{selectedClient.type_service}</Badge></div>
            {avgNote && <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-lg px-2 py-1"><Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-400" /><span className="text-xs font-bold text-yellow-700">{avgNote}/5</span></div>}
          </div>
          <div className="space-y-1.5">
            {selectedClient.adresse && <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" />{selectedClient.adresse}</div>}
            {selectedClient.telephone && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5 shrink-0" />{selectedClient.telephone}</div>}
            {selectedClient.email && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5 shrink-0" />{selectedClient.email}</div>}
          </div>
          {selectedClient.jours_collecte?.length > 0 && <div className="mt-3 pt-3 border-t border-border"><p className="text-[10px] text-muted-foreground font-semibold uppercase mb-1">Jours de collecte</p><div className="flex flex-wrap gap-1">{selectedClient.jours_collecte.map(j => <span key={j} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{j}</span>)}</div></div>}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border">
            <div className="text-center"><p className="text-xl font-bold text-primary">{clientInts.length}</p><p className="text-[10px] text-muted-foreground">Interventions</p></div>
            <div className="text-center"><p className="text-xl font-bold text-green-600">{clientInts.filter(i => i.statut === "Réalisée").length}</p><p className="text-[10px] text-muted-foreground">Réalisées</p></div>
            <div className="text-center"><p className="text-xs font-semibold text-foreground">{derniereInt?.date || "—"}</p><p className="text-[10px] text-muted-foreground">Dernière visite</p></div>
          </div>
        </div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Historique des interventions</p>
          <Button size="sm" className="gap-1 rounded-lg" onClick={openAddInt}><Plus className="h-3.5 w-3.5" />Ajouter</Button>
        </div>
        {clientInts.length === 0 ? <p className="text-center text-muted-foreground py-8">Aucune intervention enregistrée.</p> : (
          <div className="space-y-3">
            {clientInts.map(int => (
              <div key={int.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUT_COLOR[int.statut]}`}>{int.statut}</span><span className="text-xs font-semibold">{int.type_intervention}</span></div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1"><Calendar className="h-3 w-3" />{int.date}{int.technicien && <span className="ml-2">· 👷 {int.technicien}</span>}</div>
                    {int.description && <p className="text-sm text-muted-foreground italic mt-0.5">{int.description}</p>}
                    {int.note_satisfaction && <div className="flex items-center gap-0.5 mt-1">{[1,2,3,4,5].map(n => <Star key={n} className={`h-3 w-3 ${n <= int.note_satisfaction ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`} />)}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditInt(int)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteIntId(int.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Dialog open={showIntForm} onOpenChange={setShowIntForm}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>{editInt ? "Modifier" : "Nouvelle intervention"}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div><label className="text-sm font-medium mb-1 block">Type *</label><Select value={intForm.type_intervention} onValueChange={v => setIntForm(p => ({ ...p, type_intervention: v }))}><SelectTrigger className="rounded-lg"><SelectValue placeholder="Choisir" /></SelectTrigger><SelectContent>{TYPE_INTERVENTION.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-sm font-medium mb-1 block">Date *</label><Input type="date" value={intForm.date} onChange={e => setIntForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1 block">Statut</label><Select value={intForm.statut} onValueChange={v => setIntForm(p => ({ ...p, statut: v }))}><SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger><SelectContent>{STATUTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-sm font-medium mb-1 block">Agent responsable</label><Input placeholder="Ex: Mamadou" value={intForm.technicien} onChange={e => setIntForm(p => ({ ...p, technicien: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1 block">Description</label><Input placeholder="Observations..." value={intForm.description} onChange={e => setIntForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div><label className="text-sm font-medium mb-1 block">Note satisfaction</label><div className="flex gap-2">{[1,2,3,4,5].map(n => <button key={n} type="button" onClick={() => setIntForm(p => ({ ...p, note_satisfaction: p.note_satisfaction === n ? "" : n }))} className={`h-9 w-9 rounded-full border-2 text-sm font-bold transition-all ${intForm.note_satisfaction >= n ? "border-yellow-400 bg-yellow-100 text-yellow-700" : "border-border text-muted-foreground"}`}>{n}</button>)}</div></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowIntForm(false)}>Annuler</Button><Button onClick={handleSaveInt} disabled={!intForm.type_intervention || !intForm.date}>Enregistrer</Button></DialogFooter>
          </DialogContent>
        </Dialog>
        <AlertDialog open={!!deleteIntId} onOpenChange={() => setDeleteIntId(null)}>
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Supprimer cette intervention ?</AlertDialogTitle><AlertDialogDescription>Action irréversible.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDeleteInt} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-foreground mb-1">CRM Opérationnel</h1>
      <p className="text-sm text-muted-foreground mb-5">{clients.length} client(s) · {interventions.filter(i => i.date === new Date().toISOString().split("T")[0]).length} intervention(s) aujourd'hui</p>
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div> : (
        <>
          {activeTab === "collecte" && <PlanningCollecte clients={clients.filter(c => c.type_service === "Ramassage des ordures (poubelle)")} interventions={interventions} onRefresh={loadData} />}
          {activeTab === "nettoyage" && <PlanningNettoyage clients={clients} interventions={interventions} onRefresh={loadData} />}
          {activeTab === "clients" && (
            <>
              <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Rechercher un client..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl bg-card" /></div>
              {filteredClients.length === 0 ? <p className="text-center text-muted-foreground py-10">Aucun client trouvé.</p> : (
                <div className="space-y-3">
                  {filteredClients.map(client => {
                    const clientInts = interventions.filter(i => i.client_id === client.id);
                    const derniere = clientInts[0];
                    return (
                      <button key={client.id} className="w-full text-left bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all" onClick={() => setSelectedClient(client)}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1"><span className="font-semibold text-foreground">{client.nom}</span><Badge variant="outline" className="text-[10px] hidden sm:inline-flex">{client.type_service}</Badge></div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              {client.adresse && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{client.adresse}</span>}
                              {client.telephone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{client.telephone}</span>}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="flex items-center gap-1 text-xs text-primary font-medium"><ClipboardList className="h-3 w-3" />{clientInts.length} intervention(s)</span>
                              {derniere && <span className="text-xs text-muted-foreground">Dernière : {derniere.date}</span>}
                              {client.jours_collecte?.length > 0 && <span className="text-[10px] text-blue-600">{client.jours_collecte.join(", ")}</span>}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
