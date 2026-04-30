export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="max-w-xl text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-ink-faint">
          Gunakul Press
        </p>
        <h1 className="display mt-4 text-5xl font-medium text-ink">
          Living Library of Links
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-ink-soft">
          A single page where every link that matters lives. Live links on the
          Live Board. Older versions in the Archive. Never deleted.
        </p>
        <p className="mt-10 text-sm italic text-ink-faint">
          Scaffolding in progress — visual port from{" "}
          <span className="not-italic font-medium">lll.jsx</span> coming next.
        </p>
      </div>
    </main>
  );
}
