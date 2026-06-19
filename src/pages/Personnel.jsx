import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, Users, Calendar, ChevronRight, X, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const POSTES = ["Agent de collecte", "Agent de nettoyage", "Agent de désinfection", "Chauffeur", "Superviseur", "Autre"];
const TYPE_REM = ["Taux horaire", "Forfait mensuel", "Par mission"];
const TYPE_JOUR = ["Présence", "Congé", "Absence", "Mission"];

const formatGNF = (n) => n ? new Intl.NumberFormat("fr-FR").format(n) + " GNF" : "—";

function getMoisActuel() {
  const d = new Date();
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).replace(/^\w/, c => c.toUpperCase());
}

const EMPTY_EMP = { nom: "", poste: "", telephone: "", type_remuneration: "Forfait mensuel", taux_horaire: "", salaire_forfait: "", taux_mission: "", date_embauche: "", notes: "" };
const EMPTY_PRES = { date: new Date().toISOString().split("T")[0], type_jour: "Présence", heures_travaillees: "", nb_missions: "1", notes: "" };

export default function Personnel() {
  const [employes, setEmployes] = useState([]);
  const [presences, setPresences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMois, setSelectedMois] = useState(getMoisActuel());
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [editEmp, setEditEmp] = useState(null);
  const [empForm, setEmpForm] = useState(EMPTY_EMP);
  const [showPresForm, setShowPresForm] = useState(false);
  const [presForm, setPresForm] = useState(EMPTY_PRES);
  const [deleteEmpId, setDeleteEmpId] = useState(null);
  const [deletePresId, setDeletePresId] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [emps, pres] = await Promise.all([
      base44.entities.Personnel.list(),
      base44.entities.Presence.list("-date"),
    ]);
    setEmployes(emps);
    setPresences(pres);
    setLoading(false);
  }

  function openCreateEmp() { setEditEmp(null); setEmpForm(EMPTY_EMP); setShowEmpForm(true); }
  function openEditEmp(e) {
    setEditEmp(e);
    setEmpForm({ nom: e.nom, poste: e.poste, telephone: e.telephone || "", type_remuneration: e.type_remuneration, taux_horaire: e.taux_horaire || "", salaire_forfait: e.salaire_forfait || "", taux_mission: e.taux_mission || "", date_embauche: e.date_embauche || "", notes: e.notes || "" });
    setShowEmpForm(true);
  }
  async function handleSaveEmp() {
    if (!empForm.nom || !empForm.poste) return;
    const data = { ...empForm, taux_horaire: empForm.taux_horaire ? parseFloat(empForm.taux_horaire) : undefined, salaire_forfait: empForm.salaire_forfait ? parseFloat(empForm.salaire_forfait) : undefined, taux_mission: empForm.taux_mission ? parseFloat(empForm.taux_mission) : undefined };
    if (editEmp) await base44.entities.Personnel.update(editEmp.id, data);
    else await base44.entities.Personnel.create(data);
    setShowEmpForm(false);
    loadData();
  }
  async function handleDeleteEmp() {
    await base44.entities.Personnel.delete(deleteEmpId);
    setDeleteEmpId(null);
    if (selectedEmp?.id === deleteEmpId) setSelectedEmp(null);
    loadData();
  }

  async function handleSavePres() {
    if (!presForm.date || !presForm.type_jour) return;
    await base44.entities.Presence.create({
      ...presForm,
      personnel_id: selectedEmp.id,
      nom_personnel: selectedEmp.nom,
      mois: selectedMois,
      heures_travaillees: presForm.heures_travaillees ? parseFloat(presForm.heures_travaillees) : undefined,
      nb_missions: presForm.nb_missions ? parseFloat(presForm.nb_missions) : 1,
    });
    setShowPresForm(false);
    setPresForm(EMPTY_PRES);
    loadData();
  }
  async function handleDeletePres() {
    await base44.entities.Presence.delete(deletePresId);
    setDeletePresId(null);
    loadData();
  }

  function calcSalaire(emp, presMois) {
    const { type_remuneration, taux_horaire, salaire_forfait, taux_mission } = emp;
    const jours = presMois.filter(p => p.type_jour === "Présence" || p.type_jour === "Mission");
    if (type_remuneration === "Taux horaire") {
      const totalH = jours.reduce((s, p) => s + (p.heures_travaillees || 0), 0);
      return { montant: totalH * (taux_horaire || 0), detail: `${totalH}h × ${formatGNF(taux_horaire)}` };
    }
    if (type_remuneration === "Par mission") {
      const totalM = jours.reduce((s, p) => s + (p.nb_missions || 0), 0);
      return { montant: totalM * (taux_mission || 0), detail: `${totalM} missions × ${formatGNF(taux_mission)}` };
    }
    return { montant: salaire_forfait || 0, detail: "Forfait mensuel" };
  }

  const allMois = [...new Set(presences.map(p => p.mois).filter(Boolean))];
  if (!allMois.includes(getMoisActuel())) allMois.push(getMoisActuel());
  allMois.sort();

  const presencesMois = presences.filter(p => p.mois === selectedMois);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {selectedEmp ? (
        <DetailEmploye
          emp={selectedEmp}
          presences={presencesMois.filter(p => p.personnel_id === selectedEmp.id)}
          selectedMois={selectedMois}
          allMois={allMois}
          onMoisChange={setSelectedMois}
          calcSalaire={calcSalaire}
          onBack={() => setSelectedEmp(null)}
          onEdit={() => openEditEmp(selectedEmp)}
          onDelete={() => setDeleteEmpId(selectedEmp.id)}
          onAddPres={() => setShowPresForm(true)}
          onDeletePres={setDeletePresId}
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-foreground">Personnel</h1>
            <Button size="sm" className="gap-2 rounded-lg" onClick={openCreateEmp}>
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>

          {employes.length > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-5">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Masse salariale — {selectedMois}</p>
              <div className="flex items-center gap-3 mb-2">
                <Select value={selectedMois} onValueChange={setSelectedMois}>
                  <SelectTrigger className="w-44 h-8 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>{allMois.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <p className="text-xl font-bold text-primary">
                {formatGNF(employes.reduce((s, emp) => s + calcSalaire(emp, presencesMois.filter(p => p.personnel_id === emp.id)).montant, 0))}
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : employes.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">Aucun employé enregistré.</p>
          ) : (
            <div className="space-y-3">
              {employes.map(emp => {
                const presMois = presencesMois.filter(p => p.personnel_id === emp.id);
                const { montant } = calcSalaire(emp, presMois);
                const joursPresence = presMois.filter(p => p.type_jour === "Présence" || p.type_jour === "Mission").length;
                const joursConge = presMois.filter(p => p.type_jour === "Congé").length;
                return (
                  <div key={emp.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <button className="flex-1 text-left" onClick={() => setSelectedEmp(emp)}>
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-semibold text-foreground">{emp.nom}</span>
                          <Badge variant="outline" className="text-[10px]">{emp.poste}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>✅ {joursPresence}j présence</span>
                          {joursConge > 0 && <span>🏖 {joursConge}j congé</span>}
                          <span className="font-semibold text-primary">{formatGNF(montant)}</span>
                        </div>
                      </button>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditEmp(emp)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteEmpId(emp.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setSelectedEmp(emp)}><ChevronRight className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <Dialog open={showEmpForm} onOpenChange={setShowEmpForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editEmp ? "Modifier l'employé" : "Nouvel employé"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-sm font-medium mb-1 block">Nom complet *</label><Input placeholder="Ex: Mamadou Diallo" value={empForm.nom} onChange={e => setEmpForm(p => ({ ...p, nom: e.target.value }))} /></div>
            <div><label className="text-sm font-medium mb-1 block">Poste *</label>
              <Select value={empForm.poste} onValueChange={v => setEmpForm(p => ({ ...p, poste: v }))}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Choisir un poste" /></SelectTrigger>
                <SelectContent>{POSTES.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Téléphone</label><Input placeholder="Ex: 620 000 000" value={empForm.telephone} onChange={e => setEmpForm(p => ({ ...p, telephone: e.target.value }))} /></div>
            <div><label className="text-sm font-medium mb-1 block">Type de rémunération</label>
              <Select value={empForm.type_remuneration} onValueChange={v => setEmpForm(p => ({ ...p, type_remuneration: v }))}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPE_REM.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {empForm.type_remuneration === "Taux horaire" && (
              <div><label className="text-sm font-medium mb-1 block">Taux horaire (GNF)</label><Input type="number" placeholder="0" value={empForm.taux_horaire} onChange={e => setEmpForm(p => ({ ...p, taux_horaire: e.target.value }))} /></div>
            )}
            {empForm.type_remuneration === "Forfait mensuel" && (
              <div><label className="text-sm font-medium mb-1 block">Salaire forfait (GNF)</label><Input type="number" placeholder="0" value={empForm.salaire_forfait} onChange={e => setEmpForm(p => ({ ...p, salaire_forfait: e.target.value }))} /></div>
            )}
            {empForm.type_remuneration === "Par mission" && (
              <div><label className="text-sm font-medium mb-1 block">Tarif par mission (GNF)</label><Input type="number" placeholder="0" value={empForm.taux_mission} onChange={e => setEmpForm(p => ({ ...p, taux_mission: e.target.value }))} /></div>
            )}
            <div><label className="text-sm font-medium mb-1 block">Date d'embauche</label><Input type="date" value={empForm.date_embauche} onChange={e => setEmpForm(p => ({ ...p, date_embauche: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmpForm(false)}>Annuler</Button>
            <Button onClick={handleSaveEmp} disabled={!empForm.nom || !empForm.poste}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPresForm} onOpenChange={setShowPresForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Enregistrer une journée</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-sm font-medium mb-1 block">Date</label><Input type="date" value={presForm.date} onChange={e => setPresForm(p => ({ ...p, date: e.target.value }))} /></div>
            <div><label className="text-sm font-medium mb-1 block">Type de journée</label>
              <Select value={presForm.type_jour} onValueChange={v => setPresForm(p => ({ ...p, type_jour: v }))}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPE_JOUR.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {(presForm.type_jour === "Présence") && selectedEmp?.type_remuneration === "Taux horaire" && (
              <div><label className="text-sm font-medium mb-1 block">Heures travaillées</label><Input type="number" placeholder="8" value={presForm.heures_travaillees} onChange={e => setPresForm(p => ({ ...p, heures_travaillees: e.target.value }))} /></div>
            )}
            {(presForm.type_jour === "Mission") && selectedEmp?.type_remuneration === "Par mission" && (
              <div><label className="text-sm font-medium mb-1 block">Nombre de missions</label><Input type="number" placeholder="1" value={presForm.nb_missions} onChange={e => setPresForm(p => ({ ...p, nb_missions: e.target.value }))} /></div>
            )}
            <div><label className="text-sm font-medium mb-1 block">Notes</label><Input placeholder="Optionnel" value={presForm.notes} onChange={e => setPresForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPresForm(false)}>Annuler</Button>
            <Button onClick={handleSavePres}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteEmpId} onOpenChange={() => setDeleteEmpId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer cet employé ?</AlertDialogTitle><AlertDialogDescription>Toutes les présences associées resteront dans la base.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDeleteEmp} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletePresId} onOpenChange={() => setDeletePresId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDeletePres} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailEmploye({ emp, presences, selectedMois, allMois, onMoisChange, calcSalaire, onBack, onEdit, onDelete, onAddPres, onDeletePres }) {
  const { montant, detail } = calcSalaire(emp, presences);
  const joursPresence = presences.filter(p => p.type_jour === "Présence").length;
  const joursMission = presences.filter(p => p.type_jour === "Mission").length;
  const joursConge = presences.filter(p => p.type_jour === "Congé").length;
  const joursAbsence = presences.filter(p => p.type_jour === "Absence").length;

  const typeColor = { "Présence": "bg-green-100 text-green-700", "Mission": "bg-blue-100 text-blue-700", "Congé": "bg-yellow-100 text-yellow-700", "Absence": "bg-red-100 text-red-700" };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
        ← Retour
      </button>
      <div className="bg-card border border-border rounded-xl p-4 mb-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">{emp.nom}</h2>
            <p className="text-sm text-muted-foreground">{emp.poste}</p>
            {emp.telephone && <p className="text-xs text-muted-foreground mt-0.5">📞 {emp.telephone}</p>}
            <p className="text-xs text-muted-foreground mt-0.5">Rémunération : {emp.type_remuneration}</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Select value={selectedMois} onValueChange={onMoisChange}>
          <SelectTrigger className="w-44 h-8 text-sm rounded-lg"><SelectValue /></SelectTrigger>
          <SelectContent>{allMois.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" className="gap-1 rounded-lg ml-auto" onClick={onAddPres}>
          <Plus className="h-3.5 w-3.5" />
          Journée
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {[["✅", joursPresence, "Présence", "text-green-700"], ["🎯", joursMission, "Mission", "text-blue-700"], ["🏖", joursConge, "Congé", "text-yellow-700"], ["❌", joursAbsence, "Absence", "text-red-600"]].map(([icon, val, label, cls]) => (
          <div key={label} className="bg-card border border-border rounded-xl p-2 text-center">
            <p className="text-base">{icon}</p>
            <p className={`text-lg font-bold ${cls}`}>{val}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4">
        <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">Salaire calculé — {selectedMois}</p>
        <p className="text-2xl font-bold text-primary">{new Intl.NumberFormat("fr-FR").format(montant)} GNF</p>
        <p className="text-xs text-muted-foreground mt-1">{detail}</p>
      </div>

      {presences.length === 0 ? (
        <p className="text-center text-muted-foreground py-6">Aucune entrée pour ce mois.</p>
      ) : (
        <div className="space-y-2">
          {presences.map(p => (
            <div key={p.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeColor[p.type_jour] || "bg-muted text-muted-foreground"}`}>{p.type_jour}</span>
                  <span className="text-sm font-medium text-foreground">{p.date}</span>
                </div>
                {p.heures_travaillees > 0 && <p className="text-xs text-muted-foreground mt-0.5">{p.heures_travaillees}h travaillées</p>}
                {p.nb_missions > 0 && p.type_jour === "Mission" && <p className="text-xs text-muted-foreground mt-0.5">{p.nb_missions} mission(s)</p>}
                {p.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{p.notes}</p>}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => onDeletePres(p.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}