"use client";

import { useState, useTransition } from "react";
import { 
  Building2, 
  MapPin, 
  Calendar, 
  User, 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2,
  FileText,
  UserX,
  UserCheck,
  Scale,
  Activity,
  HeartPulse,
  Car,
  FileBox,
  ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
  PoliceAndIncidentDialog,
  VictimDialog,
  AccusedDialog,
  WitnessDialog,
  VehicleDialog,
  SeizedItemDialog,
  MedicalInfoDialog,
  CourtInfoDialog
} from "./investigation-profile-dialogs";

import {
  deleteVictimAction,
  deleteAccusedAction,
  deleteWitnessAction,
  deleteVehicleAction,
  deleteSeizedItemAction,
  deleteMedicalInfoAction,
  deleteCourtInfoAction
} from "@/actions/investigation-profile.action";
const formatSafeDate = (dateVal?: string | Date | null, includeTime = false) => {
  if (!dateVal) return "Not Recorded";
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return "Not Recorded";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(includeTime && { hour: "2-digit", minute: "2-digit" }),
    timeZone: "UTC", // <-- The magic bullet. Forces Node and Chrome to agree.
  }).format(date);
};
interface CaseInvestigationProfileSectionProps {
  caseId: string;
  caseData: any; // Entire case object containing the loaded relations
}

type TabType = "admin" | "victims" | "accused" | "witnesses" | "vehicles" | "seized" | "medical" | "court";

