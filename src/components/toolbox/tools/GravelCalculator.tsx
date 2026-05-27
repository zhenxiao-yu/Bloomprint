"use client";

import { BulkCalculator } from "@/components/toolbox/tools/BulkCalculator";

export function GravelCalculator() {
  return <BulkCalculator slug="gravel" showTons defaultBagCuFt={1} />;
}
