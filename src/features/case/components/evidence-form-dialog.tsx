"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { createEvidenceSchema, CreateEvidenceInput } from "@/features/case/schemas/evidence.schema";
import { evidenceClient } from "@/features/case/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Evidence {
  id: string;
  title: string;
  type: "DOCUMENT" | "IMAGE" | "VIDEO" | "AUDIO" | "SCREENSHOT" | "LOG_FILE" | "OTHER";
  description?: string | null;
  notes?: string | null;
  fileUrl?: string | null;
  createdAt: Date | string;
}

interface EvidenceFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  evidence?: Evidence | null;
  onSuccess?: () => void;
}

export function EvidenceFormDialog({
  isOpen,
  onOpenChange,
  caseId,
  evidence,
  onSuccess,
}: EvidenceFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isEdit = !!evidence;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    clearErrors,
  } = useForm<CreateEvidenceInput>({
    resolver: zodResolver(createEvidenceSchema),
    values: {
      title: evidence?.title || "",
      type: evidence?.type || "DOCUMENT",
      description: evidence?.description || "",
      notes: evidence?.notes || "",
      fileUrl: evidence?.fileUrl || "",
      caseId: caseId,
    },
  });

  async function onSubmit(values: CreateEvidenceInput) {
    startTransition(async () => {
      clearErrors();
      const { caseId: _, ...data } = values;

      // Clean empty strings so optional fields are cleanly passed
      const cleanData: any = {
        title: data.title.trim(),
        type: data.type,
      };
      if (data.description !== undefined && data.description !== null) {
        cleanData.description = data.description.trim() || undefined;
      }
      if (data.notes !== undefined && data.notes !== null) {
        cleanData.notes = data.notes.trim() || undefined;
      }
      if (data.fileUrl !== undefined && data.fileUrl !== null) {
        cleanData.fileUrl = data.fileUrl.trim() || undefined;
      }

      try {
        if (isEdit && evidence) {
          await evidenceClient.update(caseId, evidence.id, cleanData);
        } else {
          await evidenceClient.create(caseId, cleanData);
        }
        toast.success(`Evidence ${isEdit ? "updated" : "registered"} successfully.`);
        router.refresh();
        onSuccess?.();
        onOpenChange(false);
        if (!isEdit) reset();
      } catch (error: any) {
        // Parse raw validation error messages from NestJS ValidationPipe or ApiError
        const rawMessages: string[] = Array.isArray(error?.data?.message)
          ? error.data.message
          : typeof error?.data?.message === "string"
          ? [error.data.message]
          : typeof error?.message === "string"
          ? error.message.split(",").map((s: string) => s.trim())
          : ["Failed to process evidence record."];

        let hasFieldErrors = false;
        const unmappedMessages: string[] = [];

        for (const msg of rawMessages) {
          const lower = msg.toLowerCase();
          if (lower.includes("title")) {
            setError("title", { type: "server", message: msg });
            hasFieldErrors = true;
          } else if (lower.includes("type")) {
            setError("type", { type: "server", message: msg });
            hasFieldErrors = true;
          } else if (lower.includes("fileurl") || lower.includes("storagekey") || lower.includes("file url")) {
            setError("fileUrl", { type: "server", message: msg });
            hasFieldErrors = true;
          } else if (lower.includes("description")) {
            setError("description", { type: "server", message: msg });
            hasFieldErrors = true;
          } else if (lower.includes("notes") || lower.includes("custody")) {
            setError("notes", { type: "server", message: msg });
            hasFieldErrors = true;
          } else {
            unmappedMessages.push(msg);
          }
        }

        if (unmappedMessages.length > 0 || !hasFieldErrors) {
          setError("root", {
            type: "server",
            message: unmappedMessages.join(". ") || error.message || "An error occurred during submission.",
          });
        }

        toast.error(error.message || `Failed to ${isEdit ? "update" : "register"} evidence.`);
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-sans">
            {isEdit ? "Edit Evidence Metadata" : "Register Evidence Item"}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400 dark:text-zinc-500">
            {isEdit 
              ? "Modify metadata records, descriptions, or internal notes for this item." 
              : "Register official evidence items, files, logs, or recordings related to this case."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Server Error Alert Banner */}
          {errors.root?.message && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 flex items-start gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="text-[11px] font-mono leading-relaxed">
                <p className="font-semibold uppercase tracking-wider text-[10px]">Validation Error</p>
                <p className="mt-0.5">{errors.root.message}</p>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="title" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
              Evidence Title / Name *
            </label>
            <Input
              id="title"
              type="text"
              placeholder="e.g. CCTV footage Sector 15 Entrance"
              disabled={isPending}
              className=""
              {...register("title")}
            />
            {errors.title && (
              <p className="flex items-center gap-1 text-[10px] font-semibold text-red-500 font-mono">
                <AlertCircle className="h-3 w-3" />
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Type dropdown */}
          <div className="space-y-1.5">
            <label htmlFor="type" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
              Evidence Type *
            </label>
            <select
              id="type"
              disabled={isPending}
              className="flex h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-50/10 transition-all duration-200"
              {...register("type")}
            >
              <option value="DOCUMENT">Document (PDF/Docx/TXT)</option>
              <option value="IMAGE">Image File (PNG/JPG)</option>
              <option value="VIDEO">Video File (MP4/CCTV/AVI)</option>
              <option value="AUDIO">Audio Recording (Call Log/Voice)</option>
              <option value="SCREENSHOT">Screenshot Attachment</option>
              <option value="LOG_FILE">Server/Network Log File</option>
              <option value="OTHER">Other evidentiary asset</option>
            </select>
            {errors.type && (
              <p className="flex items-center gap-1 text-[10px] font-semibold text-red-500 font-mono">
                <AlertCircle className="h-3 w-3" />
                {errors.type.message}
              </p>
            )}
          </div>

          {/* fileUrl (Mock uploads) */}
          <div className="space-y-1.5">
            <label htmlFor="fileUrl" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
              Asset Link / File Name (Mock Upload)
            </label>
            <Input
              id="fileUrl"
              type="text"
              placeholder="e.g. CCTV_sector_15_main.mp4 or https://storage.s3/ev-12.pdf"
              disabled={isPending}
              className=""
              {...register("fileUrl")}
            />
            {errors.fileUrl && (
              <p className="flex items-center gap-1 text-[10px] font-semibold text-red-500 font-mono">
                <AlertCircle className="h-3 w-3" />
                {errors.fileUrl.message}
              </p>
            )}
            <span className="block text-[9px] text-zinc-400 font-sans italic leading-normal">
              Note: File storage upload is coming soon. Paste a mock filename or S3 link to test local metadata references.
            </span>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="description" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
              Evidence Description
            </label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Describe what the evidence represents or proves..."
              disabled={isPending}
              className="min-h-[70px]"
              {...register("description")}
            />
            {errors.description && (
              <p className="flex items-center gap-1 text-[10px] font-semibold text-red-500 font-mono">
                <AlertCircle className="h-3 w-3" />
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="notes" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
              Custody Notes / Remarks
            </label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="e.g. Received from SHO, stored in Locker #4..."
              disabled={isPending}
              className="min-h-[50px]"
              {...register("notes")}
            />
            {errors.notes && (
              <p className="flex items-center gap-1 text-[10px] font-semibold text-red-500 font-mono">
                <AlertCircle className="h-3 w-3" />
                {errors.notes.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50 mt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold h-9 px-4 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="text-xs font-semibold h-9 px-4 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 flex items-center gap-1.5"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Save Changes" : "Register Evidence"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
