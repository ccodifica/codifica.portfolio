import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { User } from "@/types/client-area";
import { supabase } from "@/lib/supabase";
import { getUserById } from "@/lib/client-area-store";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, senha: string) => Promise<User>;
  register: (input: {
    nome: string;
    email: string;
    celular: string;
    senha: string;
    empresa?: string;
    cargo?: string;
    ramo?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function resetPasswordRedirect(): string {
  return `${window.location.origin}/espaco-do-cliente/redefinir-senha`;
}

// O profile é criado por trigger logo após o INSERT em auth.users.
// Em redes lentas pode haver pequena defasagem — tentamos algumas vezes.
async function fetchProfileWithRetry(
  userId: string,
  maxAttempts = 4
): Promise<User | null> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const u = await getUserById(userId);
      if (u) return u;
    } catch {
      // silencia e tenta de novo
    }
    if (i < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  return null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    console.log("[auth] provider mount");

    supabase.auth
      .getSession()
      .then(({ data }) => {
        console.log("[auth] getSession resolved", {
          hasSession: !!data.session,
        });
        if (mounted) setSession(data.session);
      })
      .catch((err) => {
        console.error("[auth] getSession FAILED", err);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    // NUNCA chamar await dentro deste handler — trava o lock interno do
    // Supabase Auth e faz signInWithPassword nunca resolver.
    // Fetch do profile vai no useEffect separado abaixo.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("[auth] onAuthStateChange", {
        event,
        hasSession: !!newSession,
      });
      if (mounted) setSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Reage a mudanças de sessão para buscar/limpar o profile.
  useEffect(() => {
    let cancelled = false;
    if (!session?.user) {
      setUser(null);
      return;
    }
    (async () => {
      const profile = await fetchProfileWithRetry(session.user.id);
      if (!cancelled) {
        console.log("[auth] profile loaded", {
          hasProfile: !!profile,
          role: profile?.role,
        });
        setUser(profile);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const login = useCallback(async (email: string, senha: string) => {
    console.log("[auth] signIn start", { email });
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Tempo esgotado ao contatar o servidor. Verifique sua conexão.")),
        12000
      )
    );

    const { data, error } = await Promise.race([
      supabase.auth.signInWithPassword({ email, password: senha }),
      timeout,
    ]);
    console.log("[auth] signIn response", { hasUser: !!data?.user, hasError: !!error });

    if (error) {
      const msg = error.message.toLowerCase().includes("invalid")
        ? "E-mail ou senha incorretos."
        : error.message;
      throw new Error(msg);
    }
    if (!data.user) throw new Error("Falha no login.");

    const profile = await fetchProfileWithRetry(data.user.id);
    console.log("[auth] profile fetched", { hasProfile: !!profile, role: profile?.role });
    if (!profile) throw new Error("Perfil não encontrado.");

    setUser(profile);
    setSession(data.session);
    return profile;
  }, []);

  const register = useCallback<AuthContextValue["register"]>(async (input) => {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.senha,
      options: {
        data: {
          nome: input.nome,
          celular: input.celular,
          empresa: input.empresa ?? "",
          cargo: input.cargo ?? "",
          ramo: input.ramo ?? "",
        },
      },
    });
    if (error) {
      const lower = error.message.toLowerCase();
      const msg = lower.includes("already")
        ? "Já existe uma conta com esse e-mail."
        : error.message;
      throw new Error(msg);
    }
    if (!data.user) throw new Error("Falha ao criar conta.");
    if (!data.session) {
      // Confirm email está LIGADO no Supabase. Avisa o cliente.
      throw new Error(
        "Conta criada! Confirme o e-mail antes de acessar (verifique sua caixa de entrada)."
      );
    }
    const profile = await fetchProfileWithRetry(data.user.id);
    if (!profile) throw new Error("Perfil não foi criado a tempo. Tente entrar.");
    setUser(profile);
    setSession(data.session);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetPasswordRedirect(),
    });
    if (error) throw new Error(error.message);
  }, []);

  const reloadUser = useCallback(async () => {
    if (!session?.user) return;
    const profile = await fetchProfileWithRetry(session.user.id);
    setUser(profile);
  }, [session?.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isAdmin: user?.role === "admin",
      isLoading,
      login,
      register,
      logout,
      requestPasswordReset,
      reloadUser,
    }),
    [
      user,
      session,
      isLoading,
      login,
      register,
      logout,
      requestPasswordReset,
      reloadUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  }
  return ctx;
};
