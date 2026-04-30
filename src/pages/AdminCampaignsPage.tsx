import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";

const AdminCampaignsPage = () => {
  return (
    <AdminLayout title="キャンペーン管理">
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Phase B で実装予定</p>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminCampaignsPage;
