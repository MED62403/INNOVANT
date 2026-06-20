import { useState, useEffect, useRef } from "react";
import { Download, FileBarChart, Calendar } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { jsPDF } from "jspdf";

const formatGNF = (n) => new Intl.NumberFormat("fr-FR").format(n || 0) + " GNF";

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

function getMoisActuel() {
  const d = new Date();
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).replace(/^\w/, c => c.toUpperCase());
}

function calcSalaire(emp, presencesMois) {
  const { type_remuneration, taux_horaire, salaire_forfait, taux_mission } = emp;
  const jours = presencesMois.filter(p => p.type_jour === "Présence" || p.type_jour === "Mission");
  if (type_remuneration === "Taux horaire") {
    return jours.reduce((s, p) => s + (p.heures_travaillees || 0), 0) * (taux_horaire || 0);
  }
  if (type_remuneration === "Par mission") {
    return jours.reduce((s, p) => s + (p.nb_missions || 0), 0) * (taux_mission || 0);
  }
  return salaire_forfait || 0;
}

export default function RapportMensuel() {
  const [allMois, setAllMois] = useState([]);
  const [selectedMois, setSelectedMois] = useState(getMoisActuel());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { loadAllMois(); }, []);
  useEffect(() => { if (selectedMois) loadData(selectedMois); }, [selectedMois]);

  async function loadAllMois() {
    const [factures, depenses] = await Promise.all([
      base44.entities.Facture.list(),
      base44.entities.Depense.list(),
    ]);
    const mois = [...new Set([
      ...factures.map(f => f.mois),
      ...depenses.map(d => d.mois),
      getMoisActuel(),
    ].filter(Boolean))].sort();
    setAllMois(mois);
  }

  async function loadData(mois) {
    setLoading(true);
    const [factures, depenses, presences, personnel] = await Promise.all([
      base44.entities.Facture.list(),
      base44.entities.Depense.list(),
      base44.entities.Presence.list(),
      base44.entities.Personnel.list(),
    ]);

    const facturesMois = factures.filter(f => f.mois === mois);
    const depensesMois = depenses.filter(d => d.mois === mois);
    const presencesMois = presences.filter(p => p.mois === mois);

    const totalFacture = facturesMois.reduce((s, f) => s + (f.montant_total || 0), 0);
    const totalEncaisse = facturesMois.filter(f => f.statut === "Payé").reduce((s, f) => s + (f.montant_total || 0), 0);
    const totalImpaye = facturesMois.filter(f => f.statut !== "Payé").reduce((s, f) => s + (f.montant_total || 0), 0);
    const tauxRecouvrement = totalFacture > 0 ? Math.round((totalEncaisse / totalFacture) * 100) : 0;
    const totalDepenses = depensesMois.reduce((s, d) => s + (d.montant || 0), 0);

    const depensesParCat = {};
    depensesMois.forEach(d => {
      depensesParCat[d.categorie] = (depensesParCat[d.categorie] || 0) + (d.montant || 0);
    });

    const salaireDetail = personnel.map(emp => {
      const pres = presencesMois.filter(p => p.personnel_id === emp.id);
      const montant = calcSalaire(emp, pres);
      const joursP = pres.filter(p => p.type_jour === "Présence" || p.type_jour === "Mission").length;
      const joursC = pres.filter(p => p.type_jour === "Congé").length;
      const joursA = pres.filter(p => p.type_jour === "Absence").length;
      return { nom: emp.nom, poste: emp.poste, montant, joursP, joursC, joursA };
    });
    const masseSalariale = salaireDetail.reduce((s, e) => s + e.montant, 0);

    const totalCharges = totalDepenses + masseSalariale;
    const beneficeNet = totalEncaisse - totalCharges;
    const margeBrute = totalEncaisse - totalDepenses;
    const tauxMarge = totalEncaisse > 0 ? Math.round((margeBrute / totalEncaisse) * 100) : 0;

    setData({
      mois,
      facturesMois,
      totalFacture, totalEncaisse, totalImpaye, tauxRecouvrement,
      totalDepenses, depensesParCat,
      salaireDetail, masseSalariale,
      totalCharges, beneficeNet,
      margeBrute, tauxMarge,
    });
    setLoading(false);
  }

  async function generatePDF() {
    if (!data) return;
    setGenerating(true);

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210;
    const margin = 15;
    let y = 20;
    const logoData = await loadLogoBase64();

    const LINE = W - margin * 2;
    const col2 = W - margin - 60;

    const title = (text, size = 13) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20, 100, 180);
      doc.text(text, margin, y);
      y += 2;
      doc.setDrawColor(20, 100, 180);
      doc.setLineWidth(0.4);
      doc.line(margin, y, margin + LINE, y);
      y += 6;
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    };
    const row = (label, value, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(10);
      doc.text(label, margin, y);
      doc.text(value, col2, y, { align: "right" });
      y += 6;
    };
    const divider = () => {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(margin, y, margin + LINE, y);
      y += 4;
    };
    const newPage = () => { doc.addPage(); y = 20; };
    const checkPage = (needed = 30) => { if (y + needed > 270) newPage(); };

    doc.setFillColor(20, 100, 180);
    doc.rect(0, 0, W, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("SANYA SERVICES", margin, 13);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`Rapport Mensuel — ${data.mois}`, margin, 21);
    doc.setFontSize(8.5);
    doc.text(`sanyaservicekne@gmail.com · Kérouane, Guinée`, margin, 28);
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, margin, 34);
    if (logoData) doc.addImage(logoData, "PNG", W - margin - 26, 3, 22, 22);
    doc.setTextColor(30, 30, 30);
    y = 48;

    title("1. Compte de Résultat");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor(80, 80, 80);
    doc.text("PRODUITS D'EXPLOITATION", margin, y); y += 6;
    doc.setFont("helvetica", "normal"); doc.setTextColor(30, 30, 30); doc.setFontSize(10);
    row("Chiffre d'affaires brut", formatGNF(data.totalFacture));
    row("  dont encaissé", formatGNF(data.totalEncaisse));
    row("  dont créances clients", formatGNF(data.totalImpaye));
    row("Taux de recouvrement", `${data.tauxRecouvrement}%`);
    row(`Nombre de factures`, `${data.facturesMois.length}`);
    divider();

    checkPage(40);
    title("2. Dépenses opérationnelles");
    if (Object.keys(data.depensesParCat).length === 0) {
      doc.setFontSize(9); doc.setTextColor(120, 120, 120);
      doc.text("Aucune dépense enregistrée.", margin, y); y += 7;
      doc.setTextColor(30, 30, 30);
    } else {
      Object.entries(data.depensesParCat).forEach(([cat, total]) => {
        checkPage(8);
        row(cat, formatGNF(total));
      });
    }
    row("TOTAL DÉPENSES", formatGNF(data.totalDepenses), true);
    divider();

    checkPage(40);
    title("3. Personnel & Masse salariale");
    if (data.salaireDetail.length === 0) {
      doc.setFontSize(9); doc.setTextColor(120, 120, 120);
      doc.text("Aucun employé enregistré.", margin, y); y += 7;
      doc.setTextColor(30, 30, 30);
    } else {
      data.salaireDetail.forEach(emp => {
        checkPage(12);
        doc.setFont("helvetica", "bold"); doc.setFontSize(10);
        doc.text(`${emp.nom} (${emp.poste})`, margin, y);
        doc.text(formatGNF(emp.montant), col2, y, { align: "right" });
        y += 5;
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(100, 100, 100);
        doc.text(`  Présence: ${emp.joursP}j   Congé: ${emp.joursC}j   Absence: ${emp.joursA}j`, margin, y);
        y += 6; doc.setTextColor(30, 30, 30);
      });
    }
    row("MASSE SALARIALE", formatGNF(data.masseSalariale), true);
    divider();

    checkPage(40);
    title("4. Indicateurs de Performance");
    row("Taux de recouvrement", `${data.tauxRecouvrement}%`);
    row("Marge brute (CA - charges opé.)", formatGNF(data.margeBrute));
    row("Taux de marge brute", `${data.tauxMarge}%`);
    row("Charges salariales / CA", data.totalEncaisse > 0 ? `${Math.round((data.masseSalariale / data.totalEncaisse) * 100)}%` : "N/A");
    divider();

    checkPage(50);
    title("5. Synthèse financière — Résultat Net");

    const synthY = y;
    doc.setFillColor(245, 248, 255);
    doc.rect(margin, synthY - 4, LINE, 38, "F");
    doc.setDrawColor(20, 100, 180);
    doc.setLineWidth(0.3);
    doc.rect(margin, synthY - 4, LINE, 38, "S");

    row("Revenus encaissés", formatGNF(data.totalEncaisse));
    row("Total dépenses opérationnelles", `− ${formatGNF(data.totalDepenses)}`);
    row("Masse salariale", `− ${formatGNF(data.masseSalariale)}`);
    divider();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const benefColor = data.beneficeNet >= 0 ? [22, 163, 74] : [220, 38, 38];
    doc.setTextColor(...benefColor);
    doc.text("BÉNÉFICE NET", margin + 2, y);
    doc.text(formatGNF(data.beneficeNet), col2, y, { align: "right" });
    doc.setTextColor(30, 30, 30);
    y += 10;

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(150, 150, 150);
      doc.text(`SANYA SERVICES — sanyaservicekne@gmail.com — Rapport ${data.mois} — Page ${i}/${pageCount}`, W / 2, 290, { align: "center" });
    }

    doc.save(`Rapport_${data.mois.replace(/ /g, "_")}.pdf`);
    setGenerating(false);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">Rapport mensuel</h1>
        <Button
          size="sm"
          className="gap-2 rounded-lg"
          onClick={generatePDF}
          disabled={generating || loading || !data}
        >
          <Download className="h-4 w-4" />
          {generating ? "Génération..." : "Télécharger PDF"}
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedMois} onValueChange={setSelectedMois}>
          <SelectTrigger className="w-52 rounded-xl">
            <SelectValue placeholder="Sélectionner un mois" />
          </SelectTrigger>
          <SelectContent>
            {allMois.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-blue-700">{data.tauxRecouvrement}%</p>
              <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wide">Recouvrement</p>
            </div>
            <div className={`rounded-xl p-3 text-center border-2 ${data.beneficeNet >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <p className={`text-xl font-bold ${data.beneficeNet >= 0 ? "text-green-700" : "text-red-700"}`}>{data.tauxMarge}%</p>
              <p className={`text-[10px] font-medium uppercase tracking-wide ${data.beneficeNet >= 0 ? "text-green-600" : "text-red-600"}`}>Taux de marge</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-purple-700">{data.facturesMois.length}</p>
              <p className="text-[10px] text-purple-600 font-medium uppercase tracking-wide">Factures</p>
            </div>
          </div>

          <Section title="Compte de Résultat" icon="📊">
            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Produits</p>
            <Line label="Chiffre d'affaires brut" value={formatGNF(data.totalFacture)} />
            <Line label="  ↳ Encaissé" value={formatGNF(data.totalEncaisse)} green />
            <Line label="  ↳ Créances clients" value={formatGNF(data.totalImpaye)} red />
            <div className="border-t border-border my-2" />
            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Charges</p>
            <Line label="Charges opérationnelles" value={formatGNF(data.totalDepenses)} />
            <Line label="Masse salariale" value={formatGNF(data.masseSalariale)} />
            <Line label="Total charges" value={formatGNF(data.totalCharges)} bold />
          </Section>

          <Section title="Dépenses opérationnelles" icon="📉">
            {Object.entries(data.depensesParCat).map(([cat, total]) => (
              <Line key={cat} label={cat} value={formatGNF(total)} />
            ))}
            <Line label="Total dépenses" value={formatGNF(data.totalDepenses)} bold />
          </Section>

          <Section title="Personnel & Masse salariale" icon="👷">
            {data.salaireDetail.map(emp => (
              <div key={emp.nom}>
                <Line label={`${emp.nom} (${emp.poste})`} value={formatGNF(emp.montant)} bold />
                <p className="text-xs text-muted-foreground mb-1 ml-1">Présence: {emp.joursP}j · Congé: {emp.joursC}j · Absence: {emp.joursA}j</p>
              </div>
            ))}
            <Line label="Masse salariale" value={formatGNF(data.masseSalariale)} bold />
          </Section>

          <div className={`rounded-xl border-2 p-4 ${data.beneficeNet >= 0 ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Synthèse financière</p>
            <Line label="Revenus encaissés" value={formatGNF(data.totalEncaisse)} />
            <Line label="− Dépenses" value={formatGNF(data.totalDepenses)} />
            <Line label="− Masse salariale" value={formatGNF(data.masseSalariale)} />
            <div className="border-t border-current/20 mt-2 pt-2">
              <div className="flex justify-between items-center">
                <span className={`text-base font-bold ${data.beneficeNet >= 0 ? "text-green-700" : "text-red-700"}`}>Bénéfice net</span>
                <span className={`text-xl font-bold ${data.beneficeNet >= 0 ? "text-green-700" : "text-red-700"}`}>{formatGNF(data.beneficeNet)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <p className="text-sm font-semibold text-foreground mb-3">{icon} {title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Line({ label, value, bold, green, red }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className={`text-sm ${bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{label}</span>
      <span className={`text-sm font-semibold ${green ? "text-green-700" : red ? "text-red-600" : "text-foreground"}`}>{value}</span>
    </div>
  );
}