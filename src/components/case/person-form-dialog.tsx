"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, AlertCircle } from "lucide-react";
import { CreatePersonSchema, CreatePersonInput } from "@/schema/person.schema";
import { createPersonAction, updatePersonAction } from "@/actions/person.action";
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

interface Person {
  id: string;
  name: string;
  role: "VICTIM" | "SUSPECT" | "WITNESS" | "OFFICER";
  phone?: string | null;
  address?: string | null;
  statement?: string | null;
  notes?: string | null;
  createdAt: Date | string;
}

interface PersonFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  person?: Person | null;
  onSuccess?: () => void;
}

export function PersonFormDialog({
  isOpen,
  onOpenChange,
  caseId,
  person,
  onSuccess,
}: PersonFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!person;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreatePersonInput>({
    resolver: zodResolver(CreatePersonSchema),
    values: {
      name: person?.name || "",
      role: person?.role || "VICTIM",
      phone: person?.phone || "",
      address: person?.address || "",
      statement: person?.statement || "",
      notes: person?.notes || "",
      caseId: caseId,
    },
  });

  async function onSubmit(values: CreatePersonInput) {
    startTransition(async () => {
      const { caseId: _, ...data } = values;
      let response;

      if (isEdit && person) {
        response = await updatePersonAction(person.id, caseId, data);
      } else {
        response = await createPersonAction(caseId, data);
      }

      if (!response.success) {
        toast.error(response.message || `Failed to ${isEdit ? "update" : "add"} person.`);
      } else {
        toast.success(`Person ${isEdit ? "updated" : "added"} successfully.`);
        onSuccess?.();
        onOpenChange(false);
        if (!isEdit) reset();
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-sans">
            {isEdit ? "Edit Person Profile" : "Register Person to Case"}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-450 dark:text-zinc-500">
            {isEdit 
              ? "Update details, statements, or notes for this registered individual." 
              : "Register a victim, witness, suspect, or investigating officer associated with this case."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
              Full Name *
            </label>
            <Input
              id="name"
              type="text"
              placeholder="e.g. John Doe"
              disabled={isPending}
              className=""
              {...register("name")}
            />
            {errors.name && (
              <p className="flex items-center gap-1 text-[10px] font-semibold text-red-500 font-mono">
                <AlertCircle className="h-3 w-3" />
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Role & Phone (Grid) */}
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="role" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                Role *
              </label>
              <select
                id="role"
                disabled={isPending}
                className="flex h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-50/10 transition-all duration-200"
                {...register("role")}
              >
                <option value="VICTIM">Victim / Complainant</option>
                <option value="SUSPECT">Accused / Suspect</option>
                <option value="WITNESS">Witness</option>
                <option value="OFFICER">Investigating Officer</option>
              </select>
              {errors.role && (
                <p className="flex items-center gap-1 text-[10px] font-semibold text-red-500 font-mono">
                  <AlertCircle className="h-3 w-3" />
                  {errors.role.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                Contact Phone
              </label>
              <Input
                id="phone"
                type="text"
                placeholder="+91 XXXXX XXXXX"
                disabled={isPending}
                className=""
                {...register("phone")}
              />
              {errors.phone && (
                <p className="flex items-center gap-1 text-[10px] font-semibold text-red-500 font-mono">
                  <AlertCircle className="h-3 w-3" />
                  {errors.phone.message}
                </p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label htmlFor="address" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
              Residential Address
            </label>
            <Input
              id="address"
              type="text"
              placeholder="Full mailing address"
              disabled={isPending}
              className=""
              {...register("address")}
            />
          </div>

          {/* Statement */}
          <div className="space-y-1.5">
            <label htmlFor="statement" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
              Official Statement / Testimony
            </label>
            <Textarea
              id="statement"
              rows={3}
              placeholder="Verbatim statement or details recorded..."
              disabled={isPending}
              className="min-h-[70px]"
              {...register("statement")}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="notes" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
              Internal Notes / Profile Remarks
            </label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="Crucial notes, behavioral remarks, background..."
              disabled={isPending}
              className="min-h-[50px]"
              {...register("notes")}
            />
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
              {isEdit ? "Save Changes" : "Register Person"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
