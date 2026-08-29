import { formatDateOnly, formatTime } from "@/lib/dates";

const DAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
  { value: 7, label: "Dim" },
];

type AgentProfileValues = {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  birthDate?: Date | null;
  homeAddress?: string | null;
  homeCity?: string | null;
  homePostalCode?: string | null;
  homeLat?: number | null;
  homeLng?: number | null;
  hasDrivingLicense?: boolean;
  maxEndTime?: Date | null;
  minStartTime?: Date | null;
  noWorkWeekdays?: number[];
  notes?: string | null;
};

// Champs de profil agent partagés entre /team/new et /team/[agentId] —
// composant serveur simple (pas de calcul dynamique côté client requis).
export function AgentProfileFields({ defaultValues = {} }: { defaultValues?: AgentProfileValues }) {
  const v = defaultValues;
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm text-zinc-700">
            Prénom
          </label>
          <input
            id="firstName"
            name="firstName"
            required
            defaultValue={v.firstName ?? ""}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm text-zinc-700">
            Nom
          </label>
          <input
            id="lastName"
            name="lastName"
            required
            defaultValue={v.lastName ?? ""}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm text-zinc-700">
            Téléphone
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={v.phone ?? ""}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="birthDate" className="block text-sm text-zinc-700">
            Date de naissance
          </label>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            defaultValue={v.birthDate ? formatDateOnly(v.birthDate) : ""}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
      </div>
      <div>
        <label htmlFor="homeAddress" className="block text-sm text-zinc-700">
          Adresse du domicile
        </label>
        <input
          id="homeAddress"
          name="homeAddress"
          defaultValue={v.homeAddress ?? ""}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="homeCity" className="block text-sm text-zinc-700">
            Ville
          </label>
          <input
            id="homeCity"
            name="homeCity"
            defaultValue={v.homeCity ?? ""}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="homePostalCode" className="block text-sm text-zinc-700">
            Code postal
          </label>
          <input
            id="homePostalCode"
            name="homePostalCode"
            defaultValue={v.homePostalCode ?? ""}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="homeLat" className="block text-sm text-zinc-700">
            Latitude (facultatif)
          </label>
          <input
            id="homeLat"
            name="homeLat"
            type="number"
            step="any"
            defaultValue={v.homeLat ?? ""}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="homeLng" className="block text-sm text-zinc-700">
            Longitude (facultatif)
          </label>
          <input
            id="homeLng"
            name="homeLng"
            type="number"
            step="any"
            defaultValue={v.homeLng ?? ""}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" name="hasDrivingLicense" defaultChecked={v.hasDrivingLicense ?? false} />
        Permis de conduire
      </label>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="minStartTime" className="block text-sm text-zinc-700">
            Ne pas travailler avant (facultatif)
          </label>
          <input
            id="minStartTime"
            name="minStartTime"
            type="time"
            defaultValue={v.minStartTime ? formatTime(v.minStartTime) : ""}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="maxEndTime" className="block text-sm text-zinc-700">
            Ne pas travailler après (facultatif)
          </label>
          <input
            id="maxEndTime"
            name="maxEndTime"
            type="time"
            defaultValue={v.maxEndTime ? formatTime(v.maxEndTime) : ""}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
      </div>
      <fieldset>
        <legend className="block text-sm text-zinc-700">Jours non travaillés</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <label
              key={day.value}
              className="flex cursor-pointer items-center gap-1.5 rounded border border-zinc-300 px-3 py-1.5 text-sm select-none has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white"
            >
              <input
                type="checkbox"
                name="noWorkWeekdays"
                value={day.value}
                defaultChecked={v.noWorkWeekdays?.includes(day.value) ?? false}
                className="sr-only"
              />
              {day.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="notes" className="block text-sm text-zinc-700">
          Notes (consignes humaines)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={v.notes ?? ""}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
        />
      </div>
    </>
  );
}
