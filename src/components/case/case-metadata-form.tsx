"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, AlertCircle } from "lucide-react";
import { CreateCaseMetadataSchema, CreateCaseMetadataInput } from "@/schema/case-metadata.schema";
import { saveCaseMetadataAction } from "@/actions/case-metadata.action";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CaseMetadataFormProps {
  caseId: string;
  initialData?: {
    incidentDate?: string | Date | null;
    incidentTime?: string | null;
    incidentLocation?: string | null;
    victimName?: string | null;
    victimStatement?: string | null;
    suspectName?: string | null;
    suspectDescription?: string | null;
    witnessInformation?: string | null;
    evidenceSummary?: string | null;
    officerNotes?: string | null;
  } | null;
  onSuccess?: () => void;
}

export function CaseMetadataForm({ caseId, initialData, onSuccess }: CaseMetadataFormProps) {
  const [isPending, startTransition] = useTransition();

  // Helper to format date for YYYY-MM-DD input field
  const getFormattedDate = (dateVal: any) => {
    if (!dateVal) return "";
    try {
      const d = new Date(dateVal);
      return d.toISOString().substring(0, 10);
    } catch {
      return "";
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCaseMetadataInput>({
    resolver: zodResolver(CreateCaseMetadataSchema),
    defaultValues: {
      incidentDate: initialData?.incidentDate ? new Date(initialData.incidentDate) : undefined,
      incidentTime: initialData?.incidentTime || "",
      incidentLocation: initialData?.incidentLocation || "",
      victimName: initialData?.victimName || "",
      victimStatement: initialData?.victimStatement || "",
      suspectName: initialData?.suspectName || "",
      suspectDescription: initialData?.suspectDescription || "",
      witnessInformation: initialData?.witnessInformation || "",
      evidenceSummary: initialData?.evidenceSummary || "",
      officerNotes: initialData?.officerNotes || "",
      caseId: caseId,
    },
  });

  async function onSubmit(values: CreateCaseMetadataInput) {
    startTransition(async () => {
      // Exclude caseId since action takes (caseId, data)
      const { caseId: _, ...data } = values;
      const result = await saveCaseMetadataAction(caseId, data);

      if (!result.success) {
        toast.error(result.message || "Failed to update case metadata.");
      } else {
        toast.success("Case investigation metadata updated successfully.");
        onSuccess?.();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Incident Date */}
        <div className="space-y-1.5">
          <label htmlFor="incidentDate" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
            Incident Date
          </label>
          <Input
            id="incidentDate"
            type="date"
            defaultValue={initialData?.incidentDate ? getFormattedDate(initialData.incidentDate) : ""}
            disabled={isPending}
            className=""
            {...register("incidentDate")}
          />
          {errors.incidentDate && (
            <p className="flex items-center gap-1 text-[10px] font-semibold text-red-500 font-mono">
              <AlertCircle className="h-3 w-3" />
              {errors.incidentDate.message?.toString()}
            </p>
          )}
        </div>

        {/* Incident Time */}
        <div className="space-y-1.5">
          <label htmlFor="incidentTime" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
            Incident Time (e.g. 20:30 Hrs)
          </label>
          <Input
            id="incidentTime"
            placeholder="e.g. 14:00 Hrs"
            disabled={isPending}
            className=""
            {...register("incidentTime")}
          />
        </div>
      </div>

      {/* Incident Location */}
      <div className="space-y-1.5">
        <label htmlFor="incidentLocation" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
          Incident Location / Jurisdiction Address
        </label>
        <Input
          id="incidentLocation"
          placeholder="e.g. Sector 15 Market area, next to police booth"
          disabled={isPending}
          className=""
          {...register("incidentLocation")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Victim Name */}
        <div className="space-y-1.5">
          <label htmlFor="victimName" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
            Victim Name
          </label>
          <Input
            id="victimName"
            placeholder="Complainant / Victim full name"
            disabled={isPending}
            className=""
            {...register("victimName")}
          />
        </div>

        {/* Suspect Name */}
        <div className="space-y-1.5">
          <label htmlFor="suspectName" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
            Suspect Name (or Unknown)
          </label>
          <Input
            id="suspectName"
            placeholder="Accused individual's name"
            disabled={isPending}
            className=""
            {...register("suspectName")}
          />
        </div>
      </div>

      {/* Victim Statement */}
      <div className="space-y-1.5">
        <label htmlFor="victimStatement" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
          Victim / Complainant Statement Summary
        </label>
        <Textarea
          id="victimStatement"
          rows={3}
          placeholder="Enter a brief summary of the victim's statement..."
          disabled={isPending}
          className=""
          {...register("victimStatement")}
        />
      </div>

      {/* Suspect Description */}
      <div className="space-y-1.5">
        <label htmlFor="suspectDescription" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
          Accused / Suspect Description & Vehicle Details
        </label>
        <Textarea
          id="suspectDescription"
          rows={3}
          placeholder="e.g. Male, approx 35 years old, wearing replica army uniform, escaped in red car..."
          disabled={isPending}
          className=""
          {...register("suspectDescription")}
        />
      </div>

      {/* Witness Information */}
      <div className="space-y-1.5">
        <label htmlFor="witnessInformation" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
          Witness Information & Statements
        </label>
        <Textarea
          id="witnessInformation"
          rows={3}
          placeholder="Name and contact details of eye-witnesses, along with brief statements..."
          disabled={isPending}
          className=""
          {...register("witnessInformation")}
        />
      </div>

      {/* Evidence Summary */}
      <div className="space-y-1.5">
        <label htmlFor="evidenceSummary" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
          Evidence Summary (Physical, Digital, Ocular)
        </label>
        <Textarea
          id="evidenceSummary"
          rows={3}
          placeholder="e.g. Stolen iPhone, wallets, CCTV footage of Sector 15 market..."
          disabled={isPending}
          className=""
          {...register("evidenceSummary")}
        />
      </div>

      {/* Officer Notes */}
      <div className="space-y-1.5">
        <label htmlFor="officerNotes" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
          Officer Investigation Notes & Remarks
        </label>
        <Textarea
          id="officerNotes"
          rows={3}
          placeholder="SHO / Case IO remarks regarding preliminary verification..."
          disabled={isPending}
          className=""
          {...register("officerNotes")}
        />
      </div>

      {/* Submit Button */}
      <Button
        disabled={isPending}
        type="submit"
        className="w-full flex items-center justify-center gap-2 text-xs font-semibold h-10 cursor-pointer bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
      >
        {isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving Case Metadata...
          </>
        ) : (
          "Save Metadata Profile"
        )}
      </Button>
    </form>
  );
}
