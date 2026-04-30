export default function AuthPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="w-full max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-ink-faint">
          Gunakul Press
        </p>
        <h1 className="display mt-4 text-4xl font-medium text-ink">Sign in</h1>
        <p className="mt-4 text-base leading-relaxed text-ink-soft">
          Magic-link sign-in is wired up in the next step. Only{" "}
          <span className="font-medium text-ink">@ky21c.org</span> addresses are
          allowed in.
        </p>
      </div>
    </main>
  );
}
