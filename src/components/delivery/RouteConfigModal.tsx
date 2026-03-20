import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface RouteConfig {
  startType: "gps" | "manual";
  startAddress: string;
  endAddress: string;
}

interface RouteConfigModalProps {
  config: RouteConfig;
  onSave: (config: RouteConfig) => void;
}

const RouteConfigModal = ({ config, onSave }: RouteConfigModalProps) => {
  const [open, setOpen] = useState(false);
  const [startType, setStartType] = useState<"gps" | "manual">(config.startType);
  const [startAddress, setStartAddress] = useState(config.startAddress);
  const [endAddress, setEndAddress] = useState(config.endAddress);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setStartType(config.startType);
      setStartAddress(config.startAddress);
      setEndAddress(config.endAddress);
    }
    setOpen(isOpen);
  };

  const handleSave = () => {
    onSave({ startType, startAddress, endAddress });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button className="btn-outline w-full text-sm">⚙️ הגדר מסלול</button>
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">⚙️ הגדרות מסלול</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Start location */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">📍 נקודת התחלה</label>
            <div className="flex gap-2">
              <button
                onClick={() => setStartType("gps")}
                className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  startType === "gps"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                📡 מיקום נוכחי
              </button>
              <button
                onClick={() => setStartType("manual")}
                className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  startType === "manual"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                ✏️ כתובת ידנית
              </button>
            </div>
            {startType === "manual" && (
              <input
                type="text"
                value={startAddress}
                onChange={(e) => setStartAddress(e.target.value)}
                placeholder="הקלד כתובת התחלה..."
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}
          </div>

          {/* End location */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">🏁 נקודת סיום (אופציונלי)</label>
            <input
              type="text"
              value={endAddress}
              onChange={(e) => setEndAddress(e.target.value)}
              placeholder="כתובת סיום..."
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button onClick={handleSave} className="btn-primary w-full mt-2">
            שמור
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RouteConfigModal;
