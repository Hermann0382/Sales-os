export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">CallOS</h1>
          <p className="text-muted-foreground mt-2">
            Sales Call Orchestration
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
