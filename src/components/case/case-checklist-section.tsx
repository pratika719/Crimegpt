"use client";

import { useState, useTransition, FormEvent } from "react";
import { 
  CheckSquare, 
  Trash2, 
  Plus, 
  Loader2, 
  ClipboardCheck, 
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  createChecklistItemAction, 
  toggleChecklistItemAction, 
  deleteChecklistItemAction 
} from "@/actions/checklist.action";
import { toast } from "sonner";

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  completedAt: Date | string | null;
  createdAt: Date | string;
}

interface CaseChecklistSectionProps {
  caseId: string;
  initialChecklist: ChecklistItem[];
}

export default function CaseChecklistSection({ caseId, initialChecklist }: CaseChecklistSectionProps) {
  const [newTitle, setNewTitle] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [, startTransition] = useTransition();

  const totalTasks = initialChecklist.length;
  const completedTasks = initialChecklist.filter(item => item.completed).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleAddTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (newTitle.trim().length > 200) {
      toast.error("Task title cannot exceed 200 characters.");
      return;
    }

    setIsAdding(true);
    try {
      const res = await createChecklistItemAction(caseId, newTitle.trim());
      if (res.success) {
        setNewTitle("");
        toast.success("Task added to investigation checklist.");
      } else {
        toast.error(res.message || "Failed to create task.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while adding the task.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleTask = (id: string, currentCompleted: boolean) => {
    const targetCompleted = !currentCompleted;
    setUpdatingId(id);
    startTransition(async () => {
      try {
        const res = await toggleChecklistItemAction(id, caseId, targetCompleted);
        if (res.success) {
          toast.success(
            targetCompleted 
              ? "Task marked as completed and logged to timeline." 
              : "Task marked as incomplete."
          );
        } else {
          toast.error(res.message || "Failed to update task.");
        }
      } catch (err) {
        console.error(err);
        toast.error("An error occurred while updating the task.");
      } finally {
        setUpdatingId(null);
      }
    });
  };

  const handleDeleteTask = (id: string, title: string) => {
    if (!confirm(`Are you sure you want to remove the task "${title}"?`)) {
      return;
    }

    setDeletingId(id);
    startTransition(async () => {
      try {
        const res = await deleteChecklistItemAction(id, caseId);
        if (res.success) {
          toast.success("Task removed from checklist.");
        } else {
          toast.error(res.message || "Failed to delete task.");
        }
      } catch (err) {
        console.error(err);
        toast.error("An error occurred while deleting the task.");
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Title Strip */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4.5 w-4.5 text-zinc-500" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Investigation Procedures Checklist
          </h2>
        </div>
        <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
          {completedTasks} / {totalTasks} Completed
        </span>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden p-5 md:p-6 space-y-6">
        
        {/* Completeness Tracker Panel */}
        <div className="bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-800/55 rounded-xl p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <span>Procedure Completion Rate</span>
            </div>
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              {completedTasks} / {totalTasks} Tasks Resolved ({progressPercent}%)
            </div>
          </div>
          <div className="flex-1 md:max-w-xs w-full space-y-2">
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400">
              <span>INCOMPLETE: {totalTasks - completedTasks}</span>
              <span>COMPLETED: {completedTasks}</span>
            </div>
          </div>
        </div>

        {/* Input Bar to Create New Item */}
        <form onSubmit={handleAddTask} className="flex gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={isAdding}
            placeholder="Add a new mandatory procedure (e.g. 'Secure CCTV feed', 'Acquire suspect logs')..."
            className="flex-1 text-xs font-sans h-9 bg-zinc-50/40 focus:bg-white dark:bg-zinc-950/40 dark:focus:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
          />
          <Button
            type="submit"
            disabled={isAdding || !newTitle.trim()}
            className="h-9 px-4 bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            {isAdding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Add
          </Button>
        </form>

        {/* List of Checklist Items */}
        {totalTasks === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center flex flex-col items-center justify-center space-y-2">
            <AlertCircle className="h-7 w-7 text-zinc-350 dark:text-zinc-600" />
            <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">No procedures assigned</h4>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 max-w-sm">
              Use the field above to register procedural checklist actions needed for this investigation.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {initialChecklist.map((item) => {
              const isUpdating = updatingId === item.id;
              const isDeleting = deletingId === item.id;
              
              return (
                <div
                  key={item.id}
                  className={`group flex items-center justify-between p-3 rounded-lg border transition-all ${
                    item.completed 
                      ? "border-zinc-200 bg-zinc-50/30 dark:border-zinc-800/50 dark:bg-zinc-950/10 opacity-70"
                      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 hover:border-zinc-350 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center flex-1 mr-4">
                    {/* Checkbox Button */}
                    <button
                      type="button"
                      disabled={isUpdating || isDeleting}
                      onClick={() => handleToggleTask(item.id, item.completed)}
                      className={`flex items-center justify-center h-4 w-4 rounded border transition-colors cursor-pointer mr-3 flex-shrink-0 focus:outline-none ${
                        item.completed
                          ? "bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500 text-white"
                          : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 hover:border-indigo-500 dark:hover:border-indigo-400"
                      }`}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin text-zinc-400 dark:text-zinc-500" />
                      ) : item.completed ? (
                        <svg className="h-2.5 w-2.5 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : null}
                    </button>

                    {/* Task Title */}
                    <span 
                      onClick={() => !isUpdating && !isDeleting && handleToggleTask(item.id, item.completed)}
                      className={`text-xs font-medium cursor-pointer select-none leading-normal font-sans ${
                        item.completed 
                          ? "text-zinc-400 dark:text-zinc-500 line-through" 
                          : "text-zinc-800 dark:text-zinc-200"
                      }`}
                    >
                      {item.title}
                      {item.completed && item.completedAt && (
                        <span className="ml-2 text-[9px] font-mono font-normal text-zinc-400 dark:text-zinc-500">
                          (Resolved {new Date(item.completedAt).toLocaleDateString()})
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    disabled={isUpdating || isDeleting}
                    onClick={() => handleDeleteTask(item.id, item.title)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-zinc-400 hover:text-red-650 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
                    title="Delete Task"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
