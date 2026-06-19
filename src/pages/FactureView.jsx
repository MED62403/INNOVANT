import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import FactureTemplate from "../components/FactureTemplate";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function FactureView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [facture, setFacture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef();

  useEffect(() => { base44.entities.Facture.get(id).then(data => { setFacture(data); setLoading(false); }); }, [id]);

  async function handleDownloadPDF() {
    setDownloading(true);
    const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Facture_${facture.numero_facture}_${facture.nom_client}.pdf`);
    setDownloading(false);
  }

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="h-4 w-4" />Retour</button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 rounded-lg" onClick={() => window.print()}><Printer className="h-4 w-4" /><span className="hidden sm:inline">Imprimer</span></Button>
          <Button size="sm" className="gap-2 rounded-lg" onClick={handleDownloadPDF} disabled={downloading}><Download className="h-4 w-4" />{downloading ? "..." : "PDF"}</Button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-border" ref={printRef}>
        <FactureTemplate facture={facture} />
      </div>
    </div>
  );
}
