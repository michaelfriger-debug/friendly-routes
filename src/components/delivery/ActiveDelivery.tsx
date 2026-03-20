import type { DeliveryStop } from "@/types/delivery";

interface ActiveDeliveryProps {
  stop: DeliveryStop;
  onComplete: (id: string) => void;
}

const ActiveDelivery = ({ stop, onComplete }: ActiveDeliveryProps) => {
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(stop.address)}&navigate=yes`;

  return (
    <div className="delivery-card border-2 border-primary/30 bg-primary/5 animate-slide-in">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />
        <span className="text-sm font-bold text-primary">משלוח פעיל</span>
      </div>
      <p className="text-lg font-semibold mb-4">{stop.address}</p>
      <div className="flex gap-2">
        <a
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary flex-1 text-center"
        >
          🧭 נווט ב-Waze
        </a>
        <button
          onClick={() => onComplete(stop.id)}
          className="btn-success flex-1"
        >
          👍 סופק
        </button>
      </div>
    </div>
  );
};

export default ActiveDelivery;
