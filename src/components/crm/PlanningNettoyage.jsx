import { useState } from "react";
import { CheckCircle2, Circle, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const jourActuel = () => {
  const idx = new Date().getDay();
  const map = [6, 0, 1, 2, 3, 4, 5];
  return JOURS[map[idx]];
};

export default function PlanningNettoyage({ clients, interventions, onRefresh }) {
  const [selectedJour, setSelectedJour] = useState(jourActuel());
  const [coches, setCoches] = useState({});
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const clientsJour = clients.filter(c =>
    c.jours_nettoyage && c.jours_nettoyage.includes(selectedJour)
  );

  const dejaPasses = new Set(
    interventions
      .filter(i => i.date === today && i.type_intervention === "Nettoyage")
      .map(i => i.client_id)
  );

  function toggleCoche(clientId) {
    setCoches(prev => ({ ...prev, [clientId]: !prev[clientId] }));
  }

  async function validerPassages() {
    setSaving(true);
    const aValider = clientsJour.filter(c => coches[c.id] && !dejaPasses.has(c.id));
    await Promise.all(aValider.map(c =>
      base44.entities.Intervention.create({
        client_id: c.id,
        nom_client: c.nom,
        type_intervention: "Nettoyage",
        date: today,
        jour_semaine: selectedJour,
        statut: "Réalisée",
        description: `Nettoyage du ${today} — ${selectedJour}`,
      })
    ));
    setCoches({});
    setSaving(false);
    onRefresh();
  }

  const nbCoches = Object.values(coches).filter(Boolean).length;

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-5">
        {JOURS.map(jour => {
          const count = clients.filter(c => c.jours_nettoyage?.includes(jour)).length;
          const isToday = jour === jourActuel();
          const isSelected = jour === selectedJour;
          return (
            <button
              key={jour}
              onClick={() => setSelectedJour(jour)}
              className={`flex flex-col items-center py-2.5 rounded-xl border-2 transition-all text-center ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                  : isToday
                  ? "border-primary/40 bg-accent"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <span className="text-[9px] font-bold uppercase tracking-wide">{jour.slice(0, 3)}</span>
              <span className={`text-lg font-bold mt-0.5 ${isSelected ? "" : "text-primary"}`}>{count}</span>
              <span className="text-[8px] opacity-70">client{count > 1 ? "s" : ""}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-foreground">{selectedJour}</h3>
          <p className="text-xs text-muted-foreground">{clientsJour.length} client(s) à nettoyer</p>
        </div>
        {nbCoches > 0 && (
          <Button size="sm" className="gap-1.5 rounded-lg" onClick={validerPassages} disabled={saving}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            {saving ? "Enregistrement..." : `Valider ${nbCoches} passage(s)`}
          </Button>
        )}
      </div>

      {clientsJour.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucun client planifié ce jour.</p>
          <p className="text-xs mt-1">Ajoutez des jours de nettoyage dans la fiche client.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clientsJour.map(client => {
            const dejaPasse = dejaPasses.has(client.id);
            const coche = coches[client.id] || dejaPasse;
            return (
              <button
                key={client.id}
                onClick={() => !dejaPasse && toggleCoche(client.id)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                  dejaPasse
                    ? "border-green-300 bg-green-50 cursor-default"
                    : coche
                    ? "border-primary bg-accent"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                {dejaPasse ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                ) : coche ? (
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{client.nom}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {client.adresse} · {client.type_client || "Client"}
                  </p>
                </div>
                {dejaPasse && (
                  <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full shrink-0">
                    ✓ Fait
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
