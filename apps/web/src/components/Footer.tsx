"use client";

import React from "react";
import HalftoneWordmarkFooter from "./ui/halftone-wordmark-footer";

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
