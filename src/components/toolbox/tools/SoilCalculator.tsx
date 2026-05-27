"use client";

import { BulkCalculator } from "@/components/toolbox/tools/BulkCalculator";

export function SoilCalculator() {
  return <BulkCalculator slug="soil" defaultBagCuFt={1.5} />;
}
