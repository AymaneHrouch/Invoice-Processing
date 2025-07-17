import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from '@/contexts';
import GrowthIndicator from './GrowthIndicator';

const StatsCard = ({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBgColor,
  growth,
  isGrowthPositive,
  customContent,
}) => {
  const { isDarkMode } = useTheme();

  return (
    <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p
              className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
            >
              {title}
            </p>
            <p
              className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              {value}
            </p>
            {growth !== undefined && growth !== null && (
              <div className="flex items-center gap-2">
                <GrowthIndicator
                  value={Math.abs(growth)}
                  isPositive={isGrowthPositive}
                />
                <span
                  className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  This month
                </span>
              </div>
            )}
            {customContent}
          </div>
          <div className={`p-3 ${iconBgColor} rounded-full`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
