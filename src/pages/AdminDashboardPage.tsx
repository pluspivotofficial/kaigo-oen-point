import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";

const AdminDashboardPage = () => {
  return (
    <AdminLayout title="ダッシュボード">
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Phase B でKPIカードを実装予定</p>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminDashboardPage;
