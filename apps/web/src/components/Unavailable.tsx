export const Unavailable: React.FC<{ message?: string }> = ({ message }) => (
  <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-8 text-center">
    <p className="font-mono text-sm text-red-300">Live data unavailable{message ? `: ${message}` : "."}</p>
    <p className="mt-2 text-xs text-neutral-500">
      Start the API (<code>bun run dev</code>) and set <code>LILIA_API_KEY</code> for the
      Next.js server, then reload.
    </p>
    <a
      href=""
      className="mt-4 inline-block rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-200"
    >
      Reload
    </a>
  </div>
);
