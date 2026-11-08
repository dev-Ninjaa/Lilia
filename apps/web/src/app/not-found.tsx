import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#07080a] px-4 py-16 text-center">
      <p className="font-mono text-sm text-[#FF5533]">404</p>
      <h1 className="mb-2 text-2xl font-bold text-white">Page not found</h1>
      <p className="mb-6 text-sm text-neutral-400">
        This route does not exist in the Lilia console.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-200"
      >
        Back to LILIA
      </Link>
    </div>
  );
}
