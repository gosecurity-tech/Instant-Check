export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-6">
          <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
