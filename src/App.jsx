import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './components/LoginPage';
import ResetPassword from './pages/ResetPassword';

import Dashboard from './pages/Dashboard';
import ClientsList from './pages/ClientsList';
import ClientForm from './pages/ClientForm';
import FacturesList from './pages/FacturesList';
import FactureForm from './pages/FactureForm';
import FactureView from './pages/FactureView';
import FacturesCollective from './pages/FacturesCollective';
import HistoriqueFactures from './pages/HistoriqueFactures';
import Relances from './pages/Relances';
import Depenses from './pages/Depenses';
import Stocks from './pages/Stocks';
import Personnel from './pages/Personnel';
import RapportMensuel from './pages/RapportMensuel';
import CRM from './pages/CRM';
import DevisListe from './pages/DevisListe';
import DevisForm from './pages/DevisForm';
import DevisView from './pages/DevisView';
import ServiceBibliotheque from './pages/ServiceBibliotheque';
import PaiementsFacture from './pages/PaiementsFacture';
import Utilisateurs from './pages/Utilisateurs';
import Backup from './pages/Backup';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
          <span className="text-white text-2xl font-bold">S</span>
        </div>
        <p className="font-bold text-xl text-foreground">SANYA SERVICES</p>
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<ClientsList />} />
        <Route path="/clients/nouveau" element={<ClientForm />} />
        <Route path="/clients/modifier/:id" element={<ClientForm />} />
        <Route path="/factures" element={<FacturesList />} />
        <Route path="/factures/nouvelle" element={<FactureForm />} />
        <Route path="/factures/collective" element={<FacturesCollective />} />
        <Route path="/historique" element={<HistoriqueFactures />} />
        <Route path="/relances" element={<Relances />} />
        <Route path="/depenses" element={<Depenses />} />
        <Route path="/stocks" element={<Stocks />} />
        <Route path="/personnel" element={<Personnel />} />
        <Route path="/rapport" element={<RapportMensuel />} />
        <Route path="/crm" element={<CRM />} />
        <Route path="/devis" element={<DevisListe />} />
        <Route path="/devis/nouveau" element={<DevisForm />} />
        <Route path="/devis/:id" element={<DevisView />} />
        <Route path="/services" element={<ServiceBibliotheque />} />
        <Route path="/factures/:id/paiements" element={<PaiementsFacture />} />
        <Route path="/factures/:id" element={<FactureView />} />
        <Route path="/utilisateurs" element={<Utilisateurs />} />
        <Route path="/backup" element={<Backup />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
