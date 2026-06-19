import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Home, Users, FileText, History, Bell, TrendingDown,
  Package, UserCheck, BarChart2, HeartHandshake,
  ClipboardList, BookMarked, Menu, X,
  LayoutDashboard, HardDrive, UserCog, LogOut, KeyRound,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { SUPERADMIN_EMAIL, hasPermission, normalizeRole } from "@/lib/permissions";
import ChangePasswordModal from "@/components/auth/ChangePasswordModal";

const NAV_GROUPS = [
  {
    label: null,
    items: [{ to: "/", icon: LayoutDashboard, label: "Tableau de bord" }],
  },
  {
    label: "Clients & Relations",
    items: [
      { to: "/clients",  icon: Users,         label: "Clients" },
      { to: "/crm",      icon: HeartHandshake, label: "CRM" },
      { to: "/relances", icon: Bell,           label: "Relances" },
    ],
  },
  {
    label: "Facturation & Devis",
    items: [
      { to: "/factures",  icon: FileText,     label: "Factures" },
      { to: "/devis",     icon: ClipboardList, label: "Devis" },
      { to: "/historique",icon: History,       label: "Historique" },
      { to: "/services",  icon: BookMarked,    label: "Bibliothèque" },
    ],
  },
  {
    label: "Finance & Analyse",
    items: [
      { to: "/depenses", icon: TrendingDown, label: "Dépenses" },
      { to: "/rapport",  icon: BarChart2,    label: "Rapport mensuel" },
    ],
  },
  {
    label: "Opérations",
    items: [
      { to: "/stocks",    icon: Package,    label: "Stocks" },
      { to: "/personnel", icon: UserCheck,  label: "Personnel" },
    ],
  },
];

const MOBILE_NAV = [
  { to: "/",        icon: Home,          label: "Accueil" },
  { to: "/clients", icon: Users,         label: "Clients" },
  { to: "/factures",icon: FileText,      label: "Factures" },
  { to: "/devis",   icon: ClipboardList, label: "Devis" },
  { to: "/rapport", icon: BarChart2,     label: "Rapport" },
];

function NavItem({ to, icon: Icon, label, onClick }) {
  const { pathname } = useLocation();
  const active = pathname === to || (to !== "/" && pathname.startsWith(to));

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 group ${
        active
          ? "bg-sidebar-accent text-sidebar-foreground font-semibold"
          : "text-sidebar-foreground/55 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-sidebar-primary rounded-full" />
      )}
      <Icon className={`h-[15px] w-[15px] shrink-0 ${active ? "text-sidebar-primary" : "group-hover:text-sidebar-foreground/80"}`} />
      <span className="truncate">{label}</span>
      {active && <ChevronRight className="h-3 w-3 ml-auto text-sidebar-primary/60" />}
    </Link>
  );
}

function Sidebar({ onClose, user, onChangePwd, onLogout }) {
  const isSuperAdmin = user?.email === SUPERADMIN_EMAIL;
  const role = normalizeRole(user?.role);
  const canManageUsers = isSuperAdmin || role === "Admin";
  const initial = (user?.full_name || user?.email || "?")[0].toUpperCase();
  const displayName = user?.full_name || user?.email || "—";
  const displayRole = isSuperAdmin ? "Super Administrateur" : (user?.role || "Coordinateur");

  return (
    <aside className="flex flex-col h-full bg-sidebar select-none">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border/40">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/15 shrink-0">
          <span className="text-emerald-400 font-bold text-sm leading-none">S</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-sidebar-foreground tracking-tight leading-tight">
            SANYA SERVICES
          </p>
          <p className="text-[10px] text-sidebar-foreground/35 mt-0.5">Kérouané · Guinée</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md text-sidebar-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-sidebar-foreground/30 px-3 mb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavItem key={item.to} {...item} onClick={onClose} />
              ))}
            </div>
          </div>
        ))}

        {canManageUsers && (
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-sidebar-foreground/30 px-3 mb-1.5">
              Administration
            </p>
            <div className="space-y-0.5">
              <NavItem to="/utilisateurs" icon={UserCog} label="Utilisateurs" onClick={onClose} />
              {isSuperAdmin && (
                <NavItem to="/backup" icon={HardDrive} label="Sauvegarde" onClick={onClose} />
              )}
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border/40 p-3 space-y-1">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-sidebar-accent/40 mb-2">
          <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
            <span className="text-emerald-400 text-xs font-bold">{initial}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-sidebar-foreground truncate leading-tight">
              {displayName}
            </p>
            <p className="text-[9px] text-sidebar-foreground/40 truncate mt-0.5">{displayRole}</p>
          </div>
        </div>
        <button
          onClick={onChangePwd}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
        >
          <KeyRound className="h-3.5 w-3.5" />
          Changer le mot de passe
        </button>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[11px] text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}

export default function Layout({ user, children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const { logout } = useAuth();
  const { pathname } = useLocation();

  function handleLogout() {
    logout();
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden md:flex w-56 shrink-0 flex-col fixed inset-y-0 left-0 z-30 shadow-xl">
        <Sidebar
          user={user}
          onChangePwd={() => setShowChangePwd(true)}
          onLogout={handleLogout}
        />
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 h-full shadow-2xl">
            <Sidebar
              onClose={() => setMobileMenuOpen(false)}
              user={user}
              onChangePwd={() => { setShowChangePwd(true); setMobileMenuOpen(false); }}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}

      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        <header className="md:hidden sticky top-0 z-20 flex items-center gap-3 px-4 h-14 bg-card/95 backdrop-blur border-b border-border shadow-sm">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="text-sm font-bold text-foreground tracking-tight">SANYA SERVICES</span>
          </div>
        </header>

        <main className="flex-1 pb-20 md:pb-6">
          {children || <Outlet />}
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-border shadow-lg z-20">
          <div className="flex items-stretch justify-around px-1 py-1">
            {MOBILE_NAV.map(({ to, icon: Icon, label }) => {
              const active = pathname === to || (to !== "/" && pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-0 ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? "stroke-[2.2]" : ""}`} />
                  <span className="text-[9px] font-medium">{label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-muted-foreground"
            >
              <Menu className="h-5 w-5" />
              <span className="text-[9px] font-medium">Plus</span>
            </button>
          </div>
        </nav>
      </div>

      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
    </div>
  );
}