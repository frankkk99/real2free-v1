import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminGuard from "@/components/admin/AdminGuard";

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminDashboard />
    </AdminGuard>
  );
}
