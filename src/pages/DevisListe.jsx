import { useState, useEffect } from "react";
import { Plus, Eye, Trash2, FileText, CheckCircle, XCircle, Clock, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const formatGNF = n => new Intl.NumberFormat("fr-FR").format(n || 0) + " GNF";
const STATUT_STYLE = { "Brouillon": "bg-gray-100 text-gray-700", "Envoyé": "bg-blue-100 text-blue-700", "Accepté": "bg-green-100 text-green-700", "Refusé": "bg-red-100 text-red-700", "Converti": "bg-purple-100 text-purple-700" };
const STATUT_ICON = { "Brouillon": Clock, "Envoyé": Send, "Accepté": CheckCircle, "Refusé": XCircle, "Converti": FileText };

export default function DevisListe() {
  const [devis, setDevis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  async function load() {
    const d = await base44.entities.Devis.list("-date_devis");
    setDevis(d); setLoading(false);
  }

  async function handleDelete() {
    await base44.entities.Devis.delete(deleteId);
    setDeleteId(null); load();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">Devis</h1>
        <Button size="sm" className="gap-2 rounded-lg" onClick={() => navigate("/devis/nouveau")}><Plus className="h-4 w-4" /> Nouveau devis</Button>
      </div>
      {loading ? <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
        : devis.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucun devis créé.</p>
            <Button className="mt-4 rounded-xl" onClick={() => navigate("/devis/nouveau")}>Créer le premier devis</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {devis.map(d => {
              const Icon = STATUT_ICON[d.statut] || Clock;
              return (
                <div key={d.id} className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-foreground text-sm">{d.numero_devis}</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUT_STYLE[d.statut]}`}><Icon className="h-3 w-3" />{d.statut}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{d.nom_client}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{d.date_devis}</span>
                      <span className="font-semibold text-foreground">{formatGNF(d.montant_total)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/devis/${d.id}`)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(d.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer ce devis ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
