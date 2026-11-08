"use client";

import { useEffect } from "react";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#07080a] px-4 py-16 text-center">
      <h1 className="mb-2 text-2xl font-bold text-white">Something went wrong</h1>
      <p className="mb-6 font-mono text-sm text-red-400">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-200"
      >
        Try again
      </button>
    </div>
  );
}
