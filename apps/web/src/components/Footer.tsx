"use client";

import HalftoneWordmarkFooter from "@/components/ui/halftone-wordmark-footer";
import type React from "react";

export const Footer: React.FC = () => {
  return (
    <div className="w-full relative mt-24">
      <HalftoneWordmarkFooter
        wordmark="lilia"
        label="LILIA PROTOCOL"
        meta="AI-assisted on-chain transaction security infrastructure. Enforcing mathematical spending bounds through Solana Token-2022 Transfer Hooks."
        preset="aurora"
        height="560px"
        crop={0.16}
        grain={0.5}
        dotGap={6}
        radius={95}
      />
    </div>
  );
};
