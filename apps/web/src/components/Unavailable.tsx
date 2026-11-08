"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Runtime error state for live-data failures. Retry revalidates the server
 * components; when the API is unreachable from the serving environment
 * (e.g. Vercel without a public API URL), the message says so explicitly.
 */
export const Unavailable: React.FC<{ message?: string }> = ({ message }) => {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  const retry = () => {
    setRetrying(true);
    router.refresh();
    setTimeout(() => setRetrying(false), 800);
  };

  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-500/40 bg-red-500/10 p-8 text-center"
    >
      <p className="font-mono text-sm text-red-300">
        Live data unavailable{message ? `: ${message}` : "."}
      </p>
      <p className="mt-2 text-xs text-neutral-500">
        The Lilia API could not be reached from this deployment. Locally, start it with{" "}
        <code>bun run dev</code> and set <code>LILIA_API_KEY</code> for the Next.js server.
      </p>
      <button
        type="button"
        onClick={retry}
        disabled={retrying}
        className="mt-4 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-200 disabled:opacity-50"
      >
        {retrying ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
};
