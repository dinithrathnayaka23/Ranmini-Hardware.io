import { forwardCsv, refuseUnlessAdmin } from "@/modules/inventory/import/import.server";

export const dynamic = "force-dynamic";

/** POST /api/inventory/import — checks a spreadsheet again and starts importing it. */
export async function POST(request: Request) {
  return (await refuseUnlessAdmin()) ?? forwardCsv(request, "/api/v1/inventory/import");
}
