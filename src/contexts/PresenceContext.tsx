import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { updatePresenceStatus } from "@/lib/client-area-store";
import { PresenceStatus } from "@/types/client-area";

/**
 * Contexto global de presença do usuário logado.
 *
 * - Persiste a ÚLTIMA ESCOLHA MANUAL em localStorage (assim quando o user
 *   volta de "auto-ausente" restauramos a preferência dele).
 * - Quando user fica idle por IDLE_MS sem mover mouse, teclar, etc., entra em
 *   "ausente" automaticamente (só se manual = "available" — "busy" é sticky).
 * - Em qualquer evento de interação, volta pro status manual.
 * - Atualiza no banco (Supabase) pra que os outros (admin/cliente) vejam ao vivo
 *   via Realtime.
 *
 * Apenas UMA instância de Provider deve envolver a árvore — isso evita
 * múltiplos listeners de atividade no window.
 */
const IDLE_MS = 15_000;
const LS_KEY = "codifica_presence_manual";

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "focus",
];

interface PresenceContextValue {
  effectiveStatus: PresenceStatus;
  manualStatus: PresenceStatus;
  setManualStatus: (status: PresenceStatus) => void;
  isIdle: boolean;
}

const PresenceContext = createContext<PresenceContextValue | undefined>(
  undefined
);

function loadManualFromStorage(): PresenceStatus {
  if (typeof window === "undefined") return "available";
  const raw = window.localStorage.getItem(LS_KEY);
  if (raw === "available" || raw === "away" || raw === "busy") return raw;
  return "available";
}

function saveManualToStorage(status: PresenceStatus) {
  try {
    window.localStorage.setItem(LS_KEY, status);
  } catch {
    /* ignora quota */
  }
}

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [manualStatus, setManualStatusState] = useState<PresenceStatus>(() =>
    loadManualFromStorage()
  );
  const [effectiveStatus, setEffectiveStatus] = useState<PresenceStatus>(
    () => user?.presenceStatus ?? loadManualFromStorage()
  );
  const [isIdle, setIsIdle] = useState(false);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userIdRef = useRef(user?.id);
  const manualRef = useRef(manualStatus);
  const effectiveRef = useRef(effectiveStatus);

  userIdRef.current = user?.id;
  manualRef.current = manualStatus;
  effectiveRef.current = effectiveStatus;

  useEffect(() => {
    if (user?.presenceStatus) {
      setEffectiveStatus(user.presenceStatus);
    }
  }, [user?.presenceStatus]);

  const pushStatus = useCallback(async (newStatus: PresenceStatus) => {
    const uid = userIdRef.current;
    if (!uid) return;
    if (effectiveRef.current === newStatus) return;
    setEffectiveStatus(newStatus);
    try {
      await updatePresenceStatus(uid, newStatus);
    } catch (err) {
      console.warn("[Presence] falha ao atualizar status:", err);
    }
  }, []);

  const setManualStatus = useCallback(
    (status: PresenceStatus) => {
      setManualStatusState(status);
      saveManualToStorage(status);
      setIsIdle(false);
      void pushStatus(status);
    },
    [pushStatus]
  );

  // Listeners de atividade + idle timer (rodam só quando há user logado)
  useEffect(() => {
    if (!user?.id) return;

    const resetIdle = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

      if (isIdle) {
        setIsIdle(false);
        // Saindo de idle — restaura status manual se atual era "away" auto
        if (effectiveRef.current === "away" && manualRef.current !== "away") {
          void pushStatus(manualRef.current);
        }
      }

      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true);
        // Só entra em auto-away se manual era "available" (busy é sticky)
        if (manualRef.current === "available") {
          void pushStatus("away");
        }
      }, IDLE_MS);
    };

    resetIdle();

    ACTIVITY_EVENTS.forEach((ev) => {
      window.addEventListener(ev, resetIdle, { passive: true });
    });
    const onVisibility = () => {
      if (document.visibilityState === "visible") resetIdle();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      ACTIVITY_EVENTS.forEach((ev) => {
        window.removeEventListener(ev, resetIdle);
      });
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, pushStatus]);

  // Sincroniza manual <> effective no boot da sessão
  useEffect(() => {
    if (!user?.id) return;
    if (manualStatus !== effectiveStatus) {
      void pushStatus(manualStatus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <PresenceContext.Provider
      value={{ effectiveStatus, manualStatus, setManualStatus, isIdle }}
    >
      {children}
    </PresenceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePresence(): PresenceContextValue {
  const ctx = useContext(PresenceContext);
  if (!ctx) {
    // Fallback seguro fora do provider — útil em telas sem auth
    return {
      effectiveStatus: "available",
      manualStatus: "available",
      setManualStatus: () => {},
      isIdle: false,
    };
  }
  return ctx;
}
