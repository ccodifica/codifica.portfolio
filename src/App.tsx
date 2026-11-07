import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from 'react';
import { AuthProvider } from "@/contexts/AuthContext";
import { ROTAS } from "@/config/rotas";
import Consentimento from "./components/Consentimento";
import { RequireAuth, RequireAdmin } from "./pages/espaco-do-cliente/guards";
// Páginas de entrada (home e oferta do anúncio) carregam direto; o resto só quando abrir
import Index from "./pages/Index";
import PresencaGoogle from "./pages/PresencaGoogle";

// Páginas públicas: baixadas em segundo plano logo depois que o site abre,
// para a troca de página não ter tela vazia esperando o código.
const paginasPublicas = {
  portfolio: () => import("./pages/Portfolio"),
  sobre: () => import("./pages/Sobre"),
  comoFunciona: () => import("./pages/ComoFunciona"),
  contrato: () => import("./pages/Contrato"),
  comecar: () => import("./pages/Comecar"),
  pedido: () => import("./pages/Pedido"),
  entrar: () => import("./pages/Entrar"),
};

const Portfolio = lazy(paginasPublicas.portfolio);
const Sobre = lazy(paginasPublicas.sobre);
const ComoFunciona = lazy(paginasPublicas.comoFunciona);
const Contrato = lazy(paginasPublicas.contrato);
const Comecar = lazy(paginasPublicas.comecar);
const Pedido = lazy(paginasPublicas.pedido);
const Entrar = lazy(paginasPublicas.entrar);
const Termos = lazy(() => import("./pages/Termos"));
const Privacidade = lazy(() => import("./pages/Privacidade"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MinhaArea = lazy(() => import("./pages/MinhaArea"));
const EspacoDashboard = lazy(() => import("./pages/espaco-do-cliente/Dashboard"));
const PainelCodifica = lazy(() => import("./pages/espaco-do-cliente/PainelCodifica"));

const PreCarregarPaginas = () => {
  useEffect(() => {
    const carregar = () => Object.values(paginasPublicas).forEach((f) => f().catch(() => undefined));
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    const id = w.requestIdleCallback ? w.requestIdleCallback(carregar) : window.setTimeout(carregar, 1500);
    return () => {
      if (!w.requestIdleCallback) window.clearTimeout(id);
    };
  }, []);
  return null;
};

const Carregando = () => <div className="min-h-screen bg-background" aria-busy="true" />;

const queryClient = new QueryClient();

const DocumentTitleManager = () => {
  const location = useLocation();
  let title = 'Codifica';
  if (location.pathname === '/portfolio') title = 'Codifica - Projetos';
  else if (location.pathname === '/sobre') title = 'Codifica - Sobre';
  else if (location.pathname === '/termos') title = 'Codifica - Termos de Uso';
  else if (location.pathname === '/privacidade') title = 'Codifica - Política de Privacidade';
  else if (location.pathname === '/presenca-no-google') title = 'Codifica - Site e Perfil do Google';
  else if (location.pathname === '/como-funciona') title = 'Codifica - Como funciona';
  else if (location.pathname === '/contrato') title = 'Codifica - Contrato';
  else if (location.pathname === '/comecar') title = 'Codifica - Sua prévia grátis';
  else if (location.pathname.startsWith('/pedido/')) title = 'Codifica - Seu pedido';
  else if (location.pathname === ROTAS.entrar) title = 'Codifica - Área do cliente';
  else if (location.pathname === ROTAS.minhaArea) title = 'Codifica - Minha área';
  else if (location.pathname.startsWith(ROTAS.admin)) title = 'Codifica - Painel';
  else if (location.pathname.startsWith(ROTAS.painelSistema)) title = 'Codifica - Meus projetos';
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
          <PreCarregarPaginas />
          <Consentimento />
          <Suspense fallback={<Carregando />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/sobre" element={<Sobre />} />
            <Route path="/termos" element={<Termos />} />
            <Route path="/privacidade" element={<Privacidade />} />
            {/* Acesso: login por código no e-mail (sem senha) */}
            <Route path={ROTAS.entrar} element={<Entrar />} />
            <Route
              path={ROTAS.minhaArea}
              element={
                <RequireAuth>
                  <MinhaArea />
                </RequireAuth>
              }
            />
            <Route
              path={ROTAS.painelSistema}
              element={
                <RequireAuth>
                  <EspacoDashboard />
                </RequireAuth>
              }
            />
            {/* Painel admin: endereço fora dos menus; exige e-mail autorizado */}
            <Route
              path={ROTAS.admin}
              element={
                <RequireAdmin>
                  <PainelCodifica />
                </RequireAdmin>
              }
            />
            <Route path={`${ROTAS.admin}/pedidos`} element={<Navigate to={ROTAS.admin} replace />} />
            {/* Endereços antigos do Espaço do Cliente (cadastro com senha e briefing longo foram aposentados;
                o código está na tag espaco-do-cliente-v1) */}
            <Route path="/espaco-do-cliente" element={<Navigate to={ROTAS.entrar} replace />} />
            <Route path="/espaco-do-cliente/login" element={<Navigate to={ROTAS.entrar} replace />} />
            <Route path="/espaco-do-cliente/recuperar-senha" element={<Navigate to={ROTAS.entrar} replace />} />
            <Route path="/espaco-do-cliente/redefinir-senha" element={<Navigate to={ROTAS.entrar} replace />} />
            <Route path="/espaco-do-cliente/questionario" element={<Navigate to="/comecar" replace />} />
            <Route path="/espaco-do-cliente/cadastro" element={<Navigate to="/comecar" replace />} />
            <Route path="/presenca-no-google" element={<PresencaGoogle />} />
            <Route path="/como-funciona" element={<ComoFunciona />} />
            <Route path="/contrato" element={<Contrato />} />
            <Route path="/comecar" element={<Comecar />} />
            <Route path="/pedido/:codigo" element={<Pedido />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
