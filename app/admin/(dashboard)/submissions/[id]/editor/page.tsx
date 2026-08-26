import { EvidenceEditor } from "@/components/admin/EvidenceEditor";

export default async function EvidenceEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EvidenceEditor id={id} />;
}
