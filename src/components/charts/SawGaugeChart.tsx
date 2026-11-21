import { useEffect, useRef } from 'react';
import { ArcElement, Chart, DoughnutController, Tooltip } from 'chart.js';

Chart.register(DoughnutController, ArcElement, Tooltip);

interface SawGaugeChartProps {
  score: number; // 0..1
  target?: number;
}

export function SawGaugeChart({ score, target = 0.75 }: SawGaugeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const clampedScore = Math.max(0, Math.min(1, score));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const activeSegment = Math.round(clampedScore * 100);
    const targetGap = Math.max(0, Math.round((target - clampedScore) * 100));
    const remaining = Math.max(0, 100 - activeSegment - targetGap);

    const activeColor =
      clampedScore >= 0.75 ? '#E06043' : clampedScore >= 0.6 ? '#F59E0B' : '#DC3C2B';

    chartRef.current = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Skor SAW Saat Ini', 'Menuju Target', 'Sisa Skala'],
        datasets: [
          {
            data:
              clampedScore >= target
                ? [Math.round(clampedScore * 78), 10, 22]
                : [activeSegment, targetGap, remaining],
            backgroundColor: [activeColor, '#F7DECE', '#FDE047'],
            borderWidth: 0,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        rotation: -90,
        circumference: 180,
        cutout: '75%',
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: '#151923',
            callbacks: {
              label: (ctx) => `${ctx.label}: ${ctx.parsed}%`,
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [clampedScore, target]);

  return (
    <div className="relative mx-auto h-[120px] w-[210px]" data-testid="saw-gauge-chart">
      <canvas ref={canvasRef} aria-label="Gauge Skor SAW Performa Pencatatan" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className="text-[11px] font-medium text-[#6B7280]">Skor SAW</span>
        <span className="tabular-nums text-[28px] font-bold leading-tight text-[#151923]">
          {clampedScore.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
