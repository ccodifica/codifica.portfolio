import { useCallback, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import {
  Camera,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Trash2,
  Loader2,
  ImagePlus,
  Check,
} from "lucide-react";
import {
  PRESENCE_LABEL,
  PresenceStatus,
} from "@/types/client-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePresence } from "@/contexts/PresenceContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/sonner";
import { uploadUserAvatar, removeUserAvatar } from "@/lib/client-area-store";
import { useAuth } from "@/contexts/AuthContext";

// ============================================================================
// Helpers — iniciais e crop em canvas
// ============================================================================

function getIniciais(nome?: string): string {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/**
 * Recorta a área indicada em um canvas, aplica rotação, redimensiona pra
 * tamanho final (512×512 por padrão) e retorna um Blob JPEG.
 */
async function cropImageToBlob(
  imageSrc: string,
  croppedArea: Area,
  rotation: number,
  outputSize = 512
): Promise<Blob> {
  const image = await loadImage(imageSrc);

  // Canvas auxiliar pra aplicar rotação primeiro
  const radians = (rotation * Math.PI) / 180;
  const rotatedW =
    Math.abs(image.width * Math.cos(radians)) +
    Math.abs(image.height * Math.sin(radians));
  const rotatedH =
    Math.abs(image.width * Math.sin(radians)) +
    Math.abs(image.height * Math.cos(radians));

  const rotCanvas = document.createElement("canvas");
  rotCanvas.width = rotatedW;
  rotCanvas.height = rotatedH;
  const rotCtx = rotCanvas.getContext("2d");
  if (!rotCtx) throw new Error("Canvas não suportado");
  rotCtx.translate(rotatedW / 2, rotatedH / 2);
  rotCtx.rotate(radians);
  rotCtx.drawImage(image, -image.width / 2, -image.height / 2);

  // Canvas final com o crop redimensionado
  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = outputSize;
  finalCanvas.height = outputSize;
  const finalCtx = finalCanvas.getContext("2d");
  if (!finalCtx) throw new Error("Canvas não suportado");
  finalCtx.imageSmoothingQuality = "high";
  finalCtx.drawImage(
    rotCanvas,
    croppedArea.x,
    croppedArea.y,
    croppedArea.width,
    croppedArea.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise<Blob>((resolve, reject) => {
    finalCanvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))),
      "image/jpeg",
      0.9
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}

// ============================================================================
// <UserAvatar> — exibição simples (com fallback de iniciais)
// ============================================================================

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<AvatarSize, string> = {
  xs: "w-7 h-7 text-[10px]",
  sm: "w-9 h-9 text-xs",
  md: "w-12 h-12 text-sm",
  lg: "w-16 h-16 text-lg",
  xl: "w-20 h-20 text-xl",
};

// Tamanho do dot de status no canto inferior direito (proporcional ao avatar)
const DOT_SIZE_MAP: Record<AvatarSize, string> = {
  xs: "w-2.5 h-2.5 ring-[1.5px]",
  sm: "w-3 h-3 ring-2",
  md: "w-3.5 h-3.5 ring-2",
  lg: "w-4 h-4 ring-[3px]",
  xl: "w-[18px] h-[18px] ring-[3px]",
};

const PRESENCE_DOT_COLORS: Record<PresenceStatus, string> = {
  available: "bg-green-500",
  away: "bg-amber-400",
  busy: "bg-red-500",
};

// Cores do RING ao redor do avatar (com glow sutil)
const PRESENCE_RING_COLORS: Record<PresenceStatus, string> = {
  available:
    "ring-green-500/80 shadow-[0_0_0_2px_rgba(34,197,94,0.15),0_0_16px_-4px_rgba(34,197,94,0.4)]",
  away:
    "ring-amber-400/80 shadow-[0_0_0_2px_rgba(251,191,36,0.15),0_0_16px_-4px_rgba(251,191,36,0.4)]",
  busy:
    "ring-red-500/80 shadow-[0_0_0_2px_rgba(239,68,68,0.15),0_0_16px_-4px_rgba(239,68,68,0.4)]",
};

/**
 * Bolinha pequena de status (verde/amarelo/vermelho) — usada sobre o avatar.
 */
export function StatusDot({
  status,
  size = "md",
  className = "",
}: {
  status: PresenceStatus;
  size?: AvatarSize;
  className?: string;
}) {
  return (
    <span
      aria-label={PRESENCE_LABEL[status]}
      title={PRESENCE_LABEL[status]}
      className={`${DOT_SIZE_MAP[size]} ${PRESENCE_DOT_COLORS[status]} rounded-full ring-card transition-colors ${className}`}
    />
  );
}

export function UserAvatar({
  nome,
  avatarUrl,
  size = "md",
  presenceStatus,
  showRing = false,
  className = "",
}: {
  nome?: string;
  avatarUrl?: string;
  size?: AvatarSize;
  presenceStatus?: PresenceStatus;
  showRing?: boolean; // mostra anel colorido em torno do avatar (além do dot)
  className?: string;
}) {
  const sizeClasses = SIZE_MAP[size];
  const ringClasses =
    showRing && presenceStatus
      ? `ring-2 ${PRESENCE_RING_COLORS[presenceStatus]}`
      : "ring-2 ring-card";

  const inner = avatarUrl ? (
    <div
      className={`${sizeClasses} rounded-full overflow-hidden bg-muted ${ringClasses} transition-shadow`}
    >
      <img
        src={avatarUrl}
        alt={nome ?? "Avatar"}
        className="w-full h-full object-cover"
        draggable={false}
      />
    </div>
  ) : (
    <div
      className={`${sizeClasses} rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-white ${ringClasses} transition-shadow`}
    >
      {getIniciais(nome)}
    </div>
  );

  if (!presenceStatus) {
    return <div className={className}>{inner}</div>;
  }

  return (
    <div className={`relative inline-block ${className}`}>
      {inner}
      <StatusDot
        status={presenceStatus}
        size={size}
        className="absolute bottom-0 right-0"
      />
    </div>
  );
}

// ============================================================================
// <UserAvatarEditable> — avatar do próprio usuário, clicável pra editar.
// Usa o user autenticado via AuthContext.
// ============================================================================

export function UserAvatarEditable({
  size = "lg",
  showGradientRing = true,
}: {
  size?: AvatarSize;
  showGradientRing?: boolean;
}) {
  const { user, reloadUser } = useAuth();
  const { effectiveStatus, manualStatus, setManualStatus } = usePresence();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const sizeClasses = SIZE_MAP[size];

  return (
    <>
      <div className="relative inline-block flex-shrink-0">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Alterar foto de perfil"
          className="group relative block outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
        >
          {/* Moldura externa: gradient rotativo sutil (branding Codifica) */}
          {showGradientRing && (
            <span
              aria-hidden
              className="absolute -inset-[5px] rounded-full bg-[conic-gradient(from_0deg,hsl(var(--primary)),hsl(var(--accent)),hsl(var(--primary)))] opacity-60 blur-[2px] animate-spin-slow"
            />
          )}

          {/* Ring de status (verde/amarelo/vermelho) — animação suave entre cores */}
          <span
            aria-hidden
            className={`absolute -inset-[2px] rounded-full ring-2 ring-offset-2 ring-offset-background transition-all duration-500 ${
              effectiveStatus === "available"
                ? "ring-green-500/90 shadow-[0_0_18px_-4px_rgba(34,197,94,0.55)]"
                : effectiveStatus === "away"
                ? "ring-amber-400/90 shadow-[0_0_18px_-4px_rgba(251,191,36,0.5)]"
                : "ring-red-500/90 shadow-[0_0_18px_-4px_rgba(239,68,68,0.55)]"
            }`}
          />

          {/* Avatar */}
          <span className="relative block">
            {user.avatarUrl ? (
              <span
                className={`block ${sizeClasses} rounded-full overflow-hidden ring-2 ring-card`}
              >
                <img
                  src={user.avatarUrl}
                  alt={user.nome}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  draggable={false}
                />
              </span>
            ) : (
              <span
                className={`${sizeClasses} rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-white ring-2 ring-card transition-transform duration-300 group-hover:scale-105`}
              >
                {getIniciais(user.nome)}
              </span>
            )}
          </span>

          {/* Overlay com camera no hover */}
          <span className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <Camera className="w-1/3 h-1/3 text-white" strokeWidth={2.5} />
          </span>
        </button>

        {/* StatusPicker — pequeno botão dot no canto inferior direito */}
        <StatusPicker
          effective={effectiveStatus}
          manual={manualStatus}
          onChange={setManualStatus}
          size={size}
        />
      </div>

      <AvatarUploader
        open={open}
        onOpenChange={setOpen}
        userId={user.id}
        nome={user.nome}
        avatarAtual={user.avatarUrl}
        onSaved={reloadUser}
      />
    </>
  );
}

// ============================================================================
// <StatusPicker> — dot clicável no canto do avatar editable
// ============================================================================

const STATUS_OPTIONS: { value: PresenceStatus; descricao: string }[] = [
  { value: "available", descricao: "Você está online e ativo" },
  { value: "away", descricao: "Você está temporariamente longe" },
  { value: "busy", descricao: "Você não quer ser interrompido" },
];

function StatusPicker({
  effective,
  manual,
  onChange,
  size,
}: {
  effective: PresenceStatus;
  manual: PresenceStatus;
  onChange: (status: PresenceStatus) => void;
  size: AvatarSize;
}) {
  // Tamanho do dot ajustado pra ser clicável (mínimo 18px mesmo em xs/sm)
  const dotSize =
    size === "xl"
      ? "w-[22px] h-[22px]"
      : size === "lg"
      ? "w-[18px] h-[18px]"
      : "w-4 h-4";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Status: ${PRESENCE_LABEL[effective]}. Clique para mudar.`}
          title={`Status: ${PRESENCE_LABEL[effective]}`}
          className={`absolute -bottom-0.5 -right-0.5 ${dotSize} ${PRESENCE_DOT_COLORS[effective]} rounded-full ring-[3px] ring-card hover:scale-110 active:scale-95 transition-transform shadow-md`}
        />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-64 p-2 border-border/60"
      >
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground px-2 py-1.5">
          Definir status
        </div>
        <div className="space-y-0.5">
          {STATUS_OPTIONS.map((opt) => {
            const selected = manual === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={`w-full text-left flex items-start gap-2.5 p-2 rounded-lg transition-colors ${
                  selected
                    ? "bg-muted/60"
                    : "hover:bg-muted/40"
                }`}
              >
                <span
                  className={`${PRESENCE_DOT_COLORS[opt.value]} w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0`}
                />
                <span className="flex-1 min-w-0">
                  <span className="text-sm font-semibold block">
                    {PRESENCE_LABEL[opt.value]}
                  </span>
                  <span className="text-[11px] text-muted-foreground block leading-tight mt-0.5">
                    {opt.descricao}
                  </span>
                </span>
                {selected && (
                  <Check className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
        {effective !== manual && (
          <div className="text-[10px] text-muted-foreground/80 px-2 pt-2 pb-1 mt-1 border-t border-border/40 italic leading-tight">
            Você está marcado como{" "}
            <strong className="text-foreground/80">
              {PRESENCE_LABEL[effective]}
            </strong>{" "}
            automaticamente (sem atividade). Volta para{" "}
            <strong className="text-foreground/80">
              {PRESENCE_LABEL[manual]}
            </strong>{" "}
            quando você interagir.
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// <AvatarUploader> — modal com cropper
// ============================================================================

function AvatarUploader({
  open,
  onOpenChange,
  userId,
  nome,
  avatarAtual,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  nome: string;
  avatarAtual?: string;
  onSaved: () => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      toast.error("Use um arquivo PNG, JPG ou WebP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 10 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  const resetState = () => {
    setImageSrc(null);
    setCroppedArea(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const fecharModal = () => {
    if (salvando || removendo) return;
    resetState();
    onOpenChange(false);
  };

  const handleSalvar = async () => {
    if (!imageSrc || !croppedArea) {
      toast.error("Escolha uma imagem primeiro.");
      return;
    }
    setSalvando(true);
    try {
      const blob = await cropImageToBlob(imageSrc, croppedArea, rotation);
      await uploadUserAvatar(userId, blob);
      await onSaved();
      toast.success("Foto de perfil atualizada!");
      resetState();
      onOpenChange(false);
    } catch (err) {
      console.error("[AvatarUploader] erro:", err);
      const msg =
        err instanceof Error ? err.message : "Erro ao salvar foto.";
      toast.error(msg);
    } finally {
      setSalvando(false);
    }
  };

  const handleRemover = async () => {
    if (!avatarAtual) return;
    setRemovendo(true);
    try {
      await removeUserAvatar(userId);
      await onSaved();
      toast.success("Foto de perfil removida.");
      resetState();
      onOpenChange(false);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao remover foto.";
      toast.error(msg);
    } finally {
      setRemovendo(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(true) : fecharModal())}
    >
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-primary/15 via-card to-accent/10 border-b border-border/40">
          <DialogHeader className="text-left">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-2">
              <ImagePlus className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-xl font-bold">
              Foto de perfil
            </DialogTitle>
            <DialogDescription className="text-sm">
              {imageSrc
                ? "Arraste pra centralizar e use o zoom pra ajustar."
                : "Escolha uma imagem e ajuste como preferir."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!imageSrc ? (
            <div className="space-y-4">
              {/* Preview do avatar atual */}
              <div className="flex items-center justify-center py-4">
                <UserAvatar nome={nome} avatarUrl={avatarAtual} size="xl" />
              </div>

              {/* Botão de escolher arquivo */}
              <label className="block">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                  className="hidden"
                />
                <div className="border-2 border-dashed border-border/60 rounded-xl p-6 text-center hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-colors">
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <div className="text-sm font-semibold">
                    Clique para escolher uma imagem
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    PNG, JPG ou WebP — máx. 10 MB
                  </div>
                </div>
              </label>

              {avatarAtual && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemover}
                  disabled={removendo}
                  className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  {removendo ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Remover foto atual
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Cropper container — preview circular */}
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black border border-border/60">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              {/* Zoom slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wide">
                    <ZoomIn className="w-3.5 h-3.5" />
                    Zoom
                  </span>
                  <span className="tabular-nums">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ZoomOut className="w-4 h-4 text-muted-foreground" />
                  <Slider
                    value={[zoom]}
                    min={1}
                    max={3}
                    step={0.05}
                    onValueChange={(v) => setZoom(v[0])}
                    className="flex-1"
                  />
                  <ZoomIn className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              {/* Botão de rotacionar */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="w-full"
              >
                <RotateCw className="w-4 h-4 mr-2" />
                Girar 90°
              </Button>

              {/* Trocar arquivo */}
              <button
                type="button"
                onClick={resetState}
                className="text-xs text-muted-foreground hover:text-foreground underline w-full text-center"
              >
                Escolher outra imagem
              </button>
            </div>
          )}
        </div>

        {imageSrc && (
          <div className="px-6 pb-6 pt-2 border-t border-border/40 flex flex-wrap gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={fecharModal}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSalvar}
              disabled={salvando || !croppedArea}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {salvando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Salvar foto
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
