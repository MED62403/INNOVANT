import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, FileText, Plus, ArrowRight, Receipt, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [stats, setStats] = useState({ clients: 0, factures: 0, nonPayees: 0, totalRevenu: 0 });
  const [stocksCritiques, setStocksCritiques] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const [clients, factures, stocks] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.Facture.list(),
        base44.entities.Stock.list(),
      ]);
      const nonPayees = factures.filter(f => f.statut === "Non payé");
      const totalRevenu = factures.filter(f => f.statut === "Payé").reduce((sum, f) => sum + (f.montant_total || 0), 0);
      setStats({ clients: clients.length, factures: factures.length, nonPayees: nonPayees.length, totalRevenu });
      setStocksCritiques(stocks.filter(s => s.quantite <= s.seuil_critique));
      const depenses = await base44.entities.Depense.list();
      const moisSet = new Set([...factures.map(f => f.mois), ...depenses.map(d => d.mois)].filter(Boolean));
      const moisOrder = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
      const data = [...moisSet].sort((a, b) => {
        const [ma, ya] = [moisOrder.findIndex(m => a.startsWith(m)), parseInt(a.split(" ")[1])];
        const [mb, yb] = [moisOrder.findIndex(m => b.startsWith(m)), parseInt(b.split(" ")[1])];
        return ya !== yb ? ya - yb : ma - mb;
      }).map(mois => ({
        mois: mois.split(" ")[0].substring(0, 3),
        Revenus: factures.filter(f => f.mois === mois && f.statut === "Payé").reduce((s, f) => s + (f.montant_total || 0), 0),
        Dépenses: depenses.filter(d => d.mois === mois).reduce((s, d) => s + (d.montant || 0), 0),
      }));
      setChartData(data.slice(-6));
      setLoading(false);
    }
    loadStats();
  }, []);

  const formatGNF = (n) => new Intl.NumberFormat("fr-GN").format(n) + " GNF";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex flex-col items-center text-center mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Bienvenue sur <span className="text-primary">SANYA</span> <span className="text-secondary">SERVICES</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-sm max-w-md">Gérez vos clients et générez des factures en quelques clics.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-8">
          <StatCard icon={Users} label="Clients" value={stats.clients} color="primary" />
          <StatCard icon={FileText} label="Factures" value={stats.factures} color="primary" />
          <StatCard icon={Receipt} label="Non payées" value={stats.nonPayees} color="destructive" />
          <StatCard icon={ArrowRight} label="Revenus" value={formatGNF(stats.totalRevenu)} color="secondary" />
        </div>
      )}

      {chartData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-sm">
          <p className="text-sm font-semibold text-foreground mb-4">Revenus vs Dépenses (6 derniers mois)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000000 ? (v/1000000).toFixed(1)+"M" : v >= 1000 ? (v/1000).toFixed(0)+"k" : v} />
              <Tooltip formatter={(value) => new Intl.NumberFormat("fr-FR").format(value) + " GNF"} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Revenus" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
              <Bar dataKey="Dépenses" fill="hsl(var(--destructive))" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {stocksCritiques.length > 0 && (
        <Link to="/stocks">
          <div className="bg-orange-50 border border-orange-300 rounded-xl p-3 mb-6 flex items-start gap-3 hover:bg-orange-100 transition-colors">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-700">{stocksCritiques.length} produit(s) en stock critique !</p>
              <p className="text-xs text-orange-600 mt-0.5">{stocksCritiques.map(s => s.nom_produit).join(", ")}</p>
            </div>
          </div>
        </Link>
      )}

      <div className="space-y-3">
        <Link to="/clients/nouveau">
          <Button className="w-full h-14 text-base font-semibold gap-3 rounded-xl shadow-md" size="lg"><Plus className="h-5 w-5" />Ajouter un client</Button>
        </Link>
        <Link to="/factures/nouvelle">
          <Button variant="outline" className="w-full h-14 text-base font-semibold gap-3 rounded-xl border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground mt-3" size="lg"><FileText className="h-5 w-5" />Créer une facture</Button>
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-12 italic">
        "Merci pour votre confiance. Ensemble, construisons un environnement propre et sain !"
      </p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colorMap = { primary: "bg-primary/10 text-primary", secondary: "bg-secondary/10 text-secondary", destructive: "bg-destructive/10 text-destructive" };
  return (
    <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
      <div className={`inline-flex items-center justify-center h-9 w-9 rounded-lg ${colorMap[color]} mb-2`}><Icon className="h-4 w-4" /></div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