export default function CaseInvestigationProfileSection({ caseId, caseData }: CaseInvestigationProfileSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>("admin");
  const [isPending, startTransition] = useTransition();

  // Dialog State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const [isVictimOpen, setIsVictimOpen] = useState(false);
  const [selectedVictim, setSelectedVictim] = useState<any | null>(null);

  const [isAccusedOpen, setIsAccusedOpen] = useState(false);
  const [selectedAccused, setSelectedAccused] = useState<any | null>(null);

  const [isWitnessOpen, setIsWitnessOpen] = useState(false);
  const [selectedWitness, setSelectedWitness] = useState<any | null>(null);

  const [isVehicleOpen, setIsVehicleOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);

  const [isSeizedOpen, setIsSeizedOpen] = useState(false);
  const [selectedSeized, setSelectedSeized] = useState<any | null>(null);

  const [isMedicalOpen, setIsMedicalOpen] = useState(false);
  const [selectedMedical, setSelectedMedical] = useState<any | null>(null);

  const [isCourtOpen, setIsCourtOpen] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState<any | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    type: TabType;
  } | null>(null);

  const profile = caseData.investigationProfile || null;
  const victims = caseData.victims || [];
  const accused = caseData.accused || [];
  const witnesses = caseData.witnesses || [];
  const vehicles = caseData.vehicles || [];
  const seizedItems = caseData.seizedItems || [];
  const medicalInfos = caseData.medicalInfos || [];
  const courtInfos = caseData.courtInfos || [];

  const handleDelete = () => {
    if (!deleteTarget) return;

    const target = deleteTarget;
    setDeletingId(target.id);
    startTransition(async () => {
      let response;
      if (target.type === "victims") response = await deleteVictimAction(target.id, caseId);
      else if (target.type === "accused") response = await deleteAccusedAction(target.id, caseId);
      else if (target.type === "witnesses") response = await deleteWitnessAction(target.id, caseId);
      else if (target.type === "vehicles") response = await deleteVehicleAction(target.id, caseId);
      else if (target.type === "seized") response = await deleteSeizedItemAction(target.id, caseId);
      else if (target.type === "medical") response = await deleteMedicalInfoAction(target.id, caseId);
      else if (target.type === "court") response = await deleteCourtInfoAction(target.id, caseId);

      if (response && !response.success) {
        toast.error(response.message || `Failed to delete ${target.name}.`);
      } else {
        toast.success(`${target.name} has been deleted successfully.`);
        setDeleteTarget(null);
      }
      setDeletingId(null);
    });
  };

  const tabs: { value: TabType; label: string; count?: number; icon: any }[] = [
    { value: "admin", label: "Police & Incident", icon: Building2 },
    { value: "victims", label: "Victims", count: victims.length, icon: HeartPulse },
    { value: "accused", label: "Accused / Suspects", count: accused.length, icon: UserX },
    { value: "witnesses", label: "Witnesses", count: witnesses.length, icon: UserCheck },
    { value: "vehicles", label: "Vehicles", count: vehicles.length, icon: Car },
    { value: "seized", label: "Seized Property", count: seizedItems.length, icon: FileBox },
    { value: "medical", label: "Medical", count: medicalInfos.length, icon: Activity },
    { value: "court", label: "Court Info", count: courtInfos.length, icon: Scale },
  ];

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden font-sans">
      
      {/* Title Strip */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4.5 w-4.5 text-zinc-500" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Unified Case Investigation Profile
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 uppercase">
          Single Source of Truth
        </span>
      </div>

      {/* Tab Navigation Hub */}
      <div className="flex overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-950/10 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-2 px-5 py-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 bg-zinc-50/50 dark:bg-zinc-800/40"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              <Icon className="h-4 w-4 text-zinc-400" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.25 rounded-full ${
                  isActive ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content Panel */}
      <div className="p-6">
        
        {/* TAB: Admin, Police & Incident */}
        {activeTab === "admin" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
              <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                Administrative & Incident Registry
              </h4>
              <Button
                onClick={() => setIsProfileOpen(true)}
                className="text-xs font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 h-8 px-3 cursor-pointer shadow-sm"
              >
                <Edit2 className="h-3 w-3 mr-1.5" />
                Edit Details
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Police Station */}
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-950/20 p-4 space-y-4">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                  <Building2 className="h-4 w-4 text-zinc-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">Police Information</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/40">
                    <span className="text-zinc-400">FIR Number</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{profile?.firNumber || "Not Recorded"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/40">
                    <span className="text-zinc-400">Police Station</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{profile?.policeStation || "Not Recorded"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/40">
                    <span className="text-zinc-400">Investigating Officer</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{profile?.investigatingOfficer || "Not Recorded"}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-400">Date of Registration</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {profile?.dateOfRegistration ? new Date(profile.dateOfRegistration).toLocaleDateString() : "Not Recorded"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Incident Details */}
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-950/20 p-4 space-y-4">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                  <MapPin className="h-4 w-4 text-zinc-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">Incident Details</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/40">
                    <span className="text-zinc-400">Location</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{profile?.incidentLocation || "Not Recorded"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/40">
                    <span className="text-zinc-400">Date & Time</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {profile?.incidentDateTime ? new Date(profile.incidentDateTime).toLocaleString() : "Not Recorded"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description & Notes */}
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 p-5 space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Incident Narrative Description
                </span>
                <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                  {profile?.incidentDescription || "No incident description details registered yet. Edit details to write."}
                </p>
              </div>

              <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 p-5 space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> General Investigation Notes
                </span>
                <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                  {profile?.investigationNotes || "No investigator remarks recorded. Edit details to write."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Victims */}
        {activeTab === "victims" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
              <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                Registered Victims Profile
              </h4>
              <Button
                onClick={() => { setSelectedVictim(null); setIsVictimOpen(true); }}
                className="text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 h-8 px-3 cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Victim
              </Button>
            </div>

            {victims.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                <p className="text-xs text-zinc-400 italic">No structured victim details registered.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {victims.map((v: any) => (
                  <div key={v.id} className="relative rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/10 dark:bg-zinc-950/20 p-4 space-y-3 group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                    
                    {/* Controls */}
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setSelectedVictim(v); setIsVictimOpen(true); }} className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button onClick={() => setDeleteTarget({ id: v.id, name: v.person.name, type: "victims" })} disabled={deletingId === v.id} className="p-1 rounded text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
                        {deletingId === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <h5 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{v.person.name}</h5>
                      <div className="flex gap-2 text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">{v.status || "Stable"}</span>
                        {v.person.phone && <span className="text-zinc-400">Phone: {v.person.phone}</span>}
                      </div>
                    </div>

                    {v.injuryDetails && (
                      <div className="text-[11px] font-sans">
                        <span className="text-zinc-400 block font-semibold text-[9px] uppercase tracking-wider font-mono">Injury / Medical Severity</span>
                        <span className="text-zinc-700 dark:text-zinc-300">{v.injuryDetails}</span>
                      </div>
                    )}

                    {v.person.address && (
                      <div className="text-[11px] font-sans">
                        <span className="text-zinc-400 block font-semibold text-[9px] uppercase tracking-wider font-mono">Address</span>
                        <span className="text-zinc-700 dark:text-zinc-300">{v.person.address}</span>
                      </div>
                    )}

                    {v.person.statement && (
                      <div className="text-[11px] font-sans bg-zinc-50 dark:bg-zinc-900/40 p-2.5 rounded border border-zinc-100 dark:border-zinc-800/40">
                        <span className="text-zinc-400 block font-semibold text-[9px] uppercase tracking-wider font-mono mb-1">Recorded Statement</span>
                        <span className="text-zinc-600 dark:text-zinc-350 italic">&ldquo;{v.person.statement}&rdquo;</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Accused */}
        {activeTab === "accused" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
              <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                Registered Suspects & Accused Profile
              </h4>
              <Button
                onClick={() => { setSelectedAccused(null); setIsAccusedOpen(true); }}
                className="text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 h-8 px-3 cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Accused
              </Button>
            </div>

            {accused.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                <p className="text-xs text-zinc-400 italic">No structured accused profiles registered.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {accused.map((a: any) => (
                  <div key={a.id} className="relative rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/10 dark:bg-zinc-950/20 p-4 space-y-3 group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                    
                    {/* Controls */}
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setSelectedAccused(a); setIsAccusedOpen(true); }} className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button onClick={() => setDeleteTarget({ id: a.id, name: a.person.name, type: "accused" })} disabled={deletingId === a.id} className="p-1 rounded text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
                        {deletingId === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <h5 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{a.person.name}</h5>
                      <div className="flex gap-2 text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 uppercase tracking-wider">{a.arrestStatus || "Wanted"}</span>
                        {a.person.phone && <span className="text-zinc-400">Phone: {a.person.phone}</span>}
                      </div>
                    </div>

                    {a.bailDetails && (
                      <div className="text-[11px] font-sans">
                        <span className="text-zinc-400 block font-semibold text-[9px] uppercase tracking-wider font-mono">Bail Bond / Custody Details</span>
                        <span className="text-zinc-700 dark:text-zinc-300">{a.bailDetails}</span>
                      </div>
                    )}

                    {a.person.address && (
                      <div className="text-[11px] font-sans">
                        <span className="text-zinc-400 block font-semibold text-[9px] uppercase tracking-wider font-mono">Address</span>
                        <span className="text-zinc-700 dark:text-zinc-300">{a.person.address}</span>
                      </div>
                    )}

                    {a.person.statement && (
                      <div className="text-[11px] font-sans bg-zinc-50 dark:bg-zinc-900/40 p-2.5 rounded border border-zinc-100 dark:border-zinc-800/40">
                        <span className="text-zinc-400 block font-semibold text-[9px] uppercase tracking-wider font-mono mb-1">Confession / Statement</span>
                        <span className="text-zinc-600 dark:text-zinc-350 italic">&ldquo;{a.person.statement}&rdquo;</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Witnesses */}
        {activeTab === "witnesses" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
              <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                Registered Witness Testimonies
              </h4>
              <Button
                onClick={() => { setSelectedWitness(null); setIsWitnessOpen(true); }}
                className="text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 h-8 px-3 cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Witness
              </Button>
            </div>

            {witnesses.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                <p className="text-xs text-zinc-400 italic">No structured witness records registered.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {witnesses.map((w: any) => (
                  <div key={w.id} className="relative rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/10 dark:bg-zinc-950/20 p-4 space-y-3 group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                    
                    {/* Controls */}
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setSelectedWitness(w); setIsWitnessOpen(true); }} className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button onClick={() => setDeleteTarget({ id: w.id, name: w.person.name, type: "witnesses" })} disabled={deletingId === w.id} className="p-1 rounded text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
                        {deletingId === w.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <h5 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{w.person.name}</h5>
                      <div className="flex gap-2 text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 uppercase tracking-wider">{w.credibilityScore || "High"} Credibility</span>
                        {w.person.phone && <span className="text-zinc-400">Phone: {w.person.phone}</span>}
                      </div>
                    </div>

                    {w.statementDate && (
                      <div className="text-[11px] font-sans">
                        <span className="text-zinc-400 block font-semibold text-[9px] uppercase tracking-wider font-mono">Testimony Recorded Date</span>
                        <span className="text-zinc-700 dark:text-zinc-300">{new Date(w.statementDate).toLocaleDateString()}</span>
                      </div>
                    )}

                    {w.person.address && (
                      <div className="text-[11px] font-sans">
                        <span className="text-zinc-400 block font-semibold text-[9px] uppercase tracking-wider font-mono">Address</span>
                        <span className="text-zinc-700 dark:text-zinc-300">{w.person.address}</span>
                      </div>
                    )}

                    {w.person.statement && (
                      <div className="text-[11px] font-sans bg-zinc-50 dark:bg-zinc-900/40 p-2.5 rounded border border-zinc-100 dark:border-zinc-800/40">
                        <span className="text-zinc-400 block font-semibold text-[9px] uppercase tracking-wider font-mono mb-1">Verbatim Statement</span>
                        <span className="text-zinc-600 dark:text-zinc-350 italic">&ldquo;{w.person.statement}&rdquo;</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Vehicles */}
        {activeTab === "vehicles" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
              <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                Implicated Vehicles Registry
              </h4>
              <Button
                onClick={() => { setSelectedVehicle(null); setIsVehicleOpen(true); }}
                className="text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 h-8 px-3 cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Vehicle
              </Button>
            </div>

            {vehicles.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                <p className="text-xs text-zinc-400 italic">No vehicles associated with this case.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {vehicles.map((vh: any) => (
                  <div key={vh.id} className="relative rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/10 dark:bg-zinc-950/20 p-4 space-y-3 group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                    
                    {/* Controls */}
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setSelectedVehicle(vh); setIsVehicleOpen(true); }} className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button onClick={() => setDeleteTarget({ id: vh.id, name: vh.licensePlate || "Vehicle", type: "vehicles" })} disabled={deletingId === vh.id} className="p-1 rounded text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
                        {deletingId === vh.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <h5 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{vh.color || ""} {vh.make || ""} {vh.model || ""} {vh.year ? `(${vh.year})` : ""}</h5>
                      <div className="flex gap-2 text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold uppercase tracking-wider">{vh.licensePlate || "No Plate Number"}</span>
                        <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 uppercase tracking-wider">{vh.seizureStatus || "Wanted"}</span>
                      </div>
                    </div>

                    <div className="grid gap-2 grid-cols-2 text-[11px] leading-relaxed">
                      {vh.registrationState && (
                        <div>
                          <span className="text-zinc-400 block font-semibold text-[8px] uppercase tracking-wider font-mono">Reg. State</span>
                          <span className="text-zinc-800 dark:text-zinc-200">{vh.registrationState}</span>
                        </div>
                      )}
                      {vh.ownerName && (
                        <div>
                          <span className="text-zinc-400 block font-semibold text-[8px] uppercase tracking-wider font-mono">Registered Owner</span>
                          <span className="text-zinc-800 dark:text-zinc-200">{vh.ownerName}</span>
                        </div>
                      )}
                    </div>

                    {vh.notes && (
                      <div className="text-[11px] font-sans bg-zinc-50 dark:bg-zinc-900/40 p-2.5 rounded border border-zinc-100 dark:border-zinc-800/40">
                        <span className="text-zinc-400 block font-semibold text-[9px] uppercase tracking-wider font-mono mb-1">Remarks / Location Tracked</span>
                        <span className="text-zinc-600 dark:text-zinc-350">{vh.notes}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Seized Property */}
        {activeTab === "seized" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
              <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                Seized Property & Evidence Inventory (Malkhana)
              </h4>
              <Button
                onClick={() => { setSelectedSeized(null); setIsSeizedOpen(true); }}
                className="text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 h-8 px-3 cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </Button>
            </div>

            {seizedItems.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                <p className="text-xs text-zinc-400 italic">No seized items cataloged.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {seizedItems.map((si: any) => (
                  <div key={si.id} className="relative rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/10 dark:bg-zinc-950/20 p-4 space-y-3 group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                    
                    {/* Controls */}
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setSelectedSeized(si); setIsSeizedOpen(true); }} className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button onClick={() => setDeleteTarget({ id: si.id, name: si.itemName, type: "seized" })} disabled={deletingId === si.id} className="p-1 rounded text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
                        {deletingId === si.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <h5 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{si.itemName}</h5>
                      <div className="flex gap-2 text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-750 dark:text-zinc-300 uppercase tracking-wider">{si.status || "In Custody"}</span>
                        {si.serialNumber && <span className="text-zinc-400">SN: {si.serialNumber}</span>}
                      </div>
                    </div>

                    <div className="grid gap-2 grid-cols-2 text-[11px] leading-relaxed">
                      {si.seizureLocation && (
                        <div>
                          <span className="text-zinc-400 block font-semibold text-[8px] uppercase tracking-wider font-mono">Seizure Location</span>
                          <span className="text-zinc-800 dark:text-zinc-200">{si.seizureLocation}</span>
                        </div>
                      )}
                      {si.seizureDate && (
                        <div>
                          <span className="text-zinc-400 block font-semibold text-[8px] uppercase tracking-wider font-mono">Seizure Date</span>
                          <span className="text-zinc-800 dark:text-zinc-200">{new Date(si.seizureDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-2 grid-cols-2 text-[11px] leading-relaxed">
                      {si.officerInCharge && (
                        <div>
                          <span className="text-zinc-400 block font-semibold text-[8px] uppercase tracking-wider font-mono">Officer In Charge</span>
                          <span className="text-zinc-800 dark:text-zinc-200">{si.officerInCharge}</span>
                        </div>
                      )}
                      {si.storageLocation && (
                        <div>
                          <span className="text-zinc-400 block font-semibold text-[8px] uppercase tracking-wider font-mono">Storage Room Locker</span>
                          <span className="text-zinc-800 dark:text-zinc-200">{si.storageLocation}</span>
                        </div>
                      )}
                    </div>

                    {si.description && (
                      <div className="text-[11px] font-sans bg-zinc-50 dark:bg-zinc-900/40 p-2.5 rounded border border-zinc-100 dark:border-zinc-800/40">
                        <span className="text-zinc-400 block font-semibold text-[9px] uppercase tracking-wider font-mono mb-1">Item Description Remarks</span>
                        <span className="text-zinc-600 dark:text-zinc-350">{si.description}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Medical */}
        {activeTab === "medical" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
              <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                Medico-Legal Reports & Clinical Logs (MLC)
              </h4>
              <Button
                onClick={() => { setSelectedMedical(null); setIsMedicalOpen(true); }}
                className="text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 h-8 px-3 cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Medical Record
              </Button>
            </div>

            {medicalInfos.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                <p className="text-xs text-zinc-400 italic">No medical diagnostic records cataloged.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {medicalInfos.map((m: any) => (
                  <div key={m.id} className="relative rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/10 dark:bg-zinc-950/20 p-4 space-y-3 group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                    
                    {/* Controls */}
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setSelectedMedical(m); setIsMedicalOpen(true); }} className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button onClick={() => setDeleteTarget({ id: m.id, name: m.medicalReportNo || "Medical Info", type: "medical" })} disabled={deletingId === m.id} className="p-1 rounded text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
                        {deletingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <h5 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{m.hospitalName || "Hospital Unspecified"}</h5>
                      <div className="flex gap-2 text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-750 dark:text-zinc-300 font-bold uppercase tracking-wider">Report No: {m.medicalReportNo || "N/A"}</span>
                        <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 uppercase tracking-wider">{m.severity || "Mild"} Severity</span>
                      </div>
                    </div>

                    <div className="grid gap-2 grid-cols-2 text-[11px] leading-relaxed">
                      {m.doctorName && (
                        <div>
                          <span className="text-zinc-400 block font-semibold text-[8px] uppercase tracking-wider font-mono">Examining Doctor</span>
                          <span className="text-zinc-800 dark:text-zinc-200">{m.doctorName}</span>
                        </div>
                      )}
                      {m.admissionDate && (
                        <div>
                          <span className="text-zinc-400 block font-semibold text-[8px] uppercase tracking-wider font-mono">Admission Date</span>
                          <span className="text-zinc-800 dark:text-zinc-200">{new Date(m.admissionDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {m.injuryType && (
                      <div className="text-[11px] font-sans">
                        <span className="text-zinc-400 block font-semibold text-[9px] uppercase tracking-wider font-mono">Injury Classification</span>
                        <span className="text-zinc-700 dark:text-zinc-300">{m.injuryType}</span>
                      </div>
                    )}

                    {m.treatmentDetails && (
                      <div className="text-[11px] font-sans bg-zinc-50 dark:bg-zinc-900/40 p-2.5 rounded border border-zinc-100 dark:border-zinc-800/40">
                        <span className="text-zinc-400 block font-semibold text-[9px] uppercase tracking-wider font-mono mb-1">Clinical Treatment Details</span>
                        <span className="text-zinc-600 dark:text-zinc-350">{m.treatmentDetails}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Court Info */}
        {activeTab === "court" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
              <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                Judiciary & Court Trial Proceedings (CNR Registry)
              </h4>
              <Button
                onClick={() => { setSelectedCourt(null); setIsCourtOpen(true); }}
                className="text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 h-8 px-3 cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Court Entry
              </Button>
            </div>

            {courtInfos.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1">
                <p className="text-xs text-zinc-400 italic">No court case trials registered.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {courtInfos.map((c: any) => (
                  <div key={c.id} className="relative rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/10 dark:bg-zinc-950/20 p-4 space-y-3 group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                    
                    {/* Controls */}
                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setSelectedCourt(c); setIsCourtOpen(true); }} className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button onClick={() => setDeleteTarget({ id: c.id, name: c.caseNumber || "Court Entry", type: "court" })} disabled={deletingId === c.id} className="p-1 rounded text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer">
                        {deletingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <h5 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{c.courtName || "Court Unspecified"}</h5>
                      <div className="flex gap-2 text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-750 dark:text-zinc-300 font-bold uppercase tracking-wider">CNR: {c.caseNumber || "N/A"}</span>
                        <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 uppercase tracking-wider">{c.currentStatus || "Hearing"}</span>
                      </div>
                    </div>

                    <div className="grid gap-2 grid-cols-2 text-[11px] leading-relaxed">
                      {c.judgeName && (
                        <div>
                          <span className="text-zinc-400 block font-semibold text-[8px] uppercase tracking-wider font-mono">Presiding Judge</span>
                          <span className="text-zinc-800 dark:text-zinc-200">{c.judgeName}</span>
                        </div>
                      )}
                      {c.nextHearingDate && (
                        <div>
                          <span className="text-zinc-400 block font-semibold text-[8px] uppercase tracking-wider font-mono">Next Hearing Date</span>
                          <span className="text-zinc-800 dark:text-zinc-200">{new Date(c.nextHearingDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-2 grid-cols-2 text-[11px] leading-relaxed">
                      {c.chargesheetFiledDate && (
                        <div>
                          <span className="text-zinc-400 block font-semibold text-[8px] uppercase tracking-wider font-mono">Chargesheet Filed Date</span>
                          <span className="text-zinc-800 dark:text-zinc-200">{new Date(c.chargesheetFiledDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {c.judgementDetails && (
                      <div className="text-[11px] font-sans bg-zinc-50 dark:bg-zinc-900/40 p-2.5 rounded border border-zinc-100 dark:border-zinc-800/40">
                        <span className="text-zinc-400 block font-semibold text-[9px] uppercase tracking-wider font-mono mb-1">Judgement / Trial remarks</span>
                        <span className="text-zinc-600 dark:text-zinc-350">{c.judgementDetails}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* --- ALL FORM DIALOGS MODALS --- */}
      <PoliceAndIncidentDialog
        isOpen={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        caseId={caseId}
        profile={profile}
      />

      <VictimDialog
        isOpen={isVictimOpen}
        onOpenChange={setIsVictimOpen}
        caseId={caseId}
        victim={selectedVictim}
      />

      <AccusedDialog
        isOpen={isAccusedOpen}
        onOpenChange={setIsAccusedOpen}
        caseId={caseId}
        accused={selectedAccused}
      />

      <WitnessDialog
        isOpen={isWitnessOpen}
        onOpenChange={setIsWitnessOpen}
        caseId={caseId}
        witness={selectedWitness}
      />

      <VehicleDialog
        isOpen={isVehicleOpen}
        onOpenChange={setIsVehicleOpen}
        caseId={caseId}
        vehicle={selectedVehicle}
      />

      <SeizedItemDialog
        isOpen={isSeizedOpen}
        onOpenChange={setIsSeizedOpen}
        caseId={caseId}
        item={selectedSeized}
      />

      <MedicalInfoDialog
        isOpen={isMedicalOpen}
        onOpenChange={setIsMedicalOpen}
        caseId={caseId}
        medicalInfo={selectedMedical}
      />

      <CourtInfoDialog
        isOpen={isCourtOpen}
        onOpenChange={setIsCourtOpen}
        caseId={caseId}
        courtInfo={selectedCourt}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deletingId) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Investigation Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected record will be
              permanently removed from this case investigation profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={!!deletingId}>
              {deletingId ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  Deleting...
                </>
              ) : (
                "Delete Record"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
