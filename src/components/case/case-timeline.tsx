"use client";

import { useState, useTransition } from "react";
import { 
  PlusCircle, 
  Edit3, 
  Database, 
  Brain, 
  Gavel, 
  FileText, 
  FileSpreadsheet,
  Clock,
  Layers3,
  UserPlus,
  UserCheck,
  UserMinus,
  Paperclip,
  Trash2,
  CheckSquare,
  MoreHorizontal,
  Pencil,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  updateTimelineEventAction,
  deleteTimelineEventAction,
} from "@/actions/case-activity.action";
import { toast } from "sonner";

interface CaseActivity {
  id: string;
  activityType: string; // "CASE_CREATED" | "CASE_UPDATED" | etc.
  description: string;
  metadata?: any;
  createdAt: Date | string;
}

interface CaseTimelineProps {
  caseId: string;
  activities: CaseActivity[];
}

/**
 * Calculates a human-readable relative timestamp.
 */
function formatRelativeTime(dateInput: Date | string) {
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 10) return "Just now";
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function CaseTimeline({ caseId, activities }: CaseTimelineProps) {
  const [editingActivity, setEditingActivity] = useState<CaseActivity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<CaseActivity | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  const openEditDialog = (activity: CaseActivity) => {
    setEditingActivity(activity);
    setEditDescription(activity.description);
  };

  const handleSaveEdit = () => {
    if (!editingActivity || !editDescription.trim()) return;

    startTransition(async () => {
      const response = await updateTimelineEventAction(
        editingActivity.id,
        caseId,
        editDescription.trim()
      );

      if (response.success) {
        toast.success("Timeline entry updated.");
        setEditingActivity(null);
      } else {
        toast.error(response.message || "Failed to update timeline entry.");
      }
    });
  };

  const handleDelete = () => {
    if (!deletingActivity) return;

    startTransition(async () => {
      const response = await deleteTimelineEventAction(deletingActivity.id, caseId);

      if (response.success) {
        toast.success("Timeline entry deleted.");
        setDeletingActivity(null);
      } else {
        toast.error(response.message || "Failed to delete timeline entry.");
      }
    });
  };
  
  // Icon and badge color mapping based on activity type
  const getActivityStyles = (type: string) => {
    const map: Record<string, { icon: any; colorClass: string; dotClass: string }> = {
      CASE_CREATED: {
        icon: PlusCircle,
        colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
        dotClass: "bg-emerald-500 text-white dark:bg-emerald-500"
      },
      CASE_UPDATED: {
        icon: Edit3,
        colorClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
        dotClass: "bg-blue-500 text-white dark:bg-blue-500"
      },
      METADATA_CREATED: {
        icon: Database,
        colorClass: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30",
        dotClass: "bg-indigo-500 text-white dark:bg-indigo-500"
      },
      METADATA_UPDATED: {
        icon: Database,
        colorClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
        dotClass: "bg-amber-500 text-white dark:bg-amber-500"
      },
      LEGAL_ANALYSIS_GENERATED: {
        icon: Brain,
        colorClass: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900/30",
        dotClass: "bg-cyan-500 text-white dark:bg-cyan-500"
      },
      FIR_GENERATED: {
        icon: Gavel,
        colorClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30",
        dotClass: "bg-rose-500 text-white dark:bg-rose-500"
      },
      INVESTIGATION_SUMMARY_GENERATED: {
        icon: FileText,
        colorClass: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/30",
        dotClass: "bg-teal-500 text-white dark:bg-teal-500"
      },
      DOCUMENT_CREATED: {
        icon: FileSpreadsheet,
        colorClass: "bg-zinc-500/10 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-350 dark:border-zinc-700",
        dotClass: "bg-zinc-500 text-white dark:bg-zinc-500"
      },
      PERSON_ADDED: {
        icon: UserPlus,
        colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
        dotClass: "bg-emerald-500 text-white dark:bg-emerald-500"
      },
      PERSON_UPDATED: {
        icon: UserCheck,
        colorClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
        dotClass: "bg-amber-500 text-white dark:bg-amber-500"
      },
      PERSON_DELETED: {
        icon: UserMinus,
        colorClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30",
        dotClass: "bg-rose-500 text-white dark:bg-rose-500"
      },
      EVIDENCE_ADDED: {
        icon: Paperclip,
        colorClass: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-900/30",
        dotClass: "bg-violet-500 text-white dark:bg-violet-500"
      },
      EVIDENCE_UPDATED: {
        icon: Edit3,
        colorClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
        dotClass: "bg-amber-500 text-white dark:bg-amber-500"
      },
      EVIDENCE_DELETED: {
        icon: Trash2,
        colorClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30",
        dotClass: "bg-rose-500 text-white dark:bg-rose-500"
      },
      CHECKLIST_ITEM_COMPLETED: {
        icon: CheckSquare,
        colorClass: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30",
        dotClass: "bg-indigo-500 text-white dark:bg-indigo-500"
      }
    };

    return map[type] || {
      icon: FileText,
      colorClass: "bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-350 dark:border-zinc-700",
      dotClass: "bg-zinc-500 text-white dark:bg-zinc-500"
    };
  };

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden font-sans">
      {/* Header Bar */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers3 className="h-4.5 w-4.5 text-zinc-500" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Case Activity History & Timeline
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 uppercase">
          {activities.length} Events Logged
        </span>
      </div>

      {/* Main body */}
      <div className="p-6 md:p-8">
        {activities.length === 0 ? (
          <div className="text-center py-6 text-xs text-zinc-400 dark:text-zinc-500">
            No activities logged for this case profile.
          </div>
        ) : (
          <div className="relative border-l border-zinc-200 dark:border-zinc-800 ml-3.5 pl-6.5 space-y-6 py-1">
            {activities.map((activity) => {
              const { icon: Icon, colorClass, dotClass } = getActivityStyles(activity.activityType);
              const relativeTime = formatRelativeTime(activity.createdAt);

              return (
                <div key={activity.id} className="relative group">
                  {/* Timeline Node Bullet */}
                  <span className={`absolute -left-[35px] h-6 w-6 rounded-full border border-white dark:border-zinc-950 flex items-center justify-center shadow-sm ${dotClass} ring-4 ring-white dark:ring-zinc-900 transition-transform group-hover:scale-105`}>
                    <Icon className="h-3 w-3" />
                  </span>

                  {/* Log Content Card */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Short Tag badge */}
                        <span className={`rounded-md border px-2 py-0.5 text-[9px] font-mono font-bold uppercase ${colorClass}`}>
                          {activity.activityType.replace("_GENERATED", "").replace("_", " ")}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{relativeTime}</span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <button
                                type="button"
                                className="opacity-0 group-hover:opacity-100 inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-all"
                                aria-label="Timeline actions"
                              />
                            }
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => openEditDialog(activity)}>
                              <Pencil className="h-3.5 w-3.5" />
                              <span>Edit Entry</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem destructive onClick={() => setDeletingActivity(activity)}>
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete Entry</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed text-zinc-800 dark:text-zinc-300 font-sans">
                      {activity.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!editingActivity} onOpenChange={(open) => !open && setEditingActivity(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Timeline Entry</DialogTitle>
            <DialogDescription>
              Update the visible description for this activity timeline entry.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            disabled={isPending}
            className="min-h-[120px]"
            maxLength={1000}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setEditingActivity(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isPending || !editDescription.trim()}
              onClick={handleSaveEdit}
              className="text-xs"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingActivity}
        onOpenChange={(open) => {
          if (!open && !isPending) setDeletingActivity(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Timeline Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected activity entry will be
              permanently removed from the case timeline.
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
                "Delete Entry"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
