import { NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { getSubmission, saveEvidenceTransforms } from "@/lib/db/submissions";
import { EVIDENCE_TYPES, type EvidencePrintTransform, type EvidenceType } from "@/types/evidence";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { id } = await context.params;
  if (!(await getSubmission(id))) return NextResponse.json({ error: "Submission not found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const transforms = body?.transforms as Partial<Record<EvidenceType, EvidencePrintTransform>> | undefined;

  if (!transforms || typeof transforms !== "object") {
    return NextResponse.json({ error: "Expected a transforms object." }, { status: 400 });
  }

  const sanitized: Partial<Record<EvidenceType, EvidencePrintTransform>> = {};
  for (const [type, transform] of Object.entries(transforms)) {
    if (!(EVIDENCE_TYPES as readonly string[]).includes(type)) continue;
    sanitized[type as EvidenceType] = {
      fitMode: transform?.fitMode === "fill" || transform?.fitMode === "custom" ? transform.fitMode : "fit",
      offsetX: Number(transform?.offsetX) || 0,
      offsetY: Number(transform?.offsetY) || 0,
      scale: Number(transform?.scale) > 0 ? Number(transform.scale) : 1,
      rotation: ([0, 90, 180, 270] as const).includes(transform?.rotation) ? transform.rotation : 0,
    };
  }

  await saveEvidenceTransforms(id, sanitized, admin.username);
  return NextResponse.json({ ok: true });
}
