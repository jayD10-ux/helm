import { BarChart, Users, DollarSign, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";

const MainDashboard = () => {
  const stats = [
    { title: "Revenue", value: "$24,000", icon: DollarSign, change: "+12%" },
    { title: "Users", value: "1,200", icon: Users, change: "+8%" },
    { title: "Projects", value: "32", icon: Calendar, change: "+24%" },
    { title: "Growth", value: "18%", icon: BarChart, change: "+2%" },
  ];

  return (
    <div className="h-full w-full p-4 animate-fade-in">
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title} className="p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <h3 className="text-2xl font-semibold mt-1">{stat.value}</h3>
                <span className="text-xs text-green-500 mt-1 block">{stat.change}</span>
              </div>
              <stat.icon className="w-8 h-8 text-muted-foreground opacity-75" />
            </div>
          </Card>
        ))}
      </div>
      <Card className="p-6 h-[400px] flex items-center justify-center text-muted-foreground">
        Chart placeholder
      </Card>
    </div>
  );
};

export default MainDashboard;