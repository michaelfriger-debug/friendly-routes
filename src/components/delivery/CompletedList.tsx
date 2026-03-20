import type { DeliveryStop } from "@/types/delivery";

interface CompletedListProps {
  stops: DeliveryStop[];
  onReturn: (id: string) => void;
}

const CompletedList = ({ stops, onReturn }: CompletedListProps) => {
  const completed = stops.filter((s) => s.status === "completed");

  if (completed.length === 0) return null;

  return (
    <div className="space-y-2 animate-fade-in">
      <h3 className="text-sm font-bold text-success px-1">😊 חבילות שסופקו</h3>
      {completed.map((stop) => (
        <div
          key={stop.id}
          className="delivery-card bg-success/5 border-success/20 flex items-center justify-between"
        >
          <span className="font-medium text-sm">👍 {stop.address}</span>
          <button
            onClick={() => onReturn(stop.id)}
            className="text-sm text-primary font-semibold hover:underline active:scale-[0.97] transition-transform"
          >
            ↩️ החזר
          </button>
        </div>
      ))}
    </div>
  );
};

export default CompletedList;
