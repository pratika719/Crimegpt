import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, AlertCircle } from "lucide-react";
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

import {
  InvestigationProfileSchema,
  VictimSchema,
  AccusedSchema,
  WitnessSchema,
  VehicleSchema,
  SeizedItemSchema,
  MedicalInformationSchema,
  CourtInformationSchema,
} from "@/schema/investigation-profile.schema";

import {
  upsertInvestigationProfileAction,
  addVictimAction,
  updateVictimAction,
  addAccusedAction,
  updateAccusedAction,
  addWitnessAction,
  updateWitnessAction,
  addVehicleAction,
  updateVehicleAction,
  addSeizedItemAction,
  updateSeizedItemAction,
  addMedicalInfoAction,
  updateMedicalInfoAction,
  addCourtInfoAction,
  updateCourtInfoAction,
} from "@/actions/investigation-profile.action";

function formatDateForInput(date: any): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

function formatDateTimeForInput(date: any): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

// --- Police, Incident & Notes Dialog ---
export function PoliceAndIncidentDialog({
  isOpen,
  onOpenChange,
  caseId,
  profile,
  onSuccess,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  profile?: any | null;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(InvestigationProfileSchema),
    values: {
      firNumber: profile?.firNumber || "",
      policeStation: profile?.policeStation || "",
      investigatingOfficer: profile?.investigatingOfficer || "",
      dateOfRegistration: formatDateForInput(profile?.dateOfRegistration),
      incidentDateTime: formatDateTimeForInput(profile?.incidentDateTime),
      incidentLocation: profile?.incidentLocation || "",
      incidentDescription: profile?.incidentDescription || "",
      investigationNotes: profile?.investigationNotes || "",
    },
  });

  const onSubmit = (values: any) => {
    startTransition(async () => {
      const data = {
        ...values,
        dateOfRegistration: values.dateOfRegistration ? new Date(values.dateOfRegistration) : null,
        incidentDateTime: values.incidentDateTime ? new Date(values.incidentDateTime) : null,
      };

      const response = await upsertInvestigationProfileAction(caseId, data);
      if (!response.success) {
        toast.error(response.message || "Failed to update profile.");
      } else {
        toast.success("Investigation Profile updated successfully.");
        onSuccess?.();
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-sans">
            Edit Police & Incident Details
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400 dark:text-zinc-500">
            Update administrative records, geographic metadata, and chronological parameters.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">FIR Number</label>
              <Input placeholder="e.g. FIR/123/2026" disabled={isPending} {...register("firNumber")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Police Station</label>
              <Input placeholder="e.g. Central Police HQ" disabled={isPending} {...register("policeStation")} />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Investigating Officer</label>
              <Input placeholder="e.g. Inspector Sharma" disabled={isPending} {...register("investigatingOfficer")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Registration Date</label>
              <Input type="date" disabled={isPending} {...register("dateOfRegistration")} />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Incident Date & Time</label>
              <Input type="datetime-local" disabled={isPending} {...register("incidentDateTime")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Incident Location</label>
              <Input placeholder="e.g. Sector-5 Mall, Delhi" disabled={isPending} {...register("incidentLocation")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Incident Description</label>
            <Textarea rows={3} placeholder="Provide details of how the incident occurred..." disabled={isPending} {...register("incidentDescription")} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Investigation Notes</label>
            <Textarea rows={3} placeholder="Investigator notes and custom observations..." disabled={isPending} {...register("investigationNotes")} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50 mt-4">
            <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)} className="text-xs font-semibold h-9 px-4">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="text-xs font-semibold h-9 px-4 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Victim Dialog ---
export function VictimDialog({
  isOpen,
  onOpenChange,
  caseId,
  victim,
  onSuccess,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  victim?: any | null;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!victim;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(VictimSchema),
    values: {
      name: victim?.person?.name || "",
      phone: victim?.person?.phone || "",
      address: victim?.person?.address || "",
      statement: victim?.person?.statement || "",
      notes: victim?.person?.notes || "",
      injuryDetails: victim?.injuryDetails || "",
      status: victim?.status || "Unharmed",
    },
  });

  const onSubmit = (values: any) => {
    startTransition(async () => {
      let response;
      if (isEdit && victim) {
        response = await updateVictimAction(victim.id, caseId, values);
      } else {
        response = await addVictimAction(caseId, values);
      }

      if (!response.success) {
        toast.error(response.message || "Failed to save victim.");
      } else {
        toast.success(`Victim ${isEdit ? "updated" : "added"} successfully.`);
        onSuccess?.();
        onOpenChange(false);
        if (!isEdit) reset();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-sans">
            {isEdit ? "Edit Victim Record" : "Add Victim to Profile"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Full Name *</label>
            <Input placeholder="John Doe" disabled={isPending} {...register("name")} />
            {errors.name && <p className="text-[10px] text-red-500 font-mono flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.name.message as string}</p>}
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Phone</label>
              <Input placeholder="+91 XXXXX XXXXX" disabled={isPending} {...register("phone")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Medical Status</label>
              <select disabled={isPending} className="flex h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1.5 text-xs" {...register("status")}>
                <option value="Unharmed">Unharmed</option>
                <option value="Stable">Stable</option>
                <option value="Injured">Injured</option>
                <option value="Deceased">Deceased</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Address</label>
            <Input placeholder="Mailing address" disabled={isPending} {...register("address")} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Injury Details</label>
            <Input placeholder="e.g. Blunt force trauma on shoulder" disabled={isPending} {...register("injuryDetails")} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Statement</label>
            <Textarea rows={2} placeholder="Verbatim victim statement..." disabled={isPending} {...register("statement")} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Profile Notes</label>
            <Textarea rows={2} placeholder="Internal observations..." disabled={isPending} {...register("notes")} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50 mt-4">
            <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)} className="text-xs font-semibold h-9 px-4">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="text-xs font-semibold h-9 px-4 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {isEdit ? "Save Changes" : "Add Victim"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Accused Dialog ---
export function AccusedDialog({
  isOpen,
  onOpenChange,
  caseId,
  accused,
  onSuccess,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  accused?: any | null;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!accused;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(AccusedSchema),
    values: {
      name: accused?.person?.name || "",
      phone: accused?.person?.phone || "",
      address: accused?.person?.address || "",
      statement: accused?.person?.statement || "",
      notes: accused?.person?.notes || "",
      arrestStatus: accused?.arrestStatus || "Absconding",
      bailDetails: accused?.bailDetails || "",
    },
  });

  const onSubmit = (values: any) => {
    startTransition(async () => {
      let response;
      if (isEdit && accused) {
        response = await updateAccusedAction(accused.id, caseId, values);
      } else {
        response = await addAccusedAction(caseId, values);
      }

      if (!response.success) {
        toast.error(response.message || "Failed to save accused.");
      } else {
        toast.success(`Accused ${isEdit ? "updated" : "added"} successfully.`);
        onSuccess?.();
        onOpenChange(false);
        if (!isEdit) reset();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-sans">
            {isEdit ? "Edit Accused Record" : "Add Accused/Suspect"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Full Name *</label>
            <Input placeholder="e.g. Ramesh Kumar" disabled={isPending} {...register("name")} />
            {errors.name && <p className="text-[10px] text-red-500 font-mono flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.name.message as string}</p>}
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Phone</label>
              <Input placeholder="+91 XXXXX XXXXX" disabled={isPending} {...register("phone")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Arrest Status</label>
              <select disabled={isPending} className="flex h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1.5 text-xs" {...register("arrestStatus")}>
                <option value="Absconding">Absconding</option>
                <option value="Wanted">Wanted / Under Suspect</option>
                <option value="Arrested">Arrested</option>
                <option value="Custody">In Police Custody</option>
                <option value="On Bail">On Bail</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Address</label>
            <Input placeholder="Last known address" disabled={isPending} {...register("address")} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Bail Details</label>
            <Input placeholder="Bail bond information, court orders..." disabled={isPending} {...register("bailDetails")} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Statement</label>
            <Textarea rows={2} placeholder="Accused/Suspect confession or testimony..." disabled={isPending} {...register("statement")} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Profile Notes</label>
            <Textarea rows={2} placeholder="Internal observations..." disabled={isPending} {...register("notes")} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50 mt-4">
            <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)} className="text-xs font-semibold h-9 px-4">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="text-xs font-semibold h-9 px-4 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {isEdit ? "Save Changes" : "Add Accused"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Witness Dialog ---
export function WitnessDialog({
  isOpen,
  onOpenChange,
  caseId,
  witness,
  onSuccess,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  witness?: any | null;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!witness;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(WitnessSchema),
    values: {
      name: witness?.person?.name || "",
      phone: witness?.person?.phone || "",
      address: witness?.person?.address || "",
      statement: witness?.person?.statement || "",
      notes: witness?.person?.notes || "",
      statementDate: formatDateForInput(witness?.statementDate),
      credibilityScore: witness?.credibilityScore || "High",
    },
  });

  const onSubmit = (values: any) => {
    startTransition(async () => {
      const data = {
        ...values,
        statementDate: values.statementDate ? new Date(values.statementDate) : null,
      };

      let response;
      if (isEdit && witness) {
        response = await updateWitnessAction(witness.id, caseId, data);
      } else {
        response = await addWitnessAction(caseId, data);
      }

      if (!response.success) {
        toast.error(response.message || "Failed to save witness.");
      } else {
        toast.success(`Witness ${isEdit ? "updated" : "added"} successfully.`);
        onSuccess?.();
        onOpenChange(false);
        if (!isEdit) reset();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-sans">
            {isEdit ? "Edit Witness Record" : "Add Witness to Profile"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Full Name *</label>
            <Input placeholder="e.g. Suresh Kumar" disabled={isPending} {...register("name")} />
            {errors.name && <p className="text-[10px] text-red-500 font-mono flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.name.message as string}</p>}
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Phone</label>
              <Input placeholder="+91 XXXXX XXXXX" disabled={isPending} {...register("phone")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Credibility Score</label>
              <select disabled={isPending} className="flex h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1.5 text-xs" {...register("credibilityScore")}>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Address</label>
              <Input placeholder="Witness address" disabled={isPending} {...register("address")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Statement Date</label>
              <Input type="date" disabled={isPending} {...register("statementDate")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Statement Details</label>
            <Textarea rows={2} placeholder="Verbatim testimony given by witness..." disabled={isPending} {...register("statement")} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Internal Notes</label>
            <Textarea rows={2} placeholder="Investigator remarks on witness..." disabled={isPending} {...register("notes")} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50 mt-4">
            <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)} className="text-xs font-semibold h-9 px-4">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="text-xs font-semibold h-9 px-4 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {isEdit ? "Save Changes" : "Add Witness"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Vehicle Dialog ---
export function VehicleDialog({
  isOpen,
  onOpenChange,
  caseId,
  vehicle,
  onSuccess,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  vehicle?: any | null;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!vehicle;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(VehicleSchema),
    values: {
      make: vehicle?.make || "",
      model: vehicle?.model || "",
      year: vehicle?.year || "",
      color: vehicle?.color || "",
      licensePlate: vehicle?.licensePlate || "",
      registrationState: vehicle?.registrationState || "",
      ownerName: vehicle?.ownerName || "",
      seizureStatus: vehicle?.seizureStatus || "Wanted",
      notes: vehicle?.notes || "",
    },
  });

  const onSubmit = (values: any) => {
    startTransition(async () => {
      let response;
      if (isEdit && vehicle) {
        response = await updateVehicleAction(vehicle.id, caseId, values);
      } else {
        response = await addVehicleAction(caseId, values);
      }

      if (!response.success) {
        toast.error(response.message || "Failed to save vehicle.");
      } else {
        toast.success(`Vehicle ${isEdit ? "updated" : "added"} successfully.`);
        onSuccess?.();
        onOpenChange(false);
        if (!isEdit) reset();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-sans">
            {isEdit ? "Edit Vehicle Record" : "Add Vehicle to Profile"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Make</label>
              <Input placeholder="e.g. Maruti Suzuki" disabled={isPending} {...register("make")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Model</label>
              <Input placeholder="e.g. Swift" disabled={isPending} {...register("model")} />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Year</label>
              <Input type="number" placeholder="2020" disabled={isPending} {...register("year")} />
              {errors.year && <p className="text-[9px] text-red-500 font-mono">Invalid</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Color</label>
              <Input placeholder="e.g. White" disabled={isPending} {...register("color")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Seizure Status</label>
              <select disabled={isPending} className="flex h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1.5 text-xs" {...register("seizureStatus")}>
                <option value="Wanted">Wanted / Tracked</option>
                <option value="Seized">Seized</option>
                <option value="Released">Released</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Plate Number</label>
              <Input placeholder="e.g. DL-3C-AS-1234" disabled={isPending} {...register("licensePlate")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Reg. State</label>
              <Input placeholder="e.g. Delhi" disabled={isPending} {...register("registrationState")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Registered Owner</label>
            <Input placeholder="Full Name of Owner" disabled={isPending} {...register("ownerName")} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Observations / Remarks</label>
            <Textarea rows={2} placeholder="Vehicle damage, tracking details..." disabled={isPending} {...register("notes")} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50 mt-4">
            <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)} className="text-xs font-semibold h-9 px-4">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="text-xs font-semibold h-9 px-4 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {isEdit ? "Save Changes" : "Add Vehicle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Seized Item Dialog ---
export function SeizedItemDialog({
  isOpen,
  onOpenChange,
  caseId,
  item,
  onSuccess,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  item?: any | null;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!item;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(SeizedItemSchema),
    values: {
      itemName: item?.itemName || "",
      description: item?.description || "",
      serialNumber: item?.serialNumber || "",
      seizureLocation: item?.seizureLocation || "",
      seizureDate: formatDateForInput(item?.seizureDate),
      officerInCharge: item?.officerInCharge || "",
      storageLocation: item?.storageLocation || "",
      status: item?.status || "In Custody",
    },
  });

  const onSubmit = (values: any) => {
    startTransition(async () => {
      const data = {
        ...values,
        seizureDate: values.seizureDate ? new Date(values.seizureDate) : null,
      };

      let response;
      if (isEdit && item) {
        response = await updateSeizedItemAction(item.id, caseId, data);
      } else {
        response = await addSeizedItemAction(caseId, data);
      }

      if (!response.success) {
        toast.error(response.message || "Failed to save seized property.");
      } else {
        toast.success(`Seized Property ${isEdit ? "updated" : "added"} successfully.`);
        onSuccess?.();
        onOpenChange(false);
        if (!isEdit) reset();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-sans">
            {isEdit ? "Edit Seized Property Record" : "Add Seized Item"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Item Name *</label>
            <Input placeholder="e.g. Leather Wallet / Black Pistol" disabled={isPending} {...register("itemName")} />
            {errors.itemName && <p className="text-[10px] text-red-500 font-mono flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.itemName.message as string}</p>}
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Serial / Batch No.</label>
              <Input placeholder="e.g. SN-987654" disabled={isPending} {...register("serialNumber")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Custody Status</label>
              <select disabled={isPending} className="flex h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1.5 text-xs" {...register("status")}>
                <option value="In Custody">In Custody</option>
                <option value="Released">Released</option>
                <option value="Destroyed">Destroyed / Disposed</option>
                <option value="In Court">Presented in Court</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Seizure Location</label>
              <Input placeholder="e.g. Room 204 Guest House" disabled={isPending} {...register("seizureLocation")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Seizure Date</label>
              <Input type="date" disabled={isPending} {...register("seizureDate")} />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Officer In Charge</label>
              <Input placeholder="e.g. Inspector Amit" disabled={isPending} {...register("officerInCharge")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Storage Room Location</label>
              <Input placeholder="e.g. Locker B-15 HQ" disabled={isPending} {...register("storageLocation")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Item Description</label>
            <Textarea rows={3} placeholder="Provide details of the item (condition, packaging, markings)..." disabled={isPending} {...register("description")} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50 mt-4">
            <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)} className="text-xs font-semibold h-9 px-4">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="text-xs font-semibold h-9 px-4 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {isEdit ? "Save Changes" : "Register Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Medical Info Dialog ---
export function MedicalInfoDialog({
  isOpen,
  onOpenChange,
  caseId,
  medicalInfo,
  onSuccess,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  medicalInfo?: any | null;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!medicalInfo;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(MedicalInformationSchema),
    values: {
      hospitalName: medicalInfo?.hospitalName || "",
      doctorName: medicalInfo?.doctorName || "",
      admissionDate: formatDateForInput(medicalInfo?.admissionDate),
      injuryType: medicalInfo?.injuryType || "",
      medicalReportNo: medicalInfo?.medicalReportNo || "",
      treatmentDetails: medicalInfo?.treatmentDetails || "",
      severity: medicalInfo?.severity || "Mild",
    },
  });

  const onSubmit = (values: any) => {
    startTransition(async () => {
      const data = {
        ...values,
        admissionDate: values.admissionDate ? new Date(values.admissionDate) : null,
      };

      let response;
      if (isEdit && medicalInfo) {
        response = await updateMedicalInfoAction(medicalInfo.id, caseId, data);
      } else {
        response = await addMedicalInfoAction(caseId, data);
      }

      if (!response.success) {
        toast.error(response.message || "Failed to save medical details.");
      } else {
        toast.success(`Medical Details ${isEdit ? "updated" : "added"} successfully.`);
        onSuccess?.();
        onOpenChange(false);
        if (!isEdit) reset();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-sans">
            {isEdit ? "Edit Medical Information" : "Add Medical Details"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Hospital Name</label>
              <Input placeholder="e.g. AIIMS Delhi" disabled={isPending} {...register("hospitalName")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Doctor Name</label>
              <Input placeholder="e.g. Dr. Verma" disabled={isPending} {...register("doctorName")} />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Admission Date</label>
              <Input type="date" disabled={isPending} {...register("admissionDate")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Medical Report No.</label>
              <Input placeholder="e.g. REP-8876" disabled={isPending} {...register("medicalReportNo")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Severity</label>
              <select disabled={isPending} className="flex h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1.5 text-xs" {...register("severity")}>
                <option value="Mild">Mild</option>
                <option value="Moderate">Moderate</option>
                <option value="Severe">Severe</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Injury / Diagnostics Type</label>
            <Input placeholder="e.g. Fracture on lower limbs" disabled={isPending} {...register("injuryType")} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Treatment details</label>
            <Textarea rows={3} placeholder="Surgical interventions, medicines prescribed..." disabled={isPending} {...register("treatmentDetails")} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50 mt-4">
            <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)} className="text-xs font-semibold h-9 px-4">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="text-xs font-semibold h-9 px-4 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {isEdit ? "Save Changes" : "Add Medical Details"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Court Info Dialog ---
export function CourtInfoDialog({
  isOpen,
  onOpenChange,
  caseId,
  courtInfo,
  onSuccess,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  courtInfo?: any | null;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!courtInfo;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(CourtInformationSchema),
    values: {
      courtName: courtInfo?.courtName || "",
      judgeName: courtInfo?.judgeName || "",
      caseNumber: courtInfo?.caseNumber || "",
      nextHearingDate: formatDateForInput(courtInfo?.nextHearingDate),
      chargesheetFiledDate: formatDateForInput(courtInfo?.chargesheetFiledDate),
      currentStatus: courtInfo?.currentStatus || "Hearing",
      judgementDetails: courtInfo?.judgementDetails || "",
    },
  });

  const onSubmit = (values: any) => {
    startTransition(async () => {
      const data = {
        ...values,
        nextHearingDate: values.nextHearingDate ? new Date(values.nextHearingDate) : null,
        chargesheetFiledDate: values.chargesheetFiledDate ? new Date(values.chargesheetFiledDate) : null,
      };

      let response;
      if (isEdit && courtInfo) {
        response = await updateCourtInfoAction(courtInfo.id, caseId, data);
      } else {
        response = await addCourtInfoAction(caseId, data);
      }

      if (!response.success) {
        toast.error(response.message || "Failed to save court details.");
      } else {
        toast.success(`Court Registry ${isEdit ? "updated" : "added"} successfully.`);
        onSuccess?.();
        onOpenChange(false);
        if (!isEdit) reset();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 font-sans">
            {isEdit ? "Edit Court Registry" : "Add Court Status"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Court Name</label>
              <Input placeholder="e.g. District Sessions Court" disabled={isPending} {...register("courtName")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Judge Name</label>
              <Input placeholder="e.g. Hon. Justice Sahay" disabled={isPending} {...register("judgeName")} />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Court Case No.</label>
              <Input placeholder="e.g. SC/CNR-1234" disabled={isPending} {...register("caseNumber")} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Current Status</label>
              <select disabled={isPending} className="flex h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1.5 text-xs" {...register("currentStatus")}>
                <option value="Hearing">Hearing</option>
                <option value="Trial">Under Trial</option>
                <option value="Stayed">Stayed</option>
                <option value="Disposed">Disposed / Judgement</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Chargesheet Filed</label>
              <Input type="date" disabled={isPending} {...register("chargesheetFiledDate")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Next Hearing Date</label>
            <Input type="date" disabled={isPending} {...register("nextHearingDate")} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Judgement / Verdict details</label>
            <Textarea rows={3} placeholder="Final court orders, sentences, or interim bail details..." disabled={isPending} {...register("judgementDetails")} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50 mt-4">
            <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)} className="text-xs font-semibold h-9 px-4">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="text-xs font-semibold h-9 px-4 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {isEdit ? "Save Changes" : "Register Court Details"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
