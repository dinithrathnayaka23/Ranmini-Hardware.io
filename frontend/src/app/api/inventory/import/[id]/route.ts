import {
  forwardStatus,
  json,
  refuseUnlessAdmin,
} from "@/modules/inventory/import/import.server";

export const dynamic = "force-dynamic";

/** Import jobs are named by a random UUID; nothing else is passed on. */
const JOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/inventory/import/{id} — an import's progress, polled by the screen. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const refused = await refuseUnlessAdmin();
  if (refused) return refused;

  const { id } = await params;
  if (!JOB_ID.test(id)) return json({ message: "Unknown import." }, 404);
  return forwardStatus(id);
}
