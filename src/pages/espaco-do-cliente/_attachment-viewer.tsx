import { useState } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  FileType,
  FileArchive,
  File as FileIcon,
  Loader2,
  ImageIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { MessageAttachment } from "@/types/client-area";

// ============================================================================
// Helpers de tipo de arquivo
// ============================================================================

function isImage(mime: string): boolean {
  return mime.startsWith("image/");
}

function isPdf(mime: string): boolean {
  return mime === "application/pdf";
}

function getFileIcon(mime: string): typeof FileText {
  if (isImage(mime)) return ImageIcon;
  if (isPdf(mime)) return FileText;
  if (
    mime.includes("word") ||
    mime.includes("document") ||
    mime === "text/plain"
  ) {
    return FileType;
  }
  if (mime.includes("excel") || mime.includes("spreadsheet")) {
    return FileSpreadsheet;
  }
  if (mime.includes("zip") || mime.includes("compressed")) return FileArchive;
  return FileIcon;
}

function getFileTypeLabel(mime: string): string {
  if (isImage(mime)) return "Imagem";
  if (isPdf(mime)) return "PDF";
  if (mime.includes("wordprocessing")) return "Word (DOCX)";
  if (mime === "application/msword") return "Word (DOC)";
  if (mime.includes("spreadsheetml")) return "Excel (XLSX)";
  if (mime === "application/vnd.ms-excel") return "Excel (XLS)";
  if (mime.includes("presentationml")) return "PowerPoint (PPTX)";
  if (mime === "application/vnd.ms-powerpoint") return "PowerPoint (PPT)";
  if (mime === "text/plain") return "Texto";
  if (mime.includes("zip")) return "ZIP";
  return mime || "Arquivo";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// ============================================================================
// Download forçado via blob — funciona pra qualquer tipo (imagem, PDF, etc)
// independente do Content-Disposition do storage
// ============================================================================

async function downloadAsBlob(url: string, fileName: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar (HTTP ${response.status})`);
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Pequeno delay antes de revogar — alguns browsers cancelam o download se a
  // URL for revogada imediatamente
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

// ============================================================================
// Modal principal
// ============================================================================

export function AttachmentViewer({
  attachment,
  open,
  onOpenChange,
}: {
  attachment: MessageAttachment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [baixando, setBaixando] = useState(false);

  if (!attachment) return null;

  const imagem = isImage(attachment.fileType);
  const pdf = isPdf(attachment.fileType);
  const Icon = getFileIcon(attachment.fileType);
  const tipoLabel = getFileTypeLabel(attachment.fileType);
  const tamanhoLabel = formatSize(attachment.fileSize);

  const handleDownload = async () => {
    setBaixando(true);
    try {
      await downloadAsBlob(attachment.data, attachment.fileName);
      toast.success("Download iniciado.");
    } catch (err) {
      console.error("[AttachmentViewer] erro no download:", err);
      const msg = err instanceof Error ? err.message : "Erro ao baixar.";
      toast.error(msg);
    } finally {
      setBaixando(false);
    }
  };

  const handleAbrirNovaAba = () => {
    window.open(attachment.data, "_blank", "noopener,noreferrer");
  };

  const isMediaPreview = imagem || pdf;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`p-0 overflow-hidden border-border/60 gap-0 ${
          isMediaPreview ? "max-w-4xl" : "max-w-md"
        }`}
      >
        {/* Header com nome + ações */}
        <header className="relative flex items-start justify-between gap-3 px-5 py-4 border-b border-border/40 bg-gradient-to-br from-primary/5 via-card to-accent/5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                {tipoLabel}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {tamanhoLabel}
              </span>
            </div>
            <DialogTitle className="text-base font-bold leading-tight truncate pr-4">
              {attachment.fileName}
            </DialogTitle>
          </div>

          {/* Ações — mr-8 dá folga visual pro botão X do Dialog */}
          <div className="flex items-center gap-2 flex-shrink-0 mr-8">
            {isMediaPreview && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleAbrirNovaAba}
                title="Abrir em nova aba"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={handleDownload}
              disabled={baixando}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {baixando ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {baixando ? "Baixando..." : "Baixar"}
            </Button>
          </div>
        </header>

        {/* Conteúdo / preview */}
        {imagem && (
          <div className="bg-black/60 flex items-center justify-center p-4 max-h-[75vh] overflow-auto">
            <img
              src={attachment.data}
              alt={attachment.fileName}
              className="max-w-full max-h-[70vh] object-contain rounded-md select-none"
              draggable={false}
            />
          </div>
        )}

        {pdf && (
          <div className="bg-muted/40 p-1">
            <iframe
              src={attachment.data}
              className="w-full h-[75vh] rounded bg-white"
              title={attachment.fileName}
            />
          </div>
        )}

        {!isMediaPreview && (
          <div className="px-6 py-10 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
              <Icon className="w-10 h-10 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground/90 mb-1">
              Preview não disponível para este tipo de arquivo
            </p>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              Clique em <strong className="text-foreground/80">Baixar</strong>{" "}
              para salvar o arquivo no seu computador e abrir com o programa
              adequado.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
