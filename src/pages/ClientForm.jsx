import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Plus, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const JOURS_SEMAINE = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const SERVICE_TYPES = [
  "Ramassage des ordures (poubelle)",
  "Nettoyage",
  "Désinfection",
  "Autre",
];

export default function ClientForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState({
    nom: "",
    adresse: "",
    telephone: "",
    email: "",
    type_service: "",
    prix_service: "",
    nombre_poubelles: "1",
    jours_collecte: [],
    frequence_nettoyage_semaine: "1",
    nb_agents_nettoyage: "1",
    produits_nettoyage: [],
  });
  const [nouveauProduit, setNouveauProduit] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      base44.entities.Client.get(id).then(client => {
        setForm({
          nom: client.nom || "",
          adresse: client.adresse || "",
          telephone: client.telephone || "",
          email: client.email || "",
          type_service: client.type_service || "",
          prix_service: client.prix_service?.toString() || "",
          nombre_poubelles: client.nombre_poubelles?.toString() || "1",
          jours_collecte: client.jours_collecte || [],
          frequence_nettoyage_semaine: client.frequence_nettoyage_semaine?.toString() || "1",
          nb_agents_nettoyage: client.nb_agents_nettoyage?.toString() || "1",
          produits_nettoyage: client.produits_nettoyage || [],
        });
        setLoading(false);
      });
    }
  }, [id, isEdit]);

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nom || !form.adresse || !form.type_service || !form.prix_service) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setSaving(true);
    const nbPoubelles = parseInt(form.nombre_poubelles) || 1;
    const data = {
      ...form,
      prix_service: parseFloat(form.prix_service),
      nombre_poubelles: nbPoubelles,
      frequence_nettoyage_semaine: parseInt(form.frequence_nettoyage_semaine) || 1,
      nb_agents_nettoyage: parseInt(form.nb_agents_nettoyage) || 1,
    };
    if (isEdit) {
      await base44.entities.Client.update(id, data);
      toast.success("Client modifié avec succès");
    } else {
      await base44.entities.Client.create(data);
      if (form.type_service === "Ramassage des ordures (poubelle)") {
        const stocks = await base44.entities.Stock.list();
        const poubelle = stocks.find(s => s.nom_produit.toLowerCase().includes("poubelle"));
        if (poubelle) {
          const newQte = Math.max(0, poubelle.quantite - nbPoubelles);
          await base44.entities.Stock.update(poubelle.id, { quantite: newQte });
          if (newQte <= poubelle.seuil_critique) {
            toast.warning(`⚠️ Stock de poubelles bas : ${newQte} restante(s)`);
          } else {
            toast.success(`${nbPoubelles} poubelle(s) déduite(s) du stock`);
          }
        }
      }
      toast.success("Client ajouté avec succès");
    }
    navigate("/clients");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

      <h1 className="text-xl font-bold text-foreground mb-6">
        {isEdit ? "Modifier le client" : "Nouveau client"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="nom">Nom du client *</Label>
          <Input id="nom" placeholder="Ex : Mafata CISSE" value={form.nom} onChange={e => updateField("nom", e.target.value)} className="mt-1.5 rounded-xl" />
        </div>
        <div>
          <Label htmlFor="adresse">Adresse (quartier / lieu) *</Label>
          <Input id="adresse" placeholder="Ex : Nasser Marché" value={form.adresse} onChange={e => updateField("adresse", e.target.value)} className="mt-1.5 rounded-xl" />
        </div>
        <div>
          <Label htmlFor="telephone">Numéro de téléphone</Label>
          <Input id="telephone" placeholder="Ex : +224 6XX XXX XXX" value={form.telephone} onChange={e => updateField("telephone", e.target.value)} className="mt-1.5 rounded-xl" />
        </div>
        <div>
          <Label htmlFor="email">Adresse e-mail</Label>
          <Input id="email" type="email" placeholder="Ex : client@email.com" value={form.email} onChange={e => updateField("email", e.target.value)} className="mt-1.5 rounded-xl" />
        </div>
        <div>
          <Label>Type de service *</Label>
          <Select value={form.type_service} onValueChange={v => updateField("type_service", v)}>
            <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Sélectionner le service" /></SelectTrigger>
            <SelectContent>{SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {form.type_service === "Ramassage des ordures (poubelle)" && (
          <>
            <div>
              <Label htmlFor="poubelles">Nombre de poubelles attribuées *</Label>
              <Input id="poubelles" type="number" min="1" placeholder="Ex : 2" value={form.nombre_poubelles} onChange={e => updateField("nombre_poubelles", e.target.value)} className="mt-1.5 rounded-xl" />
              <p className="text-xs text-muted-foreground mt-1">Ce nombre sera automatiquement déduit du stock de poubelles.</p>
            </div>
            <div>
              <Label>Jours de collecte dans la semaine *</Label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {JOURS_SEMAINE.map(jour => {
                  const checked = form.jours_collecte.includes(jour);
                  return (
                    <button key={jour} type="button" onClick={() => { const next = checked ? form.jours_collecte.filter(j => j !== jour) : [...form.jours_collecte, jour]; updateField("jours_collecte", next); }}
                      className={`py-2 rounded-xl border-2 text-xs font-semibold transition-all ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}>
                      {jour.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{form.jours_collecte.length} jour(s) sélectionné(s)</p>
            </div>
          </>
        )}
        {form.type_service === "Nettoyage" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fréquence (fois/semaine)</Label>
                <Input type="number" min="1" max="7" value={form.frequence_nettoyage_semaine} onChange={e => updateField("frequence_nettoyage_semaine", e.target.value)} className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label>Nombre d'agents</Label>
                <Input type="number" min="1" value={form.nb_agents_nettoyage} onChange={e => updateField("nb_agents_nettoyage", e.target.value)} className="mt-1.5 rounded-xl" />
              </div>
            </div>
            <div>
              <Label>Produits de nettoyage requis sur ce site</Label>
              <div className="flex gap-2 mt-1.5">
                <Input placeholder="Ex: Javel, Désinfectant..." value={nouveauProduit} onChange={e => setNouveauProduit(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (nouveauProduit.trim()) { updateField("produits_nettoyage", [...form.produits_nettoyage, nouveauProduit.trim()]); setNouveauProduit(""); } } }} className="rounded-xl" />
                <Button type="button" variant="outline" size="icon" onClick={() => { if (nouveauProduit.trim()) { updateField("produits_nettoyage", [...form.produits_nettoyage, nouveauProduit.trim()]); setNouveauProduit(""); } }} className="rounded-xl shrink-0"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.produits_nettoyage.map((p, i) => (
                  <span key={i} className="flex items-center gap-1 text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full">
                    {p}
                    <button type="button" onClick={() => updateField("produits_nettoyage", form.produits_nettoyage.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
        <div>
          <Label htmlFor="prix">Prix unitaire (GNF) *</Label>
          <Input id="prix" type="number" placeholder="Ex : 50000" value={form.prix_service} onChange={e => updateField("prix_service", e.target.value)} className="mt-1.5 rounded-xl" />
        </div>
        <Button type="submit" disabled={saving} className="w-full h-12 rounded-xl text-base font-semibold gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Enregistrement..." : isEdit ? "Enregistrer les modifications" : "Ajouter le client"}
        </Button>
      </form>
    </div>
  );
}
