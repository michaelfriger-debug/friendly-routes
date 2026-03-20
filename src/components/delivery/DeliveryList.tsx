import type { DeliveryStop } from "@/types/delivery";
import { useState } from "react";

interface DeliveryListProps {
  stops: DeliveryStop[];
  onComplete: (id: string) => void;
  onEdit: (id: string, newAddress: string) => void;
}

const DeliveryList = ({ stops, onComplete, onEdit }: DeliveryListProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const pendingStops = stops.filter((s) => s.status === "pending");

  if (pendingStops.length === 0) return null;

  const startEdit = (stop: DeliveryStop) => {
    setEditingId(stop.id);
    setEditValue(stop.address);
  };

  const saveEdit = (id: string) => {
    if (editValue.trim()) {
      onEdit(id, editValue.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-2">
      {pendingStops.map((stop, i) => {
        const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(stop.address)}&navigate=yes`;

        return (
          <div key={stop.id} className="delivery-card animate-slide-in" style={{ animationDelay: `${i * 60}ms` }}>
            {editingId === stop.id ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit(stop.id)}
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
                <button onClick={() => saveEdit(stop.id)} className="btn-primary text-sm px-4">
                  שמור
                </button>
              </div>
            ) : (
              <>
                <p className="font-semibold text-base mb-3">{stop.address}</p>
                <a
                  href={wazeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary font-medium mb-3 inline-block"
                >
                  📍 נווט לכתובת
                </a>
                <div className="flex gap-2">
                  <button onClick={() => onComplete(stop.id)} className="btn-success flex-1">
                    👍 סופק
                  </button>
                  <button onClick={() => startEdit(stop)} className="btn-outline flex-1">
                    ערוך
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DeliveryList;
