import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, MapPin, Phone, Trash2, Edit, FileText, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function ClientsList() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef();

  useEffect(() => { loadClients(); }, []);

  async function loadClients() {
    const data = await base44.entities.Client.list("-created_date");
    setClients(data);
    setLoading(false);
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url, json_schema: { type: "object", properties: { clients: { type: "array", items: { type: "object", properties: { nom: { type: "string" }, adresse: { type: "string" }, telephone: { type: "string" }, type_service: { type: "string" }, nombre_poubelles: { type: "number" }, prix_service: { type: "number" } } } } } } });
      let rows = [];
      if (result.status === "success") {
        if (Array.isArray(result.output)) rows = result.output;
        else if (result.output?.clients) rows = result.output.clients;
        else if (Array.isArray(result.output?.output)) rows = result.output.output;
      }
      const toCreate = rows.filter(c => c.nom && c.adresse).map(c => ({ nom: c.nom, adresse: c.adresse, telephone: c.telephone || "", type_service: c.type_service || "Ramassage des ordures (poubelle)", nombre_poubelles: Number(c.nombre_poubelles) || 1, prix_service: Number(c.prix_service) || 0 }));
      if (toCreate.length > 0) {
        await base44.entities.Client.bulkCreate(toCreate);
        setImportResult({ success: true, count: toCreate.length });
        loadClients();
      } else {
        setImportResult({ success: false, message: "Aucun client valide trouvé dans le fichier." });
      }
    } catch (err) {
      setImportResult({ success: false, message: "Erreur lors de l'importation : " + (err?.message || err) });
    }
    setImporting(false);
    e.target.value = "";
  }

  async function handleDelete() {
    await base44.entities.Client.delete(deleteId);
    setDeleteId(null);
    loadClients();
  }

  const filtered = clients.filter(c => c.nom.toLowerCase().includes(search.toLowerCase()) || c.adresse.toLowerCase().includes(search.toLowerCase()));
  const formatGNF = (n) => new Intl.NumberFormat("fr-GN").format(n) + " GNF";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">Clients</h1>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          <Button size="sm" variant="outline" className="gap-2 rounded-lg" disabled={importing} onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">{importing ? "Import..." : "Importer"}</span>
          </Button>
          <Link to="/clients/nouveau">
            <Button size="sm" className="gap-2 rounded-lg"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Ajouter</span></Button>
          </Link>
        </div>
      </div>

      {importing && <div className="flex items-center gap-3 bg-accent/50 rounded-xl px-4 py-3 mb-4 text-sm"><div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /><span className="text-muted-foreground">Importation en cours...</span></div>}
      {importResult && (
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 mb-4 text-sm ${importResult.success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {importResult.success ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{importResult.success ? `${importResult.count} client(s) importé(s) avec succès !` : importResult.message}</span>
          <button onClick={() => setImportResult(null)} className="ml-auto text-xs underline">Fermer</button>
        </div>
      )}

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher un client..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl bg-card" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">{search ? "Aucun client trouvé" : "Aucun client enregistré"}</p>
          {!search && <Link to="/clients/nouveau"><Button variant="outline" className="gap-2"><Plus className="h-4 w-4" />Ajouter votre premier client</Button></Link>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(client => (
            <div key={client.id} className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{client.nom}</h3>
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{client.adresse}</span></div>
                  {client.telephone && <div className="flex items-center gap-1.5 mt-0.5 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5 shrink-0" /><span>{client.telephone}</span></div>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">{client.type_service}</span>
                    <span className="text-xs font-semibold text-primary">{formatGNF(client.prix_service)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Link to={`/factures/nouvelle?client=${client.id}`}><Button variant="ghost" size="icon" className="h-8 w-8 text-primary"><FileText className="h-4 w-4" /></Button></Link>
                  <Link to={`/clients/modifier/${client.id}`}><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Edit className="h-4 w-4" /></Button></Link>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(client.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible. Le client sera définitivement supprimé.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
