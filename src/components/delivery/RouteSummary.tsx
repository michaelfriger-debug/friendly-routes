import type { RouteConfig } from "./RouteConfigModal";

interface RouteSummaryProps {
  config: RouteConfig;
}

const RouteSummary = ({ config }: RouteSummaryProps) => {
  const startLabel = config.startType === "gps" ? "מיקום נוכחי" : (config.startAddress || "לא הוגדר");
  const endLabel = config.endAddress || "ללא";

  return (
    <div className="flex gap-4 text-xs text-muted-foreground px-1">
      <span>📍 התחלה: {startLabel}</span>
      <span>🏁 סיום: {endLabel}</span>
    </div>
  );
};

export default RouteSummary;
