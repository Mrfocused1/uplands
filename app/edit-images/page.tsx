import { EditablePdfWorkspace } from "@/components/admin/edit-images/EditablePdfWorkspace";

export const metadata = {
  title: "Edit Images | Uplands",
};

export default function PublicEditImagesPage() {
  return (
    <main className="min-h-screen bg-uplands-paper px-5 py-8 text-uplands-charcoal sm:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <EditablePdfWorkspace />
      </div>
    </main>
  );
}
