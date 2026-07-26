import AdminContentManager from "@/components/admin/AdminContentManager";
import AdminGuard from "@/components/admin/AdminGuard";

export default function AdminContentPage() {
  return (
    <AdminGuard>
      <AdminContentManager />
    </AdminGuard>
  );
}
