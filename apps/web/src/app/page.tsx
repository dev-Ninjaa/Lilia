import { LandingPage } from "@/components/LandingPage";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">
        <LandingPage />
      </main>
    </>
  );
}
