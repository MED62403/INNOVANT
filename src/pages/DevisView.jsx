import { useState, useEffect } from "react";
import { ArrowLeft, Download, Mail, CheckCircle, XCircle, FileText, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";

const formatGNF = n => new Intl.NumberFormat("fr-FR").format(n || 0) + " GNF";
const LOGO_URL = "https://media.base44.com/images/public/user_69f11f3ed34547a9b8d670b3/3fde5caea_BlueandGreenCleaningServicesLogo_20250803_233347_0000.png";

async function loadLogoBase64() {
  return new Promise(resolve => {
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; c.getContext("2d").drawImage(img, 0, 0); resolve(c.toDataURL("image/png")); };
    img.onerror = () => resolve(null);
    img.src = LOGO_URL;
  });
}

const STATUT_STYLE = { "Brouillon": "bg-gray-100 text-gray-700", "Envoyé": "bg-blue-100 text-blue-700", "Accepté": "bg-green-100 text-green-700", "Refusé": "bg-red-100 text-red-700", "Converti": "bg-purple-100 text-purple-700" };

export default function DevisView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [devis, setDevis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => { load(); }, [id]);
  async function load() { const d = await base44.entities.Devis.get(id); setDevis(d); setLoading(false); }
  async function updateStatut(statut) { await base44.entities.Devis.update(id, { statut }); setDevis(p => ({ ...p, statut })); }

  async function sendEmail() {
    if (!devis.email_client) return alert("Aucun email client renseigné.");
    setSendingEmail(true);
    const lignesTexte = (devis.lignes || []).map(l => `  • ${l.description} × ${l.quantite} = ${formatGNF(l.total)}`).join("\n");
    const body = `Bonjour ${devis.nom_client},\n\nVeuillez trouver ci-dessous votre devis ${devis.numero_devis} établi par SANYA SERVICES.\n\nPrestations :\n${lignesTexte}\n\nMONTANT TOTAL : ${formatGNF(devis.montant_total)}\n\nCe devis est valable jusqu'au ${devis.date_validite || "—"}.\n\n${devis.notes || ""}\n\nCordialement,\nSANYA SERVICES`;
    await base44.integrations.Core.SendEmail({ to: devis.email_client, subject: `Devis ${devis.numero_devis} — SANYA SERVICES`, body, from_name: "SANYA SERVICES" });
    await updateStatut("Envoyé");
    setSendingEmail(false);
    alert("Devis envoyé par email ✓");
  }

  async function convertToFacture() {
    if (devis.statut === "Converti") return;
    setConverting(true);
    const factures = await base44.entities.Facture.list();
    const num = `FAC-${String(factures.length + 1).padStart(4, "0")}`;
    const today = new Date().toISOString().split("T")[0];
    const deadline = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const mois = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).replace(/^\w/, c => c.toUpperCase());
    const facture = await base44.entities.Facture.create({ numero_facture: num, client_id: devis.client_id || "", nom_client: devis.nom_client, adresse_client: devis.adresse_client || "", mois, date_facturation: today, description_service: (devis.lignes || []).map(l => l.description).join(", "), quantite: 1, prix_unitaire: devis.montant_total, montant_total: devis.montant_total, date_limite_paiement: deadline, statut: "Non payé" });
    await base44.entities.Devis.update(id, { statut: "Converti", facture_id: facture.id });
    setDevis(p => ({ ...p, statut: "Converti", facture_id: facture.id }));
    setConverting(false);
    alert(`Facture ${num} créée avec succès ✓`);
  }

  async function generatePDF() {
    if (!devis) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210; const margin = 15; const LINE = W - margin * 2; let y = 20;
    const logoData = await loadLogoBase64();
    doc.setFillColor(20, 100, 180); doc.rect(0, 0, W, 38, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.setFont("helvetica", "bold");
    doc.text("SANYA SERVICES", margin, 13); doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("Kérouane, Guinée", margin, 20); doc.text("sanyaservicekne@gmail.com", margin, 26);
    doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.text("DEVIS", W - margin - 28, 13);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(devis.numero_devis, W - margin - 28, 20);
    doc.setFontSize(9); doc.text(`Statut : ${devis.statut}`, W - margin - 28, 27);
    if (logoData) doc.addImage(logoData, "PNG", W - margin - 24, 2, 20, 20);
    doc.setTextColor(30, 30, 30); y = 48;
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.text("CLIENT", margin, y); doc.text("DATES", W / 2 + 10, y); y += 4;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    doc.text(devis.nom_client, margin, y); doc.text(`Date : ${devis.date_devis}`, W / 2 + 10, y); y += 5;
    if (devis.adresse_client) doc.text(devis.adresse_client, margin, y);
    doc.text(`Valide jusqu'au : ${devis.date_validite || "—"}`, W / 2 + 10, y); y += 5;
    if (devis.telephone_client) doc.text(`Tél : ${devis.telephone_client}`, margin, y);
    if (devis.email_client) { y += 5; doc.text(devis.email_client, margin, y); }
    y += 10;
    doc.setFillColor(20, 100, 180); doc.rect(margin, y, LINE, 7, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("Description", margin + 2, y + 5); doc.text("Qté", margin + 100, y + 5); doc.text("Prix unit.", margin + 115, y + 5); doc.text("Total", margin + 140, y + 5);
    doc.setTextColor(30, 30, 30); y += 10;
    (devis.lignes || []).forEach((l, i) => {
      if (i % 2 === 0) { doc.setFillColor(245, 248, 255); doc.rect(margin, y - 4, LINE, 7, "F"); }
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      const desc = doc.splitTextToSize(l.description || "", 90);
      doc.text(desc, margin + 2, y); doc.text(String(l.quantite || 0), margin + 102, y); doc.text(formatGNF(l.prix_unitaire), margin + 117, y); doc.text(formatGNF(l.total), margin + 142, y);
      y += desc.length > 1 ? 10 : 7;
    });
    y += 3; doc.setDrawColor(20, 100, 180); doc.setLineWidth(0.4); doc.line(margin, y, margin + LINE, y); y += 6;
    doc.setFillColor(20, 100, 180); doc.rect(margin + LINE - 60, y - 4, 60, 10, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text("TOTAL", margin + LINE - 58, y + 3); doc.text(formatGNF(devis.montant_total), margin + LINE - 2, y + 3, { align: "right" });
    doc.setTextColor(30, 30, 30); y += 18;
    if (devis.notes) { doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); doc.text("Conditions :", margin, y); y += 5; doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80); const noteLines = doc.splitTextToSize(devis.notes, LINE); doc.text(noteLines, margin, y); y += noteLines.length * 4.5 + 4; }
    doc.setTextColor(30, 30, 30); doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
    doc.text("Signature client (Bon pour accord) :", margin, y + 10); doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3); doc.line(margin, y + 22, margin + 70, y + 22);
    doc.setFontSize(8); doc.setTextColor(150, 150, 150); doc.text(`SANYA SERVICES — sanyaservicekne@gmail.com — ${devis.numero_devis}`, W / 2, 288, { align: "center" });
    doc.save(`${devis.numero_devis}.pdf`);
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  if (!devis) return <div className="text-center py-20 text-muted-foreground">Devis introuvable.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/devis")}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-xl font-bold flex-1">{devis.numero_devis}</h1>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUT_STYLE[devis.statut]}`}>{devis.statut}</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-5">
        <Button size="sm" variant="outline" className="gap-2 rounded-lg" onClick={generatePDF}><Download className="h-3.5 w-3.5" /> Télécharger PDF</Button>
        {devis.email_client && <Button size="sm" variant="outline" className="gap-2 rounded-lg" onClick={sendEmail} disabled={sendingEmail}>{sendingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}{sendingEmail ? "Envoi..." : "Envoyer par email"}</Button>}
        {devis.statut !== "Accepté" && devis.statut !== "Converti" && devis.statut !== "Refusé" && <Button size="sm" variant="outline" className="gap-2 rounded-lg text-green-700 border-green-300" onClick={() => updateStatut("Accepté")}><CheckCircle className="h-3.5 w-3.5" /> Marquer accepté</Button>}
        {devis.statut !== "Refusé" && devis.statut !== "Converti" && <Button size="sm" variant="outline" className="gap-2 rounded-lg text-red-600 border-red-300" onClick={() => updateStatut("Refusé")}><XCircle className="h-3.5 w-3.5" /> Marquer refusé</Button>}
        {devis.statut === "Accepté" && <Button size="sm" className="gap-2 rounded-lg bg-purple-600 hover:bg-purple-700" onClick={convertToFacture} disabled={converting}>{converting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}{converting ? "Conversion..." : "Convertir en facture"}</Button>}
        {devis.statut === "Converti" && devis.facture_id && <Button size="sm" variant="outline" className="gap-2 rounded-lg" onClick={() => navigate(`/factures/${devis.facture_id}`)}><FileText className="h-3.5 w-3.5" /> Voir la facture</Button>}
      </div>
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div><p className="text-xs text-muted-foreground">Client</p><p className="font-semibold">{devis.nom_client}</p></div>
          <div><p className="text-xs text-muted-foreground">Date</p><p className="font-semibold">{devis.date_devis}</p></div>
          {devis.adresse_client && <div><p className="text-xs text-muted-foreground">Adresse</p><p>{devis.adresse_client}</p></div>}
          <div><p className="text-xs text-muted-foreground">Validité</p><p>{devis.date_validite || "—"}</p></div>
          {devis.email_client && <div><p className="text-xs text-muted-foreground">Email</p><p>{devis.email_client}</p></div>}
          {devis.telephone_client && <div><p className="text-xs text-muted-foreground">Téléphone</p><p>{devis.telephone_client}</p></div>}
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <p className="text-sm font-semibold mb-3">Prestations</p>
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-1 text-xs font-semibold text-muted-foreground pb-1 border-b border-border"><span className="col-span-6">Description</span><span className="col-span-2 text-right">Qté</span><span className="col-span-2 text-right">Prix unit.</span><span className="col-span-2 text-right">Total</span></div>
          {(devis.lignes || []).map((l, i) => (<div key={i} className="grid grid-cols-12 gap-1 text-sm"><span className="col-span-6">{l.description}</span><span className="col-span-2 text-right text-muted-foreground">{l.quantite}</span><span className="col-span-2 text-right text-muted-foreground">{formatGNF(l.prix_unitaire)}</span><span className="col-span-2 text-right font-semibold">{formatGNF(l.total)}</span></div>))}
        </div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-border"><span className="font-semibold">Total</span><span className="text-xl font-bold text-primary">{formatGNF(devis.montant_total)}</span></div>
      </div>
      {devis.notes && <div className="bg-card border border-border rounded-xl p-4 text-sm text-muted-foreground"><p className="font-semibold text-foreground mb-1">Notes / Conditions</p><p className="whitespace-pre-wrap">{devis.notes}</p></div>}
    </div>
  );
}
