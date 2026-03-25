import type { DeliveryStop } from "@/types/delivery";
import { handleNavigation } from "@/lib/navigation";
import confetti from "canvas-confetti";

interface ActiveDeliveryProps {
  stop: DeliveryStop;
  onComplete: (id: string) => void;
  onCoordsResolved?: (id: string, coords: { lat: number; lng: number }) => void;
}

const ActiveDelivery = ({ stop, onComplete, onCoordsResolved }: ActiveDeliveryProps) => {
  const navigate = () => {
    handleNavigation(stop.address, stop.lat, stop.lng, (coords) => {
      onCoordsResolved?.(stop.id, coords);
    });
  };

  return (
    <div className="delivery-card border-2 border-primary/30 bg-primary/5 animate-slide-in">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />
        <span className="text-sm font-bold text-primary">משלוח פעיל</span>
      </div>
      <p className="text-lg font-semibold mb-4">{stop.address}</p>
      <div className="flex gap-2">
        <button onClick={navigate} className="btn-primary flex-1 text-center">
          🧭 נווט ב-Waze
        </button>
        <button onClick={() => onComplete(stop.id)} className="btn-success flex-1">
          👍 סופק
        </button>
      </div>
    </div>
  );
};

export default ActiveDelivery;
