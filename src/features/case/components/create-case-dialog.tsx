"use client";

import { useState } from "react";
import { CreateCaseForm } from "./create-case-form";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { CaseSummary } from "@/lib/api/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface CreateCaseDialogProps {
  triggerClass?: string;
  triggerText?: string;
  onCaseCreated?: (newCase: CaseSummary) => void;
}

export function CreateCaseDialog({
  triggerClass,
  triggerText,
  onCaseCreated,
}: CreateCaseDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button className={triggerClass || "flex items-center gap-1.5 text-xs font-semibold cursor-pointer"} />}>
        <Plus className="h-4 w-4" />
        {triggerText || "Create Case Dossier"}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-lg p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Log Incident Dossier
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Establish a new official investigation profile. Fill in the case name and detailed narrative statement.
          </DialogDescription>
        </DialogHeader>

        <CreateCaseForm
          redirectToCaseOnSuccess={false}
          onSuccess={(newCase) => {
            setIsOpen(false);
            onCaseCreated?.(newCase);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
