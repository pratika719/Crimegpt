"use client";

import { useState, useTransition } from "react";
import { 
  UserPlus, 
  HeartHandshake, 
  ShieldAlert, 
  Eye, 
  ShieldCheck, 
  Phone, 
  MapPin, 
  FileText, 
  Clipboard, 
  Edit2, 
  Trash2, 
  Loader2,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonFormDialog } from "./person-form-dialog";
import { deletePersonAction } from "@/actions/person.action";
import { toast } from "sonner";

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

interface CasePersonsSectionProps {
  caseId: string;
  initialPersons: Person[];
}

export default function CasePersonsSection({ caseId, initialPersons }: CasePersonsSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Group persons by role
  const victims = initialPersons.filter((p) => p.role === "VICTIM");
  const suspects = initialPersons.filter((p) => p.role === "SUSPECT");
  const witnesses = initialPersons.filter((p) => p.role === "WITNESS");
  const officers = initialPersons.filter((p) => p.role === "OFFICER");

  const handleAddPerson = () => {
    setEditingPerson(null);
    setIsFormOpen(true);
  };

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person);
    setIsFormOpen(true);
  };

  const handleDeletePerson = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this case profile?`)) {
      return;
    }
    
    setDeletingId(id);
    startTransition(async () => {
      const response = await deletePersonAction(id, caseId);
      if (!response.success) {
        toast.error(response.message || "Failed to delete person.");
      } else {
        toast.success(`${name} has been removed from the case dossier.`);
      }
      setDeletingId(null);
    });
  };

  // Render a specific group column
  const renderGroupColumn = (
    title: string, 
    persons: Person[], 
    icon: any, 
    headerColorClass: string,
    emptyText: string
  ) => {
    const Icon = icon;
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden flex flex-col min-h-[300px]">
        {/* Header strip */}
        <div className={`px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between ${headerColorClass}`}>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider">{title}</span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-white/40 dark:bg-zinc-800/40 px-2 py-0.5 rounded-full">
            {persons.length}
          </span>
        </div>

        {/* Content list */}
        <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[480px]">
          {persons.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-10 text-zinc-400 dark:text-zinc-500 space-y-1">
              <span className="text-xs font-sans italic">{emptyText}</span>
            </div>
          ) : (
            persons.map((person) => (
              <div 
                key={person.id} 
                className="group/card relative rounded-lg border border-zinc-150 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-950/20 p-3.5 space-y-2.5 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm"
              >
                {/* Edit/Delete overlay controls */}
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditPerson(person)}
                    disabled={isPending}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                    title="Edit Profile"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDeletePerson(person.id, person.name)}
                    disabled={isPending || deletingId === person.id}
                    className="p-1 rounded text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                    title="Delete Record"
                  >
                    {deletingId === person.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </button>
                </div>

                {/* Name */}
                <div className="pr-12">
                  <h5 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 font-sans tracking-tight leading-none">
                    {person.name}
                  </h5>
                </div>

                {/* Body Meta fields */}
                <div className="space-y-1.5 text-[11px] leading-relaxed font-sans text-zinc-500 dark:text-zinc-400">
                  {person.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 flex-shrink-0 text-zinc-450" />
                      <span>{person.phone}</span>
                    </div>
                  )}
                  {person.address && (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0 text-zinc-450" />
                      <span className="line-clamp-1">{person.address}</span>
                    </div>
                  )}
                  {person.statement && (
                    <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800/40">
                      <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono mb-0.5 flex items-center gap-1">
                        <FileText className="h-2.5 w-2.5" /> Statement
                      </span>
                      <p className="text-zinc-700 dark:text-zinc-350 line-clamp-3 italic text-[11px] leading-normal bg-zinc-50/50 dark:bg-zinc-900/40 p-2 rounded">
                        &quot;{person.statement}&quot;
                      </p>
                    </div>
                  )}
                  {person.notes && (
                    <div className="pt-1">
                      <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono mb-0.5 flex items-center gap-1">
                        <Clipboard className="h-2.5 w-2.5" /> Notes
                      </span>
                      <p className="text-zinc-650 dark:text-zinc-400 line-clamp-2 text-[11px]">
                        {person.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Title strip */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4.5 w-4.5 text-zinc-500" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Case Persons involved Profile
          </h2>
        </div>

        <Button 
          onClick={handleAddPerson}
          className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 h-auto shadow-sm"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Register Person
        </Button>
      </div>

      {/* Grid of Columns */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Victims Column */}
        {renderGroupColumn(
          "Victims & Complainants", 
          victims, 
          HeartHandshake, 
          "bg-emerald-50/30 text-emerald-800 dark:bg-emerald-950/10 dark:text-emerald-400",
          "No registered victims"
        )}

        {/* Suspects Column */}
        {renderGroupColumn(
          "Accused & Suspects", 
          suspects, 
          ShieldAlert, 
          "bg-rose-50/30 text-rose-800 dark:bg-rose-950/10 dark:text-rose-400",
          "No suspect profiles"
        )}

        {/* Witnesses Column */}
        {renderGroupColumn(
          "Witness Records", 
          witnesses, 
          Eye, 
          "bg-blue-50/30 text-blue-800 dark:bg-blue-950/10 dark:text-blue-400",
          "No witness records"
        )}

        {/* Officers Column */}
        {renderGroupColumn(
          "Investigating Officers", 
          officers, 
          ShieldCheck, 
          "bg-amber-50/30 text-amber-800 dark:bg-amber-950/10 dark:text-amber-400",
          "No assigned officers"
        )}
      </div>

      {/* Modal Dialog Form */}
      <PersonFormDialog
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        caseId={caseId}
        person={editingPerson}
      />
    </div>
  );
}
