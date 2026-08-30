import { NextResponse } from "next/server";

import { requireAdmin, UnauthorizedError } from "@/lib/auth/admin";
import { getPermitDetail } from "@/lib/db/permits";
import { generatePermitPdf } from "@/lib/pdf/generatePermitPdf";

export const runtime = "nodejs";

function safeName(value: string) {
  return value.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80);
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }

  const { id } = await context.params;
  const detail = await getPermitDetail(id);
  if (!detail) return NextResponse.json({ error: "Permit not found." }, { status: 404 });

  const url = new URL(request.url);
  const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";
  const pdf = await generatePermitPdf(detail);

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${safeName(detail.permit.permit_number)}.pdf"`,
    },
  });
}
