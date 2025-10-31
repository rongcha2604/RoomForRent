
import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgColor?: string;
  textColor?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, color, bgColor, textColor }) => {
  // Default background & text colors
  const cardBgColor = bgColor || '#ffffff';
  const valueTextColor = textColor || color;

  return (
    <div 
      className="p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between"
      style={{ 
        backgroundColor: cardBgColor,
        minHeight: '95px'
      }}
    >
      {/* Icon + Title */}
      <div className="flex items-center gap-2 mb-2">
        <div 
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" 
          style={{ backgroundColor: color }}
        >
          <div className="text-white text-base">
            {React.cloneElement(icon as React.ReactElement, { color: '#ffffff', size: 16 })}
          </div>
        </div>
        <p className="text-[10px] text-slate-600 font-medium leading-tight flex-1">
          {title}
        </p>
      </div>
      
      {/* Value */}
      <p 
        className="text-xl font-bold truncate" 
        style={{ color: valueTextColor }}
      >
        {value}
      </p>
    </div>
  );
};

export default SummaryCard;
