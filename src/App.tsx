import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from 'react';
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Portfolio from "./pages/Portfolio";
import Sobre from "./pages/Sobre";
import Termos from "./pages/Termos";
import Privacidade from "./pages/Privacidade";
import NotFound from "./pages/NotFound";
import EspacoEntrada from "./pages/espaco-do-cliente/Entrada";
import EspacoQuestionario from "./pages/espaco-do-cliente/Questionario";
import EspacoCadastro from "./pages/espaco-do-cliente/Cadastro";
import EspacoLogin from "./pages/espaco-do-cliente/Login";
import EspacoRecuperarSenha from "./pages/espaco-do-cliente/RecuperarSenha";
import EspacoRedefinirSenha from "./pages/espaco-do-cliente/RedefinirSenha";
import EspacoDashboard from "./pages/espaco-do-cliente/Dashboard";
import EspacoAdmin from "./pages/espaco-do-cliente/Admin";
import { RequireAuth, RequireAdmin } from "./pages/espaco-do-cliente/guards";

const queryClient = new QueryClient();

const DocumentTitleManager = () => {
  const location = useLocation();
  let title = 'Codifica';
  if (location.pathname === '/portfolio') title = 'Codifica - Projetos';
  else if (location.pathname === '/sobre') title = 'Codifica - Sobre';
  else if (location.pathname === '/termos') title = 'Codifica - Termos de Uso';
  else if (location.pathname === '/privacidade') title = 'Codifica - Política de Privacidade';
  else if (location.pathname.startsWith('/espaco-do-cliente/admin')) title = 'Codifica - Painel Admin';
  else if (location.pathname.startsWith('/espaco-do-cliente/painel')) title = 'Codifica - Meu Espaço';
  else if (location.pathname.startsWith('/espaco-do-cliente/questionario')) title = 'Codifica - Novo Projeto';
  else if (location.pathname.startsWith('/espaco-do-cliente/cadastro')) title = 'Codifica - Criar Conta';
  else if (location.pathname.startsWith('/espaco-do-cliente/login')) title = 'Codifica - Entrar';
  else if (location.pathname.startsWith('/espaco-do-cliente/recuperar-senha')) title = 'Codifica - Recuperar Senha';
  else if (location.pathname.startsWith('/espaco-do-cliente/redefinir-senha')) title = 'Codifica - Redefinir Senha';
  else if (location.pathname.startsWith('/espaco-do-cliente')) title = 'Codifica - Espaço do Cliente';
  else if (location.pathname !== '/') title = 'Codifica';

  if (typeof document !== 'undefined') {
    document.title = title;
  }
  return null;
};

const ScrollToTop = () => {
  const location = useLocation();
  useEffect(() => {
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
        <AuthProvider>
          <DocumentTitleManager />
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/sobre" element={<Sobre />} />
            <Route path="/termos" element={<Termos />} />
            <Route path="/privacidade" element={<Privacidade />} />
            <Route path="/espaco-do-cliente" element={<EspacoEntrada />} />
            <Route path="/espaco-do-cliente/questionario" element={<EspacoQuestionario />} />
            <Route path="/espaco-do-cliente/cadastro" element={<EspacoCadastro />} />
            <Route path="/espaco-do-cliente/login" element={<EspacoLogin />} />
            <Route path="/espaco-do-cliente/recuperar-senha" element={<EspacoRecuperarSenha />} />
            <Route path="/espaco-do-cliente/redefinir-senha" element={<EspacoRedefinirSenha />} />
            <Route
              path="/espaco-do-cliente/painel"
              element={
                <RequireAuth>
                  <EspacoDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/espaco-do-cliente/admin"
              element={
                <RequireAdmin>
                  <EspacoAdmin />
                </RequireAdmin>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
