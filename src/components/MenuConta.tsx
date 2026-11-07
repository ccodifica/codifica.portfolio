import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, LayoutDashboard, LogOut, User as UserIcon, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { ROTAS } from "@/config/rotas";

const iniciais = (nome: string) =>
  nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export const Avatar = ({ nome, url, tamanho = 32 }: { nome: string; url?: string; tamanho?: number }) =>
  url ? (
    <img src={url} alt="" className="rounded-full object-cover" style={{ width: tamanho, height: tamanho }} />
  ) : (
    <span
      className="rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold flex items-center justify-center"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.38 }}
      aria-hidden
    >
      {iniciais(nome)}
    </span>
  );

/** Links do usuário logado (ou o botão "Área do cliente" para quem não entrou). */
const linksDoUsuario = (admin: boolean) =>
  admin
    ? [{ to: ROTAS.admin, rotulo: "Painel", icone: LayoutDashboard }]
    : [{ to: ROTAS.minhaArea, rotulo: "Minha área", icone: UserIcon }];

/** Versão para o topo no computador: avatar + "Olá, Pedro" com menu. */
export const MenuContaDesktop = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <Link to={ROTAS.entrar}>
        <Button
          variant="outline"
          className="font-semibold px-5 py-2 rounded-lg border-primary/40 text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-300"
        >
          <UserCircle2 className="w-4 h-4 mr-2" />
          Área do cliente
        </Button>
      </Link>
    );
  }

  const primeiroNome = user.nome.split(" ")[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2.5 rounded-full border border-primary/40 bg-primary/10 pl-1 pr-3 py-1 hover:bg-primary/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Conta de ${user.nome}`}
        >
          <Avatar nome={user.nome} url={user.avatarUrl} />
          <span className="text-sm font-semibold text-foreground">Olá, {primeiroNome}</span>
          {isAdmin && (
            <span className="text-[10px] font-bold uppercase tracking-wide rounded-full bg-accent/20 text-accent px-1.5 py-0.5">
              Admin
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="font-semibold text-foreground truncate">{user.nome}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {linksDoUsuario(isAdmin).map(({ to, rotulo, icone: Icone }) => (
          <DropdownMenuItem key={to} onSelect={() => navigate(to)} className="cursor-pointer">
            <Icone className="w-4 h-4 mr-2" aria-hidden /> {rotulo}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-muted-foreground"
          onSelect={async () => {
            await logout();
            navigate("/", { replace: true });
          }}
        >
          <LogOut className="w-4 h-4 mr-2" aria-hidden /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/** Versão para o menu do celular: cartão com o nome e os links empilhados. */
export const MenuContaMobile = ({ aoNavegar }: { aoNavegar: () => void }) => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <Link to={ROTAS.entrar} onClick={aoNavegar}>
        <Button
          variant="outline"
          className="font-semibold px-5 py-2 rounded-lg border-primary/40 text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-300 w-full mt-2"
        >
          <UserCircle2 className="w-4 h-4 mr-2" />
          Área do cliente
        </Button>
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 mt-2">
      <div className="flex items-center gap-3 mb-3">
        <Avatar nome={user.nome} url={user.avatarUrl} tamanho={40} />
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">Olá, {user.nome.split(" ")[0]}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {linksDoUsuario(isAdmin).map(({ to, rotulo, icone: Icone }) => (
          <Link
            key={to}
            to={to}
            onClick={aoNavegar}
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-primary/10"
          >
            <Icone className="w-4 h-4" aria-hidden /> {rotulo}
          </Link>
        ))}
        <button
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-primary/10 text-left"
          onClick={async () => {
            aoNavegar();
            await logout();
            navigate("/", { replace: true });
          }}
        >
          <LogOut className="w-4 h-4" aria-hidden /> Sair
        </button>
      </div>
    </div>
  );
};
