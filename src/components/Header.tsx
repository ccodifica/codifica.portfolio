import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Code } from "lucide-react";
import { MenuContaDesktop, MenuContaMobile } from "@/components/MenuConta";
import { registrar } from "@/lib/metricas";
import { ROTAS } from "@/config/rotas";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Force header background on Sobre page
  const shouldShowBackground = isScrolled || location.pathname === '/sobre';

  // Botão principal: "Quero meu site" leva ao produto. Quem já está nas páginas
  // do produto vai direto ao formulário; no próprio formulário o botão some.
  const PAGINAS_PRODUTO = [ROTAS.produto, "/como-funciona", "/contrato"];
  const naPaginaDoProduto = PAGINAS_PRODUTO.includes(location.pathname);
  const noFormulario = location.pathname === ROTAS.comecar || location.pathname.startsWith("/pedido/");
  const cta = naPaginaDoProduto
    ? { to: ROTAS.comecar, rotulo: "Quero minha prévia", origem: "topo_produto" }
    : { to: ROTAS.produto, rotulo: "Quero meu site", origem: "quero_meu_site_topo" };

  const handleContactClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname !== '/') {
      navigate('/', { state: { target: 'contact' } });
    } else {
      const contact = document.getElementById('contact');
      if (contact) {
        contact.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    setIsMenuOpen(false);
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    // Se já estamos na página inicial, rola para o topo
    if (location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
    // Se não estamos na página inicial, o Link normal funciona (vai para home)
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { name: "Início", path: "/" },
    { name: "Site + Google", path: "/presenca-no-google" },
    { name: "Projetos", path: "/portfolio" },
    { name: "Sobre", path: "/sobre" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        shouldShowBackground
          ? "bg-background/80 backdrop-blur-md border-b border-border/50"
          : "bg-transparent"
      }`}
    >
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            onClick={handleLogoClick}
            className="flex items-center space-x-2 text-2xl font-bold text-foreground hover:text-primary transition-colors duration-300"
          >
            <Code className="w-8 h-8 text-primary" />
            <span className="hero-text">Codifica</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                onClick={(e) => {
                  if (location.pathname === item.path) {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                  setIsMenuOpen(false);
                }}
                className={`link-underline font-medium transition-colors duration-300 ${
                  location.pathname === item.path
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.name}
              </Link>
            ))}
            <button
              onClick={handleContactClick}
              className="link-underline font-medium transition-colors duration-300 text-muted-foreground hover:text-foreground"
            >
              Contato
            </button>
            <MenuContaDesktop />
            {!noFormulario && (
              <Button
                asChild
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2 rounded-lg transition-all duration-300"
              >
                <Link to={cta.to} onClick={() => registrar("clique_comecar", cta.origem)}>
                  {cta.rotulo}
                </Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-foreground hover:text-primary transition-colors duration-300"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-border/50">
            <div className="flex flex-col space-y-4 pt-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={(e) => {
                    if (location.pathname === item.path) {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                    setIsMenuOpen(false);
                  }}
                  className={`font-medium transition-colors duration-300 ${
                    location.pathname === item.path
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              <MenuContaMobile aoNavegar={() => setIsMenuOpen(false)} />
              {!noFormulario && (
                <Button
                  asChild
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2 rounded-lg transition-all duration-300 w-full"
                >
                  <Link
                    to={cta.to}
                    onClick={() => {
                      registrar("clique_comecar", `${cta.origem}_celular`);
                      setIsMenuOpen(false);
                    }}
                  >
                    {cta.rotulo}
                  </Link>
                </Button>
              )}
              <button
                onClick={handleContactClick}
                className="text-sm text-muted-foreground hover:text-foreground py-1"
              >
                Dúvidas ou sistema? Fale conosco
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
