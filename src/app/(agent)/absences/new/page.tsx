import { AbsenceForm } from "./AbsenceForm";

export default async function NewAbsencePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Déclarer une absence</h1>
      {error && (
        <p className="alert alert-danger">
          {error}
        </p>
      )}
      <AbsenceForm />
    </div>
  );
}
