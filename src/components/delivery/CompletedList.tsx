import { useState, useEffect, useRef } from "react";
import type { DeliveryStop } from "@/types/delivery";
import { toast } from "sonner";

interface CompletedListProps {
  stops: DeliveryStop[];
  onReturn: (id: string) => void;
  onDeleteCompleted: () => void;
  onRestoreCompleted: (restored: DeliveryStop[]) => void;
}

const CompletedList = ({ stops, onReturn, onDeleteCompleted, onRestoreCompleted }: CompletedListProps) => {
  const completed = stops.filter((s) => s.status === "completed");
  const [confirming, setConfirming] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [deletedCache, setDeletedCache] = useState<DeliveryStop[] | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const handleDeleteClick = () => {
    setConfirming(true);
  };

  const handleConfirmDelete = () => {
    setConfirming(false);
    setFadingOut(true);

    setTimeout(() => {
      const cached = [...completed];
      setDeletedCache(cached);
      setFadingOut(false);
      onDeleteCompleted();

      toast.success(`נמחקו ${cached.length} חבילות ✔`);

      // Auto-clear undo after 5 seconds
      undoTimerRef.current = setTimeout(() => {
        setDeletedCache(null);
      }, 5000);
    }, 350);
  };

  const handleUndo = () => {
    if (!deletedCache) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    onRestoreCompleted(deletedCache);
    setDeletedCache(null);
    toast.info("החבילות שוחזרו ↩️");
  };

  const handleCancelConfirm = () => {
    setConfirming(false);
  };

  // Undo banner (shown after delete)
  if (deletedCache && completed.length === 0) {
    return (
      <div className="mt-6 animate-fade-in">
        <button
          onClick={handleUndo}
          className="w-full rounded-2xl bg-primary/10 text-primary font-semibold py-3 px-4 text-sm
                     hover:bg-primary/15 active:scale-[0.97] transition-all duration-200"
        >
          ↩️ בטל מחיקה ({deletedCache.length} חבילות)
        </button>
      </div>
    );
  }

  if (completed.length === 0) {
    return (
      <div className="mt-8 animate-fade-in">
        <div className="border-t border-border/60 mb-5" />
        <p className="text-center text-sm text-muted-foreground py-4">
          📦 אין חבילות שסופקו עדיין
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 animate-fade-in">
      {/* Section divider + title */}
      <div className="border-t border-border/60 mb-4" />
      <h3 className="text-base font-semibold text-foreground px-1 mb-4">
        😊 חבילות שסופקו
        <span className="text-xs font-normal text-muted-foreground mr-2">({completed.length})</span>
      </h3>

      {/* Completed items */}
      <div className={`space-y-3 transition-opacity duration-300 ${fadingOut ? "opacity-0" : "opacity-100"}`}>
        {completed.map((stop, i) => (
          <div
            key={stop.id}
            className="flex items-center justify-between rounded-2xl
                       bg-[hsl(var(--success)/0.08)]
                       border border-[hsl(var(--success)/0.25)]
                       px-4 py-4 animate-fade-in"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className="font-semibold text-foreground leading-relaxed" style={{ fontSize: '1.125rem' }}>👍 {stop.address}</span>
            <button
              onClick={() => onReturn(stop.id)}
              className="rounded-xl bg-card border border-border/60 px-3 py-1.5
                         text-xs font-semibold text-muted-foreground shrink-0 mr-3
                         hover:bg-muted/60 active:scale-[0.95] transition-all duration-150"
            >
              ↩️ החזר
            </button>
          </div>
        ))}
      </div>

      {/* Delete button / confirmation */}
      <div className="mt-4">
        {confirming ? (
          <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4 animate-scale-in space-y-3">
            <p className="text-sm font-semibold text-center text-foreground">
              האם למחוק {completed.length} חבילות שסופקו?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmDelete}
                className="flex-1 rounded-xl bg-destructive text-destructive-foreground
                           font-semibold py-2.5 text-sm
                           hover:bg-destructive/90 active:scale-[0.97] transition-all duration-150"
              >
                🗑️ כן, מחק
              </button>
              <button
                onClick={handleCancelConfirm}
                className="flex-1 rounded-xl bg-muted text-muted-foreground
                           font-semibold py-2.5 text-sm
                           hover:bg-muted/80 active:scale-[0.97] transition-all duration-150"
              >
                ביטול
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleDeleteClick}
            className="w-full rounded-2xl bg-destructive/8 text-destructive font-semibold
                       py-3 px-4 text-sm
                       hover:bg-destructive/12 active:scale-[0.97] transition-all duration-200"
          >
            🗑️ מחק {completed.length} חבילות שסופקו
          </button>
        )}
      </div>
    </div>
  );
};

export default CompletedList;
