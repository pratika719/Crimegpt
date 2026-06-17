"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, AlertCircle } from "lucide-react";
import {
  CreateCaseSchema,
  CreateCaseInput,
} from "@/schema/case.schema";
import { createCaseAction } from "@/actions/case.action";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  onSuccess?: () => void;
};

export function CreateCaseForm({
  onSuccess,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<CreateCaseInput>({
    resolver: zodResolver(CreateCaseSchema),
    defaultValues: {
      title: "",
      narrative: "",
    },
  });

  const narrativeText = watch("narrative", "");
  const titleText = watch("title", "");

  async function onSubmit(values: CreateCaseInput) {
    startTransition(async () => {
      const result = await createCaseAction(values);

      if (!result.success) {
        toast.error(result.message || "Failed to log case profile");
        return;
      }

      toast.success("Case profile successfully registered");
      reset();
      onSuccess?.();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Case Title Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="title" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider font-mono">
            Case Title / Incident Name
          </label>
          <span className="text-[10px] text-zinc-400 font-mono">
            {titleText.length}/200
          </span>
        </div>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
          Enter a concise, descriptive title for the incident log (minimum 5 characters).
        </p>
        <Input
          id="title"
          placeholder="e.g., Cyber Intrusion & Unauthorized Database Extraction"
          disabled={isPending}
          className="text-xs h-10 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
          {...register("title")}
        />
        {errors.title && (
          <p className="flex items-center gap-1 text-[11px] font-semibold text-red-500 font-mono">
            <AlertCircle className="h-3 w-3" />
            {errors.title.message}
          </p>
        )}
      </div>

      {/* Incident Narrative Textarea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="narrative" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider font-mono">
            Official Incident Narrative
          </label>
          <span className="text-[10px] text-zinc-400 font-mono">
            {narrativeText.length}/10,000
          </span>
        </div>
        
        {/* Editor Box */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-inner">
          {/* Editor Header */}
          <div className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center justify-between">
            <span className="text-[9px] font-mono font-semibold text-zinc-400 tracking-wider">
              CRIMEGPT STATEMENT EDITOR // RECORD MODE
            </span>
            <span className="text-[9px] font-mono text-zinc-400">
              MIN 20 CHARACTERS
            </span>
          </div>

          <Textarea
            id="narrative"
            rows={10}
            placeholder="Type or paste the official statement report here. Describe in detail the timeline, involved entities, suspected methods of execution, and initial assessment logs..."
            disabled={isPending}
            className="border-0 rounded-none focus-visible:ring-0 p-4 font-mono text-xs leading-relaxed bg-white dark:bg-zinc-950 min-h-[200px]"
            {...register("narrative")}
          />
        </div>

        {errors.narrative && (
          <p className="flex items-center gap-1 text-[11px] font-semibold text-red-500 font-mono">
            <AlertCircle className="h-3 w-3" />
            {errors.narrative.message}
          </p>
        )}
      </div>

      {/* Action Button */}
      <Button 
        disabled={isPending} 
        type="submit"
        className="w-full flex items-center justify-center gap-2 text-xs font-semibold h-10 transition-all cursor-pointer bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
      >
        {isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Registering Dossier...
          </>
        ) : (
          "Submit Investigation Case"
        )}
      </Button>
    </form>
  );
}