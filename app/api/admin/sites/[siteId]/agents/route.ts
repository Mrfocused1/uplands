import { NextResponse } from "next/server";

import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { runSiteOperationsAgents } from "@/lib/agents/siteOperationsAgents";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ siteId: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { siteId } = await context.params;
  const agents = await runSiteOperationsAgents(siteId);
  return NextResponse.json({ agents });
}
