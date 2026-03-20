const MapPlaceholder = () => {
  return (
    <div className="w-full h-48 bg-muted rounded-b-2xl flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-primary/5" />
      <div className="absolute inset-0 opacity-20">
        {/* Grid lines for map feel */}
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      <div className="relative z-10 flex flex-col items-center gap-1">
        <span className="text-4xl">🗺️</span>
        <span className="text-sm font-medium text-muted-foreground">מפת משלוחים</span>
      </div>
    </div>
  );
};

export default MapPlaceholder;
