import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Calendar } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import FactureTemplate from "../components/FactureTemplate";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const A4_W = 794;
const A4_H = 1123;

export default function FacturesCollective() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const ids = urlParams.get("ids")?.split(",").filter(Boolean) || [];
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [allMois, setAllMois] = useState([]);
  const [selectedMois, setSelectedMois] = useState("");
  const [loadingMois, setLoadingMois] = useState(false);
  const pagesRef = useRef([]);
  const isRedownloadMode = ids.length === 0;

  useEffect(() => {
    async function load() {
      if (ids.length > 0) {
        const results = await Promise.all(ids.map(id => base44.entities.Facture.get(id)));
        setFactures(results);
      } else {
        const all = await base44.entities.Facture.list();
        const mois = [...new Set(all.map(f => f.mois).filter(Boolean))].sort();
        setAllMois(mois);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSelectMois(mois) {
    setSelectedMois(mois); setLoadingMois(true);
    const all = await base44.entities.Facture.list();
    setFactures(all.filter(f => f.mois === mois));
    pagesRef.current = []; setLoadingMois(false);
  }

  const pages = [];
  for (let i = 0; i < factures.length; i += 2) pages.push(factures.slice(i, i + 2));

  async function handleDownloadPDF() {
    setDownloading(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const validRefs = pagesRef.current.filter(Boolean);
      for (let i = 0; i < validRefs.length; i++) {
        const el = validRefs[i];
        const imgs = el.querySelectorAll("img");
        imgs.forEach(img => { img.style.visibility = "hidden"; });
        const canvas = await html2canvas(el, { scale: 1.5, useCORS: true, allowTaint: true, backgroundColor: "#ffffff", logging: false, windowWidth: A4_W, windowHeight: A4_H });
        imgs.forEach(img => { img.style.visibility = ""; });
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH);
      }
      const label = selectedMois || new Date().toLocaleDateString("fr-FR").replace(/\//g, "-");
      pdf.save(`Factures_${label}.pdf`);
    } catch (err) {
      alert("Erreur lors de la génération du PDF : " + err.message);
    }
    setDownloading(false);
  }

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="px-4 py-6" style={{ maxWidth: A4_W + 64, margin: "0 auto" }}>
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="h-4 w-4" />Retour</button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{factures.length} facture(s)</span>
          <Button size="sm" className="gap-2 rounded-lg" onClick={handleDownloadPDF} disabled={downloading || factures.length === 0}><Download className="h-4 w-4" />{downloading ? "Génération..." : "Télécharger PDF"}</Button>
        </div>
      </div>
      <h1 className="text-xl font-bold text-foreground mb-4">Aperçu — Factures collectives</h1>
      {isRedownloadMode && (
        <div className="flex items-center gap-3 mb-6 bg-accent/40 rounded-xl px-4 py-3">
          <Calendar className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground">Sélectionner un mois :</span>
          <Select value={selectedMois} onValueChange={handleSelectMois}>
            <SelectTrigger className="w-44 rounded-lg h-9 text-sm"><SelectValue placeholder="Choisir un mois" /></SelectTrigger>
            <SelectContent>{allMois.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          {loadingMois && <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
        </div>
      )}
      <div className="space-y-8">
        {pages.map((pair, pageIdx) => (
          <div key={pageIdx} ref={el => (pagesRef.current[pageIdx] = el)} style={{ width: A4_W, height: A4_H, backgroundColor: "#fff", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", borderRadius: 4, overflow: "hidden", display: "flex", flexDirection: "column", margin: "0 auto" }}>
            {pair.map((facture, idx) => (
              <div key={facture.id} style={{ flex: 1, height: A4_H / 2, overflow: "hidden", borderBottom: idx === 0 && pair.length === 2 ? "2px dashed #d1d5db" : "none", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <FactureTemplate facture={facture} />
              </div>
            ))}
            {pair.length === 1 && <div style={{ flex: 1, height: A4_H / 2, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ fontSize: 10, color: "#d1d5db", fontStyle: "italic" }}>— page vide —</p></div>}
          </div>
        ))}
      </div>
      {factures.length === 0 && !loadingMois && <p className="text-center text-muted-foreground py-12">{isRedownloadMode && !selectedMois ? "Sélectionnez un mois pour afficher les factures." : "Aucune facture à afficher."}</p>}
    </div>
  );
}
