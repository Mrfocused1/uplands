import { AdminNav } from "@/components/admin/AdminNav";
import { EditablePdfWorkspace } from "@/components/admin/edit-images/EditablePdfWorkspace";

export const metadata = {
  title: "Edit Images | Uplands",
};

export default function PublicEditImagesPage() {
  return (
    <div className="min-h-screen bg-uplands-paper text-uplands-charcoal">
      <AdminNav adminName="Testing" />
      <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
        <EditablePdfWorkspace />
      </main>
    </div>
  );
}
