import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from 'react';
import Index from "./pages/Index";
import Portfolio from "./pages/Portfolio";
import Sobre from "./pages/Sobre";
import Termos from "./pages/Termos";
import Privacidade from "./pages/Privacidade";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const DocumentTitleManager = () => {
  const location = useLocation();
  // Define mapping
  let title = 'Codifica';
  if (location.pathname === '/portfolio') title = 'Codifica - Projetos';
  else if (location.pathname === '/sobre') title = 'Codifica - Sobre';
  else if (location.pathname === '/termos') title = 'Codifica - Termos de Uso';
  else if (location.pathname === '/privacidade') title = 'Codifica - Política de Privacidade';
  else if (location.pathname !== '/') title = 'Codifica';

  // Update on path change
  if (typeof document !== 'undefined') {
    document.title = title;
  }
  return null;
};

const ScrollToTop = () => {
  const location = useLocation();
  useEffect(() => {
    // evita interferir quando voltamos com state target contact (Index já trata)
    if (!(location.state && (location.state as any).target === 'contact')) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [location.pathname]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
  <DocumentTitleManager />
  <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/termos" element={<Termos />} />
          <Route path="/privacidade" element={<Privacidade />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
