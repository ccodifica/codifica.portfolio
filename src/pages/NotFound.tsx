import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero">
      <div className="text-center px-4">
        <div className="max-w-md mx-auto">
          {/* 404 Number */}
          <h1 className="text-8xl md:text-9xl font-bold hero-text mb-4">
            404
          </h1>
          
          {/* Main Message */}
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
            Página não encontrada
          </h2>
          
          {/* Description */}
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Oops! A página que você está procurando não existe ou foi movida para outro local.
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/">
              <Button className="btn-hero group w-full sm:w-auto">
                <Home className="w-4 h-4 mr-2" />
                Voltar ao Início
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="btn-outline-glow w-full sm:w-auto"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Página Anterior
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;