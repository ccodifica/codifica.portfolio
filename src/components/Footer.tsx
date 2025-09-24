import { Link } from "react-router-dom";
import {
  Code,
  Mail,
  Phone,
  MapPin,
  Github,
  Linkedin,
  Twitter,
  Instagram,
} from "lucide-react";

// WhatsApp SVG Icon Component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.525 3.687"/>
  </svg>
);

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="footer" className="bg-background border-t border-border/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="md:col-span-2">
            <Link
              to="/"
              className="flex items-center space-x-2 text-2xl font-bold text-foreground mb-4"
            >
              <Code className="w-8 h-8 text-primary" />
              <span className="hero-text">Codifica</span>
            </Link>
            <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
              Desenvolvemos soluções inteligentes em software para transformar
              ideias em resultados. Seu parceiro tecnológico para o futuro.
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-muted-foreground">
                <Mail className="w-5 h-5 text-primary" />
                <a
                  href="mailto:ccodifica@gmail.com"
                  className="hover:text-primary transition-colors duration-300"
                >
                  ccodifica@gmail.com
                </a>
              </div>
              <div className="flex items-center space-x-3 text-muted-foreground">
                <WhatsAppIcon className="w-5 h-5 text-primary" />
                <button
                  onClick={() => {
                    const phoneNumber = "5521982998010"; // +55 21 98299-8010
                    const message = encodeURIComponent("Olá! Gostaria de saber mais sobre os serviços da Codifica.");
                    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
                  }}
                  className="hover:text-primary transition-colors duration-300"
                >
                  WhatsApp
                </button>
              </div>
              <div className="flex items-center space-x-3 text-muted-foreground">
                <MapPin className="w-5 h-5 text-primary" />
                <span>Rio de Janeiro, Brasil</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Navegação</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="text-muted-foreground hover:text-primary transition-colors duration-300 link-underline"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/portfolio"
                  onClick={() => setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)}
                  className="text-muted-foreground hover:text-primary transition-colors duration-300 link-underline"
                >
                  Projetos
                </Link>
              </li>
              <li>
                <Link
                  to="/sobre"
                  onClick={() => setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)}
                  className="text-muted-foreground hover:text-primary transition-colors duration-300 link-underline"
                >
                  Sobre
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Serviços</h3>
            <ul className="space-y-3">
              <li className="text-muted-foreground">Desenvolvimento Web</li>
              <li className="text-muted-foreground">Apps Mobile</li>
              <li className="text-muted-foreground">Sistemas Internos</li>
              <li className="text-muted-foreground">Integrações</li>
              <li className="text-muted-foreground">Consultoria</li>
            </ul>
          </div>
        </div>

        {/* Social Links & Copyright */}
        <div className="border-t border-border/50 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-muted-foreground text-sm text-center md:text-left">
            © {currentYear} Codifica. Todos os direitos reservados.
          </p>

          <div className="flex space-x-6 order-3 md:order-2">
            <a
              href="https://github.com/ccodifica"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors duration-300"
              aria-label="Github"
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="https://www.instagram.com/ccodifica/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors duration-300"
              aria-label="Instagram"
            >
              <Instagram className="w-5 h-5" />
            </a>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 text-sm text-muted-foreground order-2 md:order-3">
            <Link to="/termos" className="hover:text-primary transition-colors duration-300">Termos de Uso</Link>
            <span className="hidden sm:inline">•</span>
            <Link to="/privacidade" className="hover:text-primary transition-colors duration-300">Política de Privacidade</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
