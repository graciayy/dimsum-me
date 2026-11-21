import { useEffect, useRef, useState } from 'react';
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';
import { AlertCircle, CheckCircle2, RotateCcw, Save } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { INITIAL_SAW_CRITERIA } from '../data/seedData';
import { SawCriterion } from '../types';
import { validateSawWeights } from '../utils/saw';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

export function AnalisisSawPage() {
  const {
    isSupabaseMode,
    currentUser,
    sawCriteria,
    sawAlternatives,
    sawResult,
    updateSawWeights,
  } = useApp();
  const [draftCriteria, setDraftCriteria] = useState<SawCriterion[]>(sawCriteria);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    setDraftCriteria(sawCriteria);
  }, [sawCriteria]);

  const weightValidation = validateSawWeights(draftCriteria);
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    chartInstanceRef.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sawResult.rows.map((r) => `${r.cashierName} (${r.period})`),
        datasets: [
          {
            label: 'Nilai Preferensi (V)',
            data: sawResult.rows.map((r) => r.preferenceValue),
            backgroundColor: sawResult.rows.map((r) =>
              r.preferenceValue >= 0.75 ? '#E85D3F' : '#F5A27F'
            ),
            borderRadius: 6,
            barPercentage: 0.55,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#151923',
            callbacks: {
              label: (ctx) => `Skor Preferensi V: ${Number(ctx.parsed.x).toFixed(3)}`,
            },
          },
        },
        scales: {
          x: {
            min: 0,
            max: 1,
            grid: { color: '#F3ECE8' },
            border: { display: false },
          },
          y: {
            grid: { display: false },
            border: { display: false },
          },
        },
      },
    });

    return () => chartInstanceRef.current?.destroy();
  }, [sawResult]);

  const handleWeightChange = (id: string, val: string) => {
    const num = val === '' ? 0 : Math.max(0, Math.min(100, Number(val)));
    setDraftCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, weight: num } : c)));
    setFeedback(null);
  };

  const handleSaveWeights = async () => {
    const res = await updateSawWeights(draftCriteria);
    setFeedback({ ok: res.ok, text: res.message });
  };

  const handleResetWeights = async () => {
    setDraftCriteria(INITIAL_SAW_CRITERIA);
    const res = await updateSawWeights(INITIAL_SAW_CRITERIA);
    setFeedback({
      ok: res.ok,
      text: res.ok ? 'Bobot dikembalikan ke konfigurasi awal (100%).' : res.message,
    });
  };

  return (
    <div className="mx-auto max-w-[1320px] space-y-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#151923]">
          Analisis Ketepatan Pencatatan (Metode SAW)
        </h1>
      </div>

      {isSupabaseMode && sawAlternatives.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Belum ada sumber alternatif SAW operasional di skema database saat ini. Data alternatif
          simulasi tidak ditampilkan atau dihitung sebagai data Supabase.
        </div>
      )}

      {/* Penjelasan & Rumus */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#F0E7E2] bg-white p-5 lg:col-span-2">
          <h2 className="text-sm font-bold text-[#151923]">Formula &amp; Tahapan Metode SAW</h2>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] p-3 text-xs">
              <p className="font-semibold text-[#151923]">1. Normalisasi Matriks (r_ij)</p>
              <p className="mt-1 font-mono text-[11px] text-[#C93D22]">
                Benefit: r_ij = x_ij / max(x_j)
              </p>
              <p className="font-mono text-[11px] text-[#6B7280]">
                Cost: r_ij = min(x_j) / x_ij
              </p>
            </div>
            <div className="rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] p-3 text-xs">
              <p className="font-semibold text-[#151923]">2. Nilai Preferensi (V_i)</p>
              <p className="mt-1 font-mono text-[11px] text-[#C93D22]">
                V_i = Σ (w_j × r_ij), Σ w_j = 1.00
              </p>
              <p className="text-[11px] text-[#6B7280]">Target Kinerja Baik: V_i ≥ 0.75</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-[#F0E7E2] bg-white p-5">
          <div>
            <p className="text-xs font-medium text-[#6B7280]">Rata-rata Skor SAW Aktif</p>
            <p className="tabular-nums mt-1 text-4xl font-extrabold text-[#151923]">
              {sawResult.averageScore.toFixed(2)}
            </p>
            <span
              className={`mt-2 inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                sawResult.overallStatus === 'Baik'
                  ? 'bg-emerald-50 text-[#16A34A]'
                  : 'bg-amber-50 text-[#D97706]'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Status: {sawResult.overallStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Tabel Kriteria & Pengaturan Bobot */}
      <section className="rounded-2xl border border-[#F0E7E2] bg-white p-5">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-bold text-[#151923]">
              Kriteria &amp; Bobot Penilaian (Total Wajib 100%)
            </h2>
            <p className="text-xs text-[#6B7280]">
              Total bobot saat ini:{' '}
              <strong
                className={`tabular-nums ${
                  weightValidation.isValid ? 'text-[#16A34A]' : 'text-[#DC3C2B]'
                }`}
              >
                {weightValidation.totalWeight}%
              </strong>
            </p>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetWeights}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#F0E7E2] bg-white px-3.5 py-2 text-xs font-semibold text-[#151923] hover:bg-[#FCF8F5]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Default
              </button>
              <button
                type="button"
                disabled={!weightValidation.isValid || draftCriteria.length === 0}
                onClick={handleSaveWeights}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#E85D3F] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#C93D22] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                Simpan &amp; Hitung SAW
              </button>
            </div>
          )}
        </div>

        {!weightValidation.isValid && (
          <div
            role="alert"
            className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-[#DC3C2B]"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{weightValidation.message}</span>
          </div>
        )}

        {feedback && (
          <div
            role="status"
            className={`mb-3 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-medium ${
              feedback.ok ? 'bg-emerald-50 text-[#16A34A]' : 'bg-red-50 text-[#DC3C2B]'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedback.text}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#F0E7E2] bg-[#FCF8F5] text-[#6B7280]">
              <tr>
                <th className="px-3.5 py-2.5 font-semibold">Kode</th>
                <th className="px-3.5 py-2.5 font-semibold">Nama Kriteria</th>
                <th className="px-3.5 py-2.5 font-semibold">Jenis Atribut</th>
                <th className="px-3.5 py-2.5 font-semibold">Keterangan</th>
                <th className="px-3.5 py-2.5 text-right font-semibold">Bobot (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E7E2]">
              {draftCriteria.map((c) => (
                <tr key={c.id}>
                  <td className="px-3.5 py-2.5 font-mono font-bold text-[#E85D3F]">{c.code}</td>
                  <td className="px-3.5 py-2.5 font-semibold text-[#151923]">{c.name}</td>
                  <td className="px-3.5 py-2.5">
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-[#16A34A]">
                      {c.type}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-[#6B7280]">{c.description}</td>
                  <td className="px-3.5 py-2.5 text-right">
                    {isAdmin ? (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={c.weight}
                        onChange={(e) => handleWeightChange(c.id, e.target.value)}
                        aria-label={`Bobot ${c.name}`}
                        className="tabular-nums w-20 rounded-lg border border-[#F0E7E2] bg-[#FCF8F5] px-2.5 py-1 text-right font-bold text-[#151923] focus:border-[#E85D3F] focus:bg-white focus:outline-none"
                      />
                    ) : (
                      <span className="tabular-nums font-bold">{c.weight}%</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Matriks Keputusan & Matriks Normalisasi */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#F0E7E2] bg-white p-5">
          <h3 className="mb-3 text-sm font-bold text-[#151923]">1. Matriks Keputusan (X)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#F0E7E2] bg-[#FCF8F5] text-[#6B7280]">
                <tr>
                  <th className="px-3 py-2 font-semibold">Alternatif Shift</th>
                  {sawCriteria.map((c) => (
                    <th key={c.id} className="px-3 py-2 text-right font-semibold">
                      {c.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E7E2]">
                {sawAlternatives.map((alt) => (
                  <tr key={alt.id}>
                    <td className="px-3 py-2.5 font-medium text-[#151923]">{alt.label}</td>
                    {sawCriteria.map((c) => (
                      <td key={c.id} className="tabular-nums px-3 py-2.5 text-right">
                        {alt.scores[c.id]}
                      </td>
                    ))}
                    {sawAlternatives.length === 0 && (
                      <tr>
                        <td
                          colSpan={sawCriteria.length + 1}
                          className="px-3 py-5 text-center text-[#6B7280]"
                        >
                          Belum tersedia data alternatif.
                        </td>
                      </tr>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-[#F0E7E2] bg-white p-5">
          <h3 className="mb-3 text-sm font-bold text-[#151923]">2. Matriks Normalisasi (R)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#F0E7E2] bg-[#FCF8F5] text-[#6B7280]">
                <tr>
                  <th className="px-3 py-2 font-semibold">Alternatif Shift</th>
                  {sawCriteria.map((c) => (
                    <th key={c.id} className="px-3 py-2 text-right font-semibold">
                      {c.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E7E2]">
                {sawResult.rows.map((row) => (
                  <tr key={row.alternativeId}>
                    <td className="px-3 py-2.5 font-medium text-[#151923]">{row.label}</td>
                    {sawCriteria.map((c) => (
                      <td
                        key={c.id}
                        className="tabular-nums px-3 py-2.5 text-right font-mono text-[11px]"
                      >
                        {row.normalizedScores[c.id]?.toFixed(3)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Hasil Perangkingan & Grafik */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-2xl border border-[#F0E7E2] bg-white p-5">
          <h3 className="mb-3 text-sm font-bold text-[#151923]">
            3. Hasil Perhitungan Preferensi &amp; Ranking
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#F0E7E2] bg-[#FCF8F5] text-[#6B7280]">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Rank</th>
                  <th className="px-3 py-2.5 font-semibold">Kasir &amp; Shift</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Nilai Preferensi (V)</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Interpretasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E7E2]">
                {sawResult.rows.map((row) => (
                  <tr key={row.alternativeId}>
                    <td className="tabular-nums px-3 py-2.5 font-extrabold text-[#C93D22]">
                      #{row.rank}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-[#151923]">{row.label}</td>
                    <td className="tabular-nums px-3 py-2.5 text-right font-mono font-bold">
                      {row.preferenceValue.toFixed(3)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          row.category === 'Baik'
                            ? 'bg-emerald-50 text-[#16A34A]'
                            : row.category === 'Cukup'
                              ? 'bg-amber-50 text-[#D97706]'
                              : 'bg-red-50 text-[#DC3C2B]'
                        }`}
                      >
                        {row.category}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-[#F0E7E2] bg-white p-5">
          <h3 className="mb-3 text-sm font-bold text-[#151923]">Visualisasi Peringkat SAW</h3>
          <div className="h-[220px] w-full">
            <canvas ref={chartCanvasRef} aria-label="Grafik Peringkat SAW" />
          </div>
        </section>
      </div>
    </div>
  );
}
