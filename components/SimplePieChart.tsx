import React, { useMemo } from 'react';
import { getExpenseCategoryIcon, getExpenseCategoryName } from '../services/reportHelpers';

interface PieChartData {
    category: string;
    amount: number;
}

interface SimplePieChartProps {
    data: PieChartData[];
}

const SimplePieChart: React.FC<SimplePieChartProps> = ({ data }) => {
    const { total, segments } = useMemo(() => {
        const total = data.reduce((sum, d) => sum + d.amount, 0);
        
        const colors = [
            '#3b82f6', // blue
            '#10b981', // green
            '#f59e0b', // amber
            '#ef4444', // red
            '#8b5cf6', // purple
        ];

        let currentAngle = 0;
        const segments = data.map((d, i) => {
            const percentage = (d.amount / total) * 100;
            const angle = (d.amount / total) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            
            currentAngle = endAngle;

            return {
                ...d,
                percentage,
                color: colors[i % colors.length],
                startAngle,
                endAngle
            };
        });

        return { total, segments };
    }, [data]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    };

    const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
        const start = polarToCartesian(x, y, radius, endAngle);
        const end = polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        
        return [
            "M", x, y,
            "L", start.x, start.y,
            "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
            "Z"
        ].join(" ");
    };

    if (data.length === 0 || total === 0) {
        return (
            <div className="flex items-center justify-center bg-slate-50 rounded-xl p-8 min-h-[200px]">
                <p className="text-sm text-slate-500">Chưa có chi phí</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl p-4 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">🥧 Chi phí theo danh mục</h3>
            
            <div className="flex gap-4">
                {/* Pie chart */}
                <div className="flex-shrink-0">
                    <svg width="150" height="150" viewBox="0 0 100 100">
                        {segments.map((segment, i) => (
                            <path
                                key={i}
                                d={describeArc(50, 50, 45, segment.startAngle, segment.endAngle)}
                                fill={segment.color}
                                stroke="white"
                                strokeWidth="1"
                            />
                        ))}
                        {/* Center circle (donut style) */}
                        <circle cx="50" cy="50" r="20" fill="white" />
                        <text
                            x="50"
                            y="45"
                            textAnchor="middle"
                            className="text-xs font-semibold"
                            fill="#475569"
                        >
                            Tổng chi
                        </text>
                        <text
                            x="50"
                            y="55"
                            textAnchor="middle"
                            className="text-[10px]"
                            fill="#64748b"
                        >
                            {formatCurrency(total).replace('₫', '')}
                        </text>
                    </svg>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-2">
                    {segments.map((segment, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div
                                    className="w-3 h-3 rounded-sm flex-shrink-0"
                                    style={{ backgroundColor: segment.color }}
                                ></div>
                                <span className="text-slate-700 truncate">
                                    {getExpenseCategoryIcon(segment.category)} {getExpenseCategoryName(segment.category)}
                                </span>
                            </div>
                            <div className="text-right ml-2 flex-shrink-0">
                                <div className="font-semibold text-slate-800">
                                    {formatCurrency(segment.amount)}
                                </div>
                                <div className="text-slate-500">
                                    {segment.percentage.toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SimplePieChart;

