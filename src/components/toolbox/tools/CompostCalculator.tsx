"use client";

import { BulkCalculator } from "@/components/toolbox/tools/BulkCalculator";

export function CompostCalculator() {
  return <BulkCalculator slug="compost" defaultBagCuFt={1.5} />;
}
