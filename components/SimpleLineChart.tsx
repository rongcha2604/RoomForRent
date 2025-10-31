import React, { useMemo } from 'react';

interface DataPoint {
    label: string;
    total: number;
    collected: number;
}

interface SimpleLineChartProps {
    data: DataPoint[];
    height?: number;
}

const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ data, height = 200 }) => {
    const { maxValue, points } = useMemo(() => {
        if (data.length === 0) return { maxValue: 0, points: [] };

        const allValues = data.flatMap(d => [d.total, d.collected]);
        const max = Math.max(...allValues, 1);
        const maxValue = Math.ceil(max / 1000000) * 1000000; // Round up to nearest million

        const width = 100;
        const step = width / (data.length - 1 || 1);

        const totalPoints = data.map((d, i) => ({
            x: i * step,
            y: 100 - (d.total / maxValue) * 100,
            label: d.label,
            value: d.total
        }));

        const collectedPoints = data.map((d, i) => ({
            x: i * step,
            y: 100 - (d.collected / maxValue) * 100,
            label: d.label,
            value: d.collected
        }));

        return { maxValue, points: { totalPoints, collectedPoints } };
    }, [data]);

    const formatCurrency = (value: number) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${Math.round(value / 1000)}K`;
        return value.toString();
    };

    const createPath = (points: typeof points.totalPoints) => {
        if (points.length === 0) return '';
        return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    };

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center bg-slate-50 rounded-xl p-8" style={{ height }}>
                <p className="text-sm text-slate-500">Chưa có dữ liệu</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">📈 Doanh thu theo thời gian</h3>
                <div className="flex gap-3 text-xs">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-blue-500"></div>
                        <span className="text-slate-600">Tổng</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-green-500"></div>
                        <span className="text-slate-600">Đã thu</span>
                    </div>
                </div>
            </div>

            <div className="relative" style={{ height }}>
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-slate-500">
                    <span>{formatCurrency(maxValue)}</span>
                    <span>{formatCurrency(maxValue / 2)}</span>
                    <span>0</span>
                </div>

                {/* Chart area */}
                <div className="absolute left-14 right-0 top-0 bottom-0">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                        {/* Grid lines */}
                        <line x1="0" y1="0" x2="100" y2="0" stroke="#e2e8f0" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                        <line x1="0" y1="50" x2="100" y2="50" stroke="#e2e8f0" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                        <line x1="0" y1="100" x2="100" y2="100" stroke="#e2e8f0" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />

                        {/* Total line */}
                        <path
                            d={createPath(points.totalPoints)}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                        />

                        {/* Collected line */}
                        <path
                            d={createPath(points.collectedPoints)}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                        />

                        {/* Data points (Total) */}
                        {points.totalPoints.map((p, i) => (
                            <circle
                                key={`total-${i}`}
                                cx={p.x}
                                cy={p.y}
                                r="1.5"
                                fill="#3b82f6"
                                vectorEffect="non-scaling-stroke"
                            />
                        ))}

                        {/* Data points (Collected) */}
                        {points.collectedPoints.map((p, i) => (
                            <circle
                                key={`collected-${i}`}
                                cx={p.x}
                                cy={p.y}
                                r="1.5"
                                fill="#10b981"
                                vectorEffect="non-scaling-stroke"
                            />
                        ))}
                    </svg>
                </div>

                {/* X-axis labels */}
                <div className="absolute left-14 right-0 -bottom-6 flex justify-between">
                    {data.map((d, i) => (
                        <span key={i} className="text-xs text-slate-500 -rotate-0">
                            {d.label.split('/')[0]}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SimpleLineChart;

