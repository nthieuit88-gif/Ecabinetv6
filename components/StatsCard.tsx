import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon: Icon, iconColor, iconBg }) => {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 transition-transform hover:-translate-y-1 duration-300">
      <div className="flex justify-between items-start">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-800 mt-2">{value}</div>
    </div>
  );
};
