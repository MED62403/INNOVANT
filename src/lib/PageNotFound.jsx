import { Link, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PageNotFound() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="text-center space-y-5 max-w-sm">
        <p className="text-7xl font-light text-border">404</p>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Page introuvable</h2>
          <p className="text-sm text-muted-foreground mt-1">
            La page <span className="font-medium text-foreground">"{pathname}"</span> n'existe pas.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/" className="gap-2">
            <Home className="h-4 w-4" />
            Retour au tableau de bord
          </Link>
        </Button>
      </div>
    </div>
  );
}
