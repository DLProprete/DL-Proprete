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
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <AbsenceForm />
    </div>
  );
}
