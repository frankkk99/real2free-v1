import AdminGuard from "@/components/admin/AdminGuard";
import ApiPlayerReferenceTest from "@/components/admin/ApiPlayerReferenceTest";

export default function ApiPlayerReferenceTestPage() {
  return (
    <AdminGuard>
      <ApiPlayerReferenceTest />
    </AdminGuard>
  );
}
