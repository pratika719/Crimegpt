"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Download,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateCaseAction, deleteCaseAction } from "@/actions/case.action";
import { toast } from "sonner";

import type { CaseStatus } from "@/generated/prisma/client";

interface CaseHeaderActionsProps {
  caseId: string;
  caseTitle: string;
  caseNarrative: string;
  caseStatus: CaseStatus;
}

export default function CaseHeaderActions({
  caseId,
  caseTitle,
  caseNarrative,
  caseStatus,
}: CaseHeaderActionsProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Edit form state
  const [editTitle, setEditTitle] = useState(caseTitle);
  const [editNarrative, setEditNarrative] = useState(caseNarrative);
  const [editStatus, setEditStatus] = useState(caseStatus);

  const handleOpenEdit = () => {
    // Reset to current values when opening
    setEditTitle(caseTitle);
    setEditNarrative(caseNarrative);
    setEditStatus(caseStatus);
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    startTransition(async () => {
      const result = await updateCaseAction(caseId, {
        title: editTitle,
        narrative: editNarrative,
        status: editStatus,
      });

      if (result.success) {
        toast.success("Case dossier updated successfully.");
        setIsEditOpen(false);
      } else {
        toast.error(result.message || "Failed to update case.");
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCaseAction(caseId);

      if (result.success) {
        toast.success("Investigation permanently deleted.");
        setIsDeleteOpen(false);
        router.push("/case");
      } else {
        toast.error(result.message || "Failed to delete case.");
      }
    });
  };

  return (
    <>
      {/* Quick Actions Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 text-zinc-400" />
          <span>Export Briefing</span>
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <Briefcase className="h-3.5 w-3.5 text-zinc-400" />
          <span>Draft Charge Sheet</span>
          <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 text-[8px] font-mono text-zinc-400 uppercase">AI Tool</span>
        </button>

        {/* Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shadow-sm transition-all cursor-pointer"
              />
            }
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Case Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleOpenEdit}>
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit Case Details</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onClick={() => setIsDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Investigation</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit Case Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Edit Case Dossier
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Update the case title, narrative, and investigation status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider font-mono">
                Case Title
              </label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                disabled={isPending}
                placeholder="Enter case title..."
                className="text-xs h-9"
              />
            </div>

            {/* Narrative */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider font-mono">
                Case Narrative
              </label>
              <Textarea
                value={editNarrative}
                onChange={(e) => setEditNarrative(e.target.value)}
                disabled={isPending}
                placeholder="Describe the case narrative..."
                className="text-xs min-h-[120px] resize-y"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider font-mono">
                Investigation Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as typeof editStatus)}
                disabled={isPending}
                className="w-full text-xs h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="OPEN">Open</option>
                <option value="UNDER_INVESTIGATION">Under Investigation</option>
                <option value="CLOSED">Closed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <Button variant="outline" className="text-xs" disabled={isPending} />
              }
            >
              Cancel
            </DialogClose>
            <Button
              onClick={handleSaveEdit}
              disabled={isPending || !editTitle.trim() || !editNarrative.trim()}
              className="text-xs bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Investigation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All investigation data, generated documents, evidence,
              timeline entries, persons, checklist items, and related records will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  Deleting...
                </>
              ) : (
                "Delete Investigation"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
