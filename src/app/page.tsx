export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <main className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-foreground">
          ReelZero
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          AI-Powered Reel &amp; Shorts Creator. Generate stunning 60-second
          vertical videos from text prompts.
        </p>
      </main>
    </div>
  );
}
