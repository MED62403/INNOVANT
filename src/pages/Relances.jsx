import { useState, useEffect } from "react";
import { Mail, MessageCircle, AlertCircle, AlertTriangle, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function getEcheanceStatus(facture) {
  if (facture.statut === "Payé" || !facture.date_limite_paiement) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parts = facture.date_limite_paiement.split("/");
  const due = parts.length === 3
    ? new Date(+parts[2], +parts[1] - 1, +parts[0])
    : new Date(facture.date_limite_paiement);
  if (isNaN(due)) return null;
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { type: "overdue", days: Math.abs(diffDays), due };
  if (diffDays <= 5) return { type: "soon", days: diffDays, due };
  return null;
}

const formatGNF = (n) => new Intl.NumberFormat("fr-FR").format(n) + " GNF";

export default function Relances() {
  const [factures, setFactures] = useState([]);
  const [clients, setClients] = useState({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});
  const [sent, setSent] = useState({});

  useEffect(() => {
    async function load() {
      const [allFactures, allClients] = await Promise.all([
        base44.entities.Facture.list(),
        base44.entities.Client.list(),
      ]);
      const clientMap = {};
      allClients.forEach(c => { clientMap[c.id] = c; });
      setClients(clientMap);
      setFactures(allFactures);
      setLoading(false);
    }
    load();
  }, []);

  const toRelance = factures
    .map(f => ({ ...f, status: getEcheanceStatus(f) }))
    .filter(f => f.status !== null)
    .sort((a, b) => a.status.days - b.status.days);

  function buildMessage(facture) {
    const isOverdue = facture.status.type === "overdue";
    return isOverdue
      ? `Bonjour ${facture.nom_client},\n\nNous vous contactons au sujet de votre facture N° ${facture.numero_facture} d'un montant de ${formatGNF(facture.montant_total)}, dont la date limite de paiement (${facture.date_limite_paiement}) est dépassée depuis ${facture.status.days} jour(s).\n\nNous vous prions de bien vouloir régulariser votre situation dans les meilleurs délais.\n\n📞 +224 610 580 708 / 626 837 381\n✉ ongsanyaservice@gmail.com\n\nSANYA SERVICE — Kérouané, Guinée`
      : `Bonjour ${facture.nom_client},\n\nRappel : votre facture N° ${facture.numero_facture} de ${formatGNF(facture.montant_total)} arrive à échéance le ${facture.date_limite_paiement}${facture.status.days === 0 ? " (aujourd'hui)" : ` (dans ${facture.status.days} jour(s))`}.\n\nMerci de procéder au règlement avant cette date.\n\n📞 +224 610 580 708 / 626 837 381\n✉ ongsanyaservice@gmail.com\n\nSANYA SERVICE — Kérouané, Guinée`;
  }

  async function sendRelance(facture) {
    const client = clients[facture.client_id];
    const hasEmail = !!client?.email;
    const hasPhone = !!client?.telephone;

    if (!hasEmail && !hasPhone) {
      alert(`Aucun contact (e-mail ou téléphone) enregistré pour ${facture.nom_client}.`);
      return;
    }

    setSending(prev => ({ ...prev, [facture.id]: true }));
    const message = buildMessage(facture);
    const isOverdue = facture.status.type === "overdue";

    if (hasEmail) {
      const subject = isOverdue
        ? `[SANYA SERVICE] Relance — Facture ${facture.numero_facture} en retard`
        : `[SANYA SERVICE] Rappel — Facture ${facture.numero_facture} bientôt échue`;
      await base44.integrations.Core.SendEmail({ to: client.email, subject, body: message });
    }

    if (hasPhone) {
      const phone = client.telephone.replace(/[^0-9+]/g, "");
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    }

    setSending(prev => ({ ...prev, [facture.id]: false }));
    setSent(prev => ({ ...prev, [facture.id]: true }));
  }

  async function sendAll() {
    for (const facture of toRelance) {
      if (!sent[facture.id]) {
        await sendRelance(facture);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Relances clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {toRelance.length} facture(s) nécessitent une relance
          </p>
        </div>
        {toRelance.length > 0 && (
          <Button size="sm" className="gap-2 rounded-lg" onClick={sendAll}>
            <RefreshCw className="h-4 w-4" />
            Tout relancer
          </Button>
        )}
      </div>

      {toRelance.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
          <p className="font-semibold text-foreground">Aucune relance nécessaire</p>
          <p className="text-sm text-muted-foreground mt-1">Toutes les factures sont à jour.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {toRelance.map(facture => {
            const isOverdue = facture.status.type === "overdue";
            const client = clients[facture.client_id];

            return (
              <div
                key={facture.id}
                className={`bg-card rounded-xl border p-4 shadow-sm ${
                  isOverdue ? "border-red-300" : "border-orange-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isOverdue
                        ? <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                        : <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />}
                      <Badge variant={isOverdue ? "destructive" : "outline"} className="text-[10px]">
                        {isOverdue
                          ? `En retard de ${facture.status.days} j`
                          : facture.status.days === 0
                          ? "Échéance aujourd'hui"
                          : `Échéance dans ${facture.status.days} j`}
                      </Badge>
                    </div>
                    <p className="font-semibold text-foreground">{facture.nom_client}</p>
                    <p className="text-xs text-muted-foreground font-mono">{facture.numero_facture}</p>
                    <p className="text-sm font-bold text-primary mt-1">{formatGNF(facture.montant_total)}</p>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {client?.telephone && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                          <MessageCircle className="h-3 w-3" /> WhatsApp
                        </span>
                      )}
                      {client?.email && (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                          <Mail className="h-3 w-3" /> E-mail
                        </span>
                      )}
                      {!client?.telephone && !client?.email && (
                        <span className="text-xs text-destructive">⚠ Aucun contact enregistré</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={sent[facture.id] ? "outline" : "default"}
                    className="gap-2 rounded-lg shrink-0"
                    onClick={() => sendRelance(facture)}
                    disabled={sending[facture.id] || sent[facture.id]}
                  >
                    {sending[facture.id] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : sent[facture.id] ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    {sent[facture.id] ? "Envoyé" : "Relancer"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}