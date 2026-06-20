import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Download, CheckCircle, Clock, AlertCircle, CalendarDays } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { jsPDF } from "jspdf";

const formatGNF = n => new Intl.NumberFormat("fr-FR").format(n || 0) + " GNF";

const LOGO_URL = "https://media.base44.com/images/public/user_69f11f3ed34547a9b8d670b3/3fde5caea_BlueandGreenCleaningServicesLogo_20250803_233347_0000.png";

async function loadLogoBase64() {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      c.getContext("2d").drawImage(img, 0, 0);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = LOGO_URL;
  });
}
const MODES = ["Espèces", "Mobile Money", "Virement bancaire", "Chèque", "Autre"];

const EMPTY_FORM = {
  montant_verse: "",
  date_paiement: new Date().toISOString().split("T")[0],
  mode_paiement: "Espèces",
  notes: "",
};

export default function PaiementsFacture() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [facture, setFacture] = useState(null);
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [showEcheancier, setShowEcheancier] = useState(false);
  const [nbEcheances, setNbEcheances] = useState(3);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const [f, ps] = await Promise.all([
      base44.entities.Facture.get(id),
      base44.entities.Paiement.filter({ facture_id: id }, "-date_paiement"),
    ]);
    setFacture(f);
    setPaiements(ps);
    setLoading(false);
  }

  const totalVerse = paiements.reduce((s, p) => s + (p.montant_verse || 0), 0);
  const restant = (facture?.montant_total || 0) - totalVerse;
  const pct = facture ? Math.min(100, Math.round((totalVerse / facture.montant_total) * 100)) : 0;
  const solde = restant <= 0;

  async function handleAddPaiement() {
    const montant = parseFloat(form.montant_verse);
    if (!montant || montant <= 0) return;
    setSaving(true);
    const recuNum = `REC-${Date.now().toString().slice(-6)}`;
    await base44.entities.Paiement.create({
      facture_id: id,
      numero_facture: facture.numero_facture,
      nom_client: facture.nom_client,
      montant_verse: montant,
      date_paiement: form.date_paiement,
      mode_paiement: form.mode_paiement,
      notes: form.notes,
      numero_recu: recuNum,
    });
    // Si le total versé couvre la facture, la marquer Payé
    const newTotal = totalVerse + montant;
    if (newTotal >= facture.montant_total && facture.statut !== "Payé") {
      await base44.entities.Facture.update(id, { statut: "Payé" });
    }
    setShowForm(false);
    setForm(EMPTY_FORM);
    setSaving(false);
    load();
  }

  async function handleDelete() {
    const p = paiements.find(p => p.id === deleteId);
    await base44.entities.Paiement.delete(deleteId);
    // Recalcule le statut facture
    const newTotal = totalVerse - (p?.montant_verse || 0);
    if (newTotal < (facture?.montant_total || 0) && facture?.statut === "Payé") {
      await base44.entities.Facture.update(id, { statut: "Non payé" });
    }
    setDeleteId(null);
    load();
  }

  async function generateRecu(paiement) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
    const W = 148;
    const M = 12;
    const logoData = await loadLogoBase64();

    // En-tête
    doc.setFillColor(20, 100, 180);
    doc.rect(0, 0, W, 34, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15); doc.setFont("helvetica", "bold");
    doc.text("SANYA SERVICES", M, 11);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text("Kérouané, Guinée", M, 17);
    doc.text("sanyaservicekne@gmail.com", M, 23);
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text("REÇU DE PAIEMENT", W - M - 22, 11);
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
    doc.text(paiement.numero_recu, W - M - 22, 18);
    if (logoData) doc.addImage(logoData, "PNG", W - M - 20, 2, 18, 18);
    doc.setTextColor(30, 30, 30);

    let y = 42;
    // Infos principales
    const rows = [
      ["Date", paiement.date_paiement],
      ["Client", paiement.nom_client],
      ["Facture liée", paiement.numero_facture],
      ["Mode de paiement", paiement.mode_paiement],
    ];
    rows.forEach(([label, val]) => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
      doc.text(label, M, y);
      doc.setFont("helvetica", "normal");
      doc.text(val || "—", M + 45, y);
      y += 7;
    });

    y += 4;
    // Montant en évidence
    doc.setFillColor(240, 247, 255);
    doc.rect(M, y - 5, W - M * 2, 18, "F");
    doc.setDrawColor(20, 100, 180); doc.setLineWidth(0.5);
    doc.rect(M, y - 5, W - M * 2, 18, "S");
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 100, 180);
    doc.text("MONTANT REÇU", M + 4, y + 4);
    doc.setFontSize(14);
    doc.text(formatGNF(paiement.montant_verse), W - M - 4, y + 5, { align: "right" });
    doc.setTextColor(30, 30, 30);
    y += 26;

    // Récapitulatif solde
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
    doc.text(`Total facture : ${formatGNF(facture.montant_total)}`, M, y);
    doc.text(`Total versé   : ${formatGNF(totalVerse)}`, M, y + 6);
    const restantAfter = Math.max(0, (facture.montant_total || 0) - totalVerse);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(restantAfter <= 0 ? 22 : 180, restantAfter <= 0 ? 163 : 38, restantAfter <= 0 ? 74 : 38);
    doc.text(`Solde restant : ${formatGNF(restantAfter)}`, M, y + 12);
    doc.setTextColor(30, 30, 30); doc.setFont("helvetica", "normal");
    y += 24;

    if (paiement.notes) {
      doc.setFontSize(8); doc.setTextColor(100, 100, 100);
      doc.text(`Note : ${paiement.notes}`, M, y);
      y += 8;
    }

    // Signature
    doc.setTextColor(30, 30, 30); doc.setFontSize(8);
    doc.text("Signature du caissier :", M, y + 10);
    doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.2);
    doc.line(M, y + 20, M + 50, y + 20);

    // Footer
    doc.setFontSize(7); doc.setTextColor(150, 150, 150);
    doc.text(`SANYA SERVICES — sanyaservicekne@gmail.com — ${paiement.numero_recu}`, W / 2, 200, { align: "center" });

    doc.save(`${paiement.numero_recu}.pdf`);
  }

  // Génération d'un échéancier
  function genEcheancier() {
    const montantEch = restant > 0 ? restant : facture?.montant_total || 0;
    const mensuel = montantEch / nbEcheances;
    const today = new Date();
    return Array.from({ length: nbEcheances }, (_, i) => {
      const d = new Date(today);
      d.setMonth(d.getMonth() + i + 1);
      return { date: d.toLocaleDateString("fr-FR"), montant: mensuel };
    });
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  if (!facture) return <div className="text-center py-20 text-muted-foreground">Facture introuvable.</div>;

  const echeances = genEcheancier();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Suivi paiements</h1>
          <p className="text-xs text-muted-foreground">{facture.numero_facture} — {facture.nom_client}</p>
        </div>
      </div>

      {/* Statut global */}
      <div className={`rounded-xl border-2 p-4 mb-5 ${solde ? "bg-green-50 border-green-300" : "bg-card border-border"}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {solde
              ? <CheckCircle className="h-5 w-5 text-green-600" />
              : pct > 0 ? <Clock className="h-5 w-5 text-blue-500" /> : <AlertCircle className="h-5 w-5 text-orange-500" />
            }
            <span className="font-semibold text-sm">{solde ? "Soldé" : pct > 0 ? "Paiement partiel" : "Non payé"}</span>
          </div>
          <span className="text-xs font-bold text-muted-foreground">{pct}%</span>
        </div>
        {/* Barre de progression */}
        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden mb-3">
          <div className={`h-full rounded-full transition-all ${solde ? "bg-green-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Total facture</p>
            <p className="font-bold text-sm">{formatGNF(facture.montant_total)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Versé</p>
            <p className="font-bold text-sm text-green-600">{formatGNF(totalVerse)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Restant</p>
            <p className={`font-bold text-sm ${restant > 0 ? "text-orange-600" : "text-green-600"}`}>{formatGNF(Math.max(0, restant))}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-5">
        {!solde && (
          <Button size="sm" className="gap-2 rounded-lg" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" /> Enregistrer un paiement
          </Button>
        )}
        <Button size="sm" variant="outline" className="gap-2 rounded-lg" onClick={() => setShowEcheancier(true)}>
          <CalendarDays className="h-3.5 w-3.5" /> Voir l'échéancier
        </Button>
      </div>

      {/* Historique paiements */}
      <p className="text-sm font-semibold mb-3">Historique des versements</p>
      {paiements.length === 0 ? (
        <p className="text-center text-muted-foreground py-8 text-sm">Aucun paiement enregistré.</p>
      ) : (
        <div className="space-y-3">
          {paiements.map(p => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{p.numero_recu}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{p.mode_paiement}</span>
                  </div>
                  <p className="font-bold text-primary">{formatGNF(p.montant_verse)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.date_paiement}{p.notes ? ` · ${p.notes}` : ""}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Télécharger le reçu" onClick={() => generateRecu(p)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog ajout paiement */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Enregistrer un versement</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium mb-1 block">Montant versé (GNF) *</label>
              <Input type="number" placeholder="Ex: 50000" value={form.montant_verse}
                onChange={e => setForm(p => ({ ...p, montant_verse: e.target.value }))} />
              {restant > 0 && (
                <button className="text-xs text-primary mt-1 underline" onClick={() => setForm(p => ({ ...p, montant_verse: String(restant) }))}>
                  Solde restant : {formatGNF(restant)}
                </button>
              )}
            </div>
            <div><label className="text-xs font-medium mb-1 block">Date *</label><Input type="date" value={form.date_paiement} onChange={e => setForm(p => ({ ...p, date_paiement: e.target.value }))} /></div>
            <div>
              <label className="text-xs font-medium mb-1 block">Mode de paiement</label>
              <Select value={form.mode_paiement} onValueChange={v => setForm(p => ({ ...p, mode_paiement: v }))}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>{MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs font-medium mb-1 block">Notes</label><Input placeholder="Optionnel" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button onClick={handleAddPaiement} disabled={saving || !form.montant_verse}>
              {saving ? "Enregistrement..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog échéancier */}
      <Dialog open={showEcheancier} onOpenChange={setShowEcheancier}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Échéancier de paiement</DialogTitle></DialogHeader>
          <div className="py-2">
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm font-medium whitespace-nowrap">Nombre d'échéances :</label>
              <Select value={String(nbEcheances)} onValueChange={v => setNbEcheances(parseInt(v))}>
                <SelectTrigger className="w-24 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>{[2,3,4,6,12].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Montant à échelonner : <strong>{formatGNF(Math.max(0, restant))}</strong></p>
            <div className="space-y-2">
              {echeances.map((e, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">Échéance {i + 1} — {e.date}</span>
                  <span className="font-semibold text-sm">{formatGNF(Math.round(e.montant))}</span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter><Button onClick={() => setShowEcheancier(false)}>Fermer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog suppression */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer ce versement ?</AlertDialogTitle><AlertDialogDescription>Le statut de la facture sera recalculé automatiquement.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}