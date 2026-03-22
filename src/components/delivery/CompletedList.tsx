import { useState, useEffect, useRef } from "react";
import type { DeliveryStop } from "@/types/delivery";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface CompletedListProps {
  stops: DeliveryStop[];
  onReturn: (id: string) => void;
  onDeleteCompleted: () => void;
  onRestoreCompleted: (restored: DeliveryStop[]) => void;
}

function formatDate(iso?: string): string {
  if (!iso) return "ללא תאריך";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function groupByDate(stops: DeliveryStop[]): Map<string, DeliveryStop[]> {
  const groups = new Map<string, DeliveryStop[]>();
  for (const stop of stops) {
    const key = formatDate(stop.completedAt);
    const arr = groups.get(key) || [];
    arr.push(stop);
    groups.set(key, arr);
  }
  return groups;
}

const CompletedList = ({ stops, onReturn, onDeleteCompleted, onRestoreCompleted }: CompletedListProps) => {
  const completed = stops.filter((s) => s.status === "completed");
  const [confirming, setConfirming] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [deletedCache, setDeletedCache] = useState<DeliveryStop[] | null>(null);
  const [openDates, setOpenDates] = useState<Set<string>>(new Set());
  const undoTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const toggleDate = (date: string) => {
    setOpenDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const handleDeleteClick = () => setConfirming(true);

  const handleConfirmDelete = () => {
    setConfirming(false);
    setFadingOut(true);
    setTimeout(() => {
      const cached = [...completed];
      setDeletedCache(cached);
      setFadingOut(false);
      onDeleteCompleted();
      toast.success(`נמחקו ${cached.length} חבילות ✔`);
      undoTimerRef.current = setTimeout(() => setDeletedCache(null), 5000);
    }, 350);
  };

  const handleUndo = () => {
    if (!deletedCache) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    onRestoreCompleted(deletedCache);
    setDeletedCache(null);
    toast.info("החבילות שוחזרו ↩️");
  };

  const handleCancelConfirm = () => setConfirming(false);

  // Undo banner
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

  const dateGroups = groupByDate(completed);

  return (
    <div className="mt-8 animate-fade-in">
      <div className="border-t border-border/60 mb-4" />
      <h3 className="text-base font-semibold text-foreground px-1 mb-4">
        😊 חבילות שסופקו
        <span className="text-xs font-normal text-muted-foreground mr-2">({completed.length})</span>
      </h3>

      <div className={`space-y-3 transition-opacity duration-300 ${fadingOut ? "opacity-0" : "opacity-100"}`}>
        {Array.from(dateGroups.entries()).map(([date, items]) => {
          const isOpen = openDates.has(date);
          return (
            <Collapsible key={date} open={isOpen} onOpenChange={() => toggleDate(date)}>
              <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3.5
                                               hover:bg-muted/40 transition-colors duration-150 cursor-pointer">
                  <span className="font-semibold text-foreground text-sm">
                    📅 {date}
                    <span className="text-xs font-normal text-muted-foreground mr-2">
                      ({items.length})
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200
                                ${isOpen ? "rotate-180" : ""}`}
                  />
                </CollapsibleTrigger>

                <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <div className="border-t border-border/40 px-3 py-2 space-y-2">
                    {items.map((stop) => (
                      <div
                        key={stop.id}
                        className="flex items-center justify-between rounded-xl
                                   bg-[hsl(var(--success)/0.08)]
                                   border border-[hsl(var(--success)/0.18)]
                                   px-4 py-3"
                      >
                        <span className="font-semibold text-foreground leading-relaxed" style={{ fontSize: '1.125rem' }}>
                          ✔ {stop.address}
                        </span>
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
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
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
