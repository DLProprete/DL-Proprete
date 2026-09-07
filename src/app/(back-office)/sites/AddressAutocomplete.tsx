"use client";

import { useRef, useState } from "react";

type Suggestion = { placeId: string; label: string };

// Assiste la saisie, n'impose rien : si l'autocomplétion échoue ou que
// l'API n'est pas configurée, les trois champs restent des <input>
// normaux, modifiables à la main comme avant ce composant.
export function AddressAutocomplete({
  defaultAddress = "",
  defaultCity = "",
  defaultPostalCode = "",
}: {
  defaultAddress?: string;
  defaultCity?: string;
  defaultPostalCode?: string;
}) {
  const [address, setAddress] = useState(defaultAddress);
  const [city, setCity] = useState(defaultCity);
  const [postalCode, setPostalCode] = useState(defaultPostalCode);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleAddressChange(value: string) {
    setAddress(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 4) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(value)}`);
        const data = await response.json();
        setSuggestions(data.suggestions ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  }

  async function selectSuggestion(suggestion: Suggestion) {
    setAddress(suggestion.label);
    setSuggestions([]);
    try {
      const response = await fetch(`/api/places/details?placeId=${encodeURIComponent(suggestion.placeId)}`);
      if (!response.ok) return;
      const place = await response.json();
      setAddress(place.address);
      setCity(place.city);
      setPostalCode(place.postalCode);
    } catch {
      // L'utilisateur garde le libellé de la suggestion et complète à la main.
    }
  }

  return (
    <>
      <div className="relative">
        <label htmlFor="address" className="block text-sm text-zinc-700">
          Adresse
        </label>
        <input
          id="address"
          name="address"
          required
          autoComplete="off"
          value={address}
          onChange={(event) => handleAddressChange(event.target.value)}
          className="mt-1 w-full field"
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-lg">
            {suggestions.map((suggestion) => (
              <li key={suggestion.placeId}>
                <button
                  type="button"
                  onClick={() => selectSuggestion(suggestion)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
                >
                  {suggestion.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="postalCode" className="block text-sm text-zinc-700">
            Code postal
          </label>
          <input
            id="postalCode"
            name="postalCode"
            required
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
            className="mt-1 w-full field"
          />
        </div>
        <div>
          <label htmlFor="city" className="block text-sm text-zinc-700">
            Ville
          </label>
          <input
            id="city"
            name="city"
            required
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="mt-1 w-full field"
          />
        </div>
      </div>
    </>
  );
}
