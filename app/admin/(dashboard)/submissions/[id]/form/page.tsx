import { FormEditor } from "@/components/admin/FormEditor";

export default async function FormEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FormEditor id={id} />;
}
