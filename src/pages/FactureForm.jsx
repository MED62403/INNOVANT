import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Users, User } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import moment from "moment";

const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

export default function FactureForm() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedClientId = urlParams.get("client");
  const [mode, setMode] = useState("individuelle");
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(preselectedClientId || "");
  const [moisIndex, setMoisIndex] = useState(new Date().getMonth());
  const [annee, setAnnee] = useState(new Date().getFullYear().toString());
  const [dateLimite, setDateLimite] = useState("");

  useEffect(() => { base44.entities.Client.list().then(data => { setClients(data); setLoading(false); }); }, []);
  useEffect(() => {
    const year = parseInt(annee);
    const lastDay = new Date(year, moisIndex + 1, 0).getDate();
    setDateLimite(`${lastDay}/${String(moisIndex + 1).padStart(2, "0")}/${year}`);
  }, [moisIndex, annee]);

  function buildFactureData(client, numero) {
    const qty = client.nombre_poubelles || 1;
    const total = client.prix_service * qty;
    const moisLabel = `${MOIS[moisIndex]} ${annee}`;
    const today = moment().format("DD/MM/YYYY");
    return { numero_facture: numero, client_id: client.id, nom_client: client.nom, adresse_client: client.adresse, mois: moisLabel, date_facturation: today, periode_service: moisLabel, description_service: client.type_service, quantite: qty, prix_unitaire: client.prix_service, montant_total: total, date_limite_paiement: dateLimite, statut: "Non payé" };
  }

  async function handleSubmitIndividuelle(e) {
    e.preventDefault();
    if (!selectedClientId) { toast.error("Veuillez sélectionner un client"); return; }
    setSaving(true);
    const client = clients.find(c => c.id === selectedClientId);
    const numero = `SS-${Date.now().toString().slice(-6)}`;
    const created = await base44.entities.Facture.create(buildFactureData(client, numero));
    toast.success("Facture créée avec succès");
    navigate(`/factures/${created.id}`);
  }

  async function handleSubmitCollective(e) {
    e.preventDefault();
    if (clients.length === 0) { toast.error("Aucun client enregistré"); return; }
    setSaving(true);
    const base = Date.now();
    const created = await Promise.all(clients.map((client, i) => { const numero = `SS-${(base + i).toString().slice(-6)}`; return base44.entities.Facture.create(buildFactureData(client, numero)); }));
    toast.success(`${created.length} factures créées`);
    const ids = created.map(f => f.id).join(",");
    navigate(`/factures/collective?ids=${ids}`);
  }

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const formatGNF = (n) => new Intl.NumberFormat("fr-FR").format(n) + " GNF";

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"><ArrowLeft className="h-4 w-4" />Retour</button>
      <h1 className="text-xl font-bold text-foreground mb-6">Nouvelle facture</h1>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button type="button" onClick={() => setMode("individuelle")} className={`flex items-center gap-2 justify-center rounded-xl border-2 p-3 text-sm font-semibold transition-all ${mode === "individuelle" ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}><User className="h-4 w-4" />Individuelle</button>
        <button type="button" onClick={() => setMode("collective")} className={`flex items-center gap-2 justify-center rounded-xl border-2 p-3 text-sm font-semibold transition-all ${mode === "collective" ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}><Users className="h-4 w-4" />Collective</button>
      </div>
      {clients.length === 0 ? (
        <div className="text-center py-12"><p className="text-muted-foreground mb-4">Ajoutez d'abord un client avant de créer une facture.</p><Button onClick={() => navigate("/clients/nouveau")} variant="outline">Ajouter un client</Button></div>
      ) : (
        <form onSubmit={mode === "individuelle" ? handleSubmitIndividuelle : handleSubmitCollective} className="space-y-5">
          {mode === "individuelle" && (
            <>
              <div>
                <Label>Client *</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.nom} — {c.adresse}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {selectedClient && (
                <div className="bg-accent/50 rounded-xl p-3 text-sm space-y-1">
                  <p><strong>Service :</strong> {selectedClient.type_service}</p>
                  <p><strong>Poubelles :</strong> {selectedClient.nombre_poubelles || 1}</p>
                  <p><strong>Prix unitaire :</strong> {formatGNF(selectedClient.prix_service)}</p>
                  <p><strong>Total :</strong> {formatGNF(selectedClient.prix_service * (selectedClient.nombre_poubelles || 1))}</p>
                </div>
              )}
            </>
          )}
          {mode === "collective" && (
            <div className="bg-accent/50 rounded-xl p-4 text-sm">
              <p className="font-semibold text-foreground mb-1">Facturation collective</p>
              <p className="text-muted-foreground">Une facture sera générée pour chacun des <strong>{clients.length} clients</strong> enregistrés.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Mois *</Label>
              <Select value={moisIndex.toString()} onValueChange={v => setMoisIndex(parseInt(v))}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{MOIS.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="annee">Année *</Label><Input id="annee" type="number" value={annee} onChange={e => setAnnee(e.target.value)} className="mt-1.5 rounded-xl" /></div>
          </div>
          <div><Label htmlFor="dateLimite">Date limite de paiement</Label><Input id="dateLimite" value={dateLimite} onChange={e => setDateLimite(e.target.value)} className="mt-1.5 rounded-xl" placeholder="JJ/MM/AAAA" /></div>
          <Button type="submit" disabled={saving} className="w-full h-12 rounded-xl text-base font-semibold gap-2">
            <FileText className="h-4 w-4" />
            {saving ? "Génération..." : mode === "collective" ? `Générer ${clients.length} factures` : "Générer la facture"}
          </Button>
        </form>
      )}
    </div>
  );
}
