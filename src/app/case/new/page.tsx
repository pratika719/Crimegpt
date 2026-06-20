import { CreateCaseForm } from "@/features/case/components/create-case-form";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function NewCasePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold">Create New Case</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Record a new case profile for investigation
        </p>
      </div>

      <CreateCaseForm />

      <div className="pt-4">
        <Link href="/case" className={buttonVariants({ variant: "ghost" })}>
          &larr; Back to Cases
        </Link>
      </div>
    </div>
  );
}
