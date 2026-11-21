import { useEffect, useRef } from 'react';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { formatCompactRupiah, formatRupiah } from '../../utils/formatters';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface SalesBarChartProps {
  data: Array<{
    date: string;
    label: string;
    actual: number;
    comparison: number;
    qris: number;
    tunai: number;
  }>;
  mode?: 'stacked' | 'grouped';
}

export function SalesBarChart({ data, mode = 'stacked' }: SalesBarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const labels = data.map((d) => d.label);
    const primaryValues = data.map((d) => d.qris);
    const secondaryValues = data.map((d) =>
      mode === 'stacked' ? d.tunai : Math.max(0, d.comparison - d.actual)
    );

    chartRef.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: mode === 'stacked' ? 'Pembayaran QRIS' : 'Penjualan Aktual',
            data: mode === 'stacked' ? primaryValues : data.map((d) => d.actual),
            backgroundColor: '#E85D3F',
            hoverBackgroundColor: '#C93D22',
            borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 4, bottomRight: 4 },
            borderSkipped: false,
            barPercentage: 0.58,
            categoryPercentage: 0.78,
          },
          {
            label: mode === 'stacked' ? 'Pembayaran Tunai' : 'Target Harian',
            data: secondaryValues,
            backgroundColor: '#F9E1D6',
            hoverBackgroundColor: '#F5C4B0',
            borderRadius: { topLeft: 5, topRight: 5, bottomLeft: 0, bottomRight: 0 },
            borderSkipped: false,
            barPercentage: 0.58,
            categoryPercentage: 0.78,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: '#151923',
            titleColor: '#FFFFFF',
            bodyColor: '#F9FAFB',
            padding: 12,
            cornerRadius: 10,
            displayColors: true,
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                return `Tanggal ${data[idx]?.label ?? ''} 2026`;
              },
              label: (ctx) => {
                const idx = ctx.dataIndex;
                const row = data[idx];
                if (!row) return '';
                if (ctx.datasetIndex === 0) {
                  return ` QRIS: ${formatRupiah(row.qris)}`;
                }
                return ` Tunai: ${formatRupiah(row.tunai)}`;
              },
              afterBody: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const row = data[idx];
                if (!row) return [];
                return [`Total Penjualan: ${formatRupiah(row.actual)}`];
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: '#6B7280',
              font: {
                family: 'Plus Jakarta Sans, sans-serif',
                size: 11,
                weight: 500,
              },
            },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            border: { display: false, dash: [4, 4] },
            grid: {
              color: '#F3ECE8',
            },
            ticks: {
              color: '#6B7280',
              maxTicksLimit: 6,
              font: {
                family: 'Plus Jakarta Sans, sans-serif',
                size: 11,
                weight: 500,
              },
              callback: (value) => formatCompactRupiah(Number(value)),
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [data, mode]);

  return (
    <div className="relative h-[190px] w-full" data-testid="sales-bar-chart">
      <canvas ref={canvasRef} aria-label="Grafik Total Penjualan Harian" />
    </div>
  );
}
