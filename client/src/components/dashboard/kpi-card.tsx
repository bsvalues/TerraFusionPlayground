import { Card, CardContent } from "@/components/ui/card";
import { ReactNode } from "react";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  actionLabel?: string;
  actionUrl?: string;
  valueColor?: string;
}

const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  icon, 
  actionLabel = "View all", 
  actionUrl = "#",
  valueColor = "text-gray-900" 
}) => {
  return (
    <Card className="bg-white overflow-hidden shadow">
      <CardContent className="p-0">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 text-gray-400">
              {icon}
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {title}
                </dt>
                <dd>
                  <div className={`text-lg font-medium ${valueColor}`}>
                    {value}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <a 
              href={actionUrl} 
              className="font-medium text-primary-700 hover:text-primary-900"
            >
              {actionLabel}
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KPICard;
