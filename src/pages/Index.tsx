import NotificationPanel from "@/components/dashboard/NotificationPanel";
import MainDashboard from "@/components/dashboard/MainDashboard";
import MessagesPanel from "@/components/dashboard/MessagesPanel";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-4rem)]">
          <div className="col-span-12 lg:col-span-3 bg-card rounded-lg shadow-lg overflow-y-auto">
            <NotificationPanel />
          </div>
          <div className="col-span-12 lg:col-span-6 bg-card rounded-lg shadow-lg overflow-y-auto">
            <MainDashboard />
          </div>
          <div className="col-span-12 lg:col-span-3 bg-card rounded-lg shadow-lg overflow-y-auto">
            <MessagesPanel />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;