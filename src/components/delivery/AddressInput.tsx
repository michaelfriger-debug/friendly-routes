import { useState, useRef, useEffect, useCallback } from "react";
import type { PlaceSuggestion, PlaceDetails } from "@/types/delivery";
import { supabase } from "@/integrations/supabase/client";

interface AddressInputProps {
  onAdd: (address: string, details?: PlaceDetails) => void;
}

async function fetchAutocomplete(input: string): Promise<PlaceSuggestion[]> {
  try {
    const { data, error } = await supabase.functions.invoke("google-places", {
      body: { action: "autocomplete", input },
    });
    if (error || !data?.suggestions) return [];
    return data.suggestions
      .filter((s: any) => s.placePrediction)
      .map((s: any) => ({
        placeId: s.placePrediction.placeId,
        mainText: s.placePrediction.structuredFormat?.mainText?.text || "",
        secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text || "",
        fullText: s.placePrediction.text?.text || "",
      }));
  } catch {
    return [];
  }
}

async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  try {
    const { data, error } = await supabase.functions.invoke("google-places", {
      body: { action: "details", placeId },
    });
    if (error || !data?.formattedAddress) return null;
    return {
      formattedAddress: data.formattedAddress,
      lat: data.location?.latitude ?? null,
      lng: data.location?.longitude ?? null,
      displayName: data.displayName?.text,
    };
  } catch {
    return null;
  }
}

const AddressInput = ({ onAdd }: AddressInputProps) => {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInputChange = useCallback((text: string) => {
    setValue(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await fetchAutocomplete(text.trim());
      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setLoading(false);
    }, 300);
  }, []);

  const handleSelect = useCallback(async (suggestion: PlaceSuggestion) => {
    setShowDropdown(false);
    setValue(suggestion.fullText);
    setLoading(true);

    const details = await fetchPlaceDetails(suggestion.placeId);
    const address = details?.formattedAddress || suggestion.fullText;
    setValue("");
    setSuggestions([]);
    onAdd(address, details ?? undefined);
    setLoading(false);
  }, [onAdd]);

  const handleManualAdd = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
    setSuggestions([]);
    setShowDropdown(false);
  }, [value, onAdd]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (suggestions.length > 0 && showDropdown) {
        handleSelect(suggestions[0]);
      } else {
        handleManualAdd();
      }
    }
  };

  return (
    <div className="delivery-card animate-slide-in" ref={wrapperRef}>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">📦 כתובת משלוח</h3>
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder="הקלד כתובת משלוח..."
            className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleManualAdd}
            className="btn-primary min-w-[72px] text-lg"
            disabled={loading}
          >
            {loading ? "..." : "+ הוסף"}
          </button>
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-30 mt-1 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={s.placeId}
                onClick={() => handleSelect(s)}
                className="w-full text-right px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors border-b border-border/50 last:border-b-0"
              >
                <p className="text-sm font-medium">{s.mainText}</p>
                <p className="text-xs text-muted-foreground">{s.secondaryText}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddressInput;
