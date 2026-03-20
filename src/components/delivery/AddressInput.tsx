import { useState } from "react";

interface AddressInputProps {
  onAdd: (address: string) => void;
}

const AddressInput = ({ onAdd }: AddressInputProps) => {
  const [value, setValue] = useState("");

  const handleAdd = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  return (
    <div className="delivery-card animate-slide-in">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">📦 כתובת משלוח</h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="הקלד כתובת משלוח..."
          className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button onClick={handleAdd} className="btn-primary min-w-[72px] text-lg">
          + הוסף
        </button>
      </div>
    </div>
  );
};

export default AddressInput;
