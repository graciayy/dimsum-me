import { useState } from 'react';
import {
  CheckCircle2,
  Eye,
  GitFork,
  Play,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { C45Class, C45Record, C45TreeNode } from '../types';
import { C45_ATTRIBUTES, C45_CLASSES, computeEntropy, predictC45 } from '../utils/c45';

function TreeNodeView({ node, edgeLabel }: { node: C45TreeNode; edgeLabel?: string }) {
  const badgeColor =
    node.label === 'Sesuai'
      ? 'border-emerald-200 bg-emerald-50 text-[#16A34A]'
      : node.label === 'Perlu Pemeriksaan'
        ? 'border-amber-200 bg-amber-50 text-[#D97706]'
        : 'border-red-200 bg-red-50 text-[#DC3C2B]';

  return (
    <div className="flex min-w-0 flex-col items-start">
      {edgeLabel && (
        <span className="mb-1 inline-block rounded-md bg-[#FDECE7] px-2 py-0.5 text-[11px] font-semibold text-[#C93D22]">
          = {edgeLabel}
        </span>
      )}

      {node.type === 'leaf' ? (
        <div className={`w-full rounded-xl border px-3 py-2 text-xs font-bold break-words ${badgeColor}`}>
          <span>Kelas: {node.label}</span>
          <span className="ml-1.5 font-normal opacity-80">({node.sampleCount} data)</span>
        </div>
      ) : (
        <div className="w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#151923]">
              Node: {node.attributeLabel}
            </span>
            <span className="font-mono text-[10.5px] text-[#6B7280]">
              n={node.sampleCount} · H={node.entropy.toFixed(3)} · GR=
              {(node.gainRatio ?? 0).toFixed(3)}
            </span>
          </div>

          {node.children && (
            <div className="mt-2.5 grid grid-cols-1 gap-2.5 border-t border-[#F0E7E2] pt-2.5 pl-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(node.children).map(([val, child]) => (
                <TreeNodeView key={child.id} node={child} edgeLabel={val} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function KlasifikasiC45Page() {
  const {
    c45TrainData,
    c45TestData,
    c45Tree,
    c45RootMetrics,
    c45Evaluation,
    retrainC45,
    recordC45Prediction,
  } = useApp();

  const [activeSection, setActiveSection] = useState<'tree' | 'eval' | 'predict'>('tree');
  const [splitRatio, setSplitRatio] = useState<number>(0.7);
  const [trainToast, setTrainToast] = useState<string | null>(null);

  const [sampleInput, setSampleInput] = useState<Omit<C45Record, 'id' | 'label'>>({
    selisihNominal: 'Nol',
    verifikasiQris: 'Menunggu',
    kelengkapanBukti: 'Lengkap',
    ketepatanWaktu: 'Tepat Waktu',
  });
  const [predictionOutput, setPredictionOutput] = useState<{
    predictedClass: C45Class;
    path: string[];
  } | null>(null);

  const rootEntropy = computeEntropy(c45TrainData);

  const handleRunTraining = () => {
    retrainC45(splitRatio);
    setTrainToast(
      `Model C4.5 berhasil dilatih ulang (${Math.round(splitRatio * 100)}% training).`
    );
    setTimeout(() => setTrainToast(null), 3000);
  };

  const handleRunPrediction = () => {
    const res = predictC45(c45Tree, sampleInput);
    setPredictionOutput(res);
    setActiveSection('predict');
    recordC45Prediction({
      inputFeatures: sampleInput,
      predictedClass: res.predictedClass,
      path: res.path,
    });
  };

  return (
    <div className="mx-auto max-w-[1320px] space-y-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#151923]">
            Klasifikasi Ketepatan Kas (Algoritma C4.5)
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRunTraining}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#E85D3F] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#C93D22]"
          >
            <Play className="h-3.5 w-3.5" />
            Jalankan Training
          </button>
          <button
            type="button"
            onClick={handleRunPrediction}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#F0E7E2] bg-white px-3.5 py-2 text-xs font-semibold text-[#151923] hover:bg-[#FAF2EE]"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#E85D3F]" />
            Jalankan Prediksi
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('tree')}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold ${
              activeSection === 'tree'
                ? 'border-[#E85D3F] bg-[#FDECE7] text-[#C93D22]'
                : 'border-[#F0E7E2] bg-white text-[#151923]'
            }`}
          >
            <GitFork className="h-3.5 w-3.5" />
            Lihat Decision Tree
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('eval')}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold ${
              activeSection === 'eval'
                ? 'border-[#E85D3F] bg-[#FDECE7] text-[#C93D22]'
                : 'border-[#F0E7E2] bg-white text-[#151923]'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Lihat Evaluasi Model
          </button>
        </div>
      </div>

      {trainToast && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-[#16A34A]"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{trainToast}</span>
        </div>
      )}

      {/* Dataset Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#F0E7E2] bg-white p-4">
          <p className="text-xs text-[#6B7280]">Data Training / Testing</p>
          <p className="tabular-nums mt-1 text-2xl font-bold text-[#151923]">
            {c45TrainData.length} / {c45TestData.length}
          </p>
          <div className="mt-2 flex items-center gap-2 text-[11px]">
            <label className="text-[#6B7280]" htmlFor="c45-split">
              Rasio Train:
            </label>
            <select
              id="c45-split"
              value={splitRatio}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSplitRatio(val);
                retrainC45(val);
              }}
              className="rounded-md border border-[#F0E7E2] bg-[#FCF8F5] px-1.5 py-0.5 font-semibold"
            >
              <option value={0.6}>60% / 40%</option>
              <option value={0.7}>70% / 30%</option>
              <option value={0.8}>80% / 20%</option>
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-[#F0E7E2] bg-white p-4">
          <p className="text-xs text-[#6B7280]">Entropy Awal S (Root)</p>
          <p className="tabular-nums mt-1 text-2xl font-bold text-[#151923]">
            {rootEntropy.toFixed(4)}
          </p>
          <p className="mt-1 text-[11px] text-[#6B7280]">
            4 atribut · 3 kelas target
          </p>
        </div>

        <div className="rounded-2xl border border-[#F0E7E2] bg-white p-4">
          <p className="text-xs text-[#6B7280]">Accuracy Model Uji</p>
          <p className="tabular-nums mt-1 text-2xl font-bold text-[#16A34A]">
            {(c45Evaluation.accuracy * 100).toFixed(1)}%
          </p>
          <p className="mt-1 text-[11px] text-[#6B7280]">
            Macro F1: {(c45Evaluation.macroF1 * 100).toFixed(1)}%
          </p>
        </div>

        <div className="rounded-2xl border border-[#F0E7E2] bg-white p-4">
          <p className="text-xs text-[#6B7280]">Root Split Terbaik</p>
          <p className="mt-1 text-lg font-bold text-[#C93D22]">
            {c45RootMetrics.find((m) => m.selected)?.attributeLabel ?? '-'}
          </p>
          <p className="tabular-nums mt-1 text-[11px] text-[#6B7280]">
            Gain Ratio: {c45RootMetrics.find((m) => m.selected)?.gainRatio.toFixed(4)}
          </p>
        </div>
      </div>

      {/* Perhitungan Entropy, Gain, SplitInfo, Gain Ratio */}
      <section className="rounded-2xl border border-[#F0E7E2] bg-white p-5">
        <h2 className="mb-3 text-base font-bold text-[#151923]">
          Perhitungan Node Akar C4.5 (Entropy, Information Gain, Split Info &amp; Gain Ratio)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#F0E7E2] bg-[#FCF8F5] text-[#6B7280]">
              <tr>
                <th className="px-3.5 py-2.5 font-semibold">Atribut Klasifikasi</th>
                <th className="px-3.5 py-2.5 text-right font-semibold">Entropy(S)</th>
                <th className="px-3.5 py-2.5 text-right font-semibold">Information Gain</th>
                <th className="px-3.5 py-2.5 text-right font-semibold">Split Information</th>
                <th className="px-3.5 py-2.5 text-right font-semibold">Gain Ratio</th>
                <th className="px-3.5 py-2.5 text-right font-semibold">Keputusan Split</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E7E2]">
              {c45RootMetrics.map((m) => (
                <tr key={m.attribute} className={m.selected ? 'bg-[#FFF9F7]' : ''}>
                  <td className="px-3.5 py-2.5 font-semibold text-[#151923]">
                    {m.attributeLabel}
                  </td>
                  <td className="tabular-nums px-3.5 py-2.5 text-right font-mono">
                    {m.entropyBefore.toFixed(4)}
                  </td>
                  <td className="tabular-nums px-3.5 py-2.5 text-right font-mono">
                    {m.informationGain.toFixed(4)}
                  </td>
                  <td className="tabular-nums px-3.5 py-2.5 text-right font-mono">
                    {m.splitInfo.toFixed(4)}
                  </td>
                  <td className="tabular-nums px-3.5 py-2.5 text-right font-mono font-bold text-[#C93D22]">
                    {m.gainRatio.toFixed(4)}
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    {m.selected ? (
                      <span className="rounded-md bg-[#FDECE7] px-2 py-0.5 text-[11px] font-bold text-[#C93D22]">
                        Node Akar Terpilih
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#9CA3AF]">Kandidat Cabang</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dynamic Panel: Decision Tree | Evaluasi Model | Prediksi */}
      {activeSection === 'tree' && (
        <section className="rounded-2xl border border-[#F0E7E2] bg-white p-5">
          <h2 className="mb-3 text-base font-bold text-[#151923]">
            Visualisasi Decision Tree C4.5
          </h2>
          <TreeNodeView node={c45Tree} />
        </section>
      )}

      {activeSection === 'eval' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#F0E7E2] bg-white p-5">
            <h2 className="mb-3 text-base font-bold text-[#151923]">
              Confusion Matrix ({c45TestData.length} Data Uji)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs">
                <thead>
                  <tr className="border-b border-[#F0E7E2] bg-[#FCF8F5] text-[#6B7280]">
                    <th className="px-3 py-2 text-left font-semibold">Aktual \ Prediksi</th>
                    {C45_CLASSES.map((cls) => (
                      <th key={cls} className="px-3 py-2 font-semibold">
                        {cls}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E7E2]">
                  {C45_CLASSES.map((actualCls) => (
                    <tr key={actualCls}>
                      <td className="px-3 py-2.5 text-left font-semibold text-[#151923]">
                        {actualCls}
                      </td>
                      {C45_CLASSES.map((predCls) => {
                        const count = c45Evaluation.confusionMatrix[actualCls][predCls];
                        const isDiag = actualCls === predCls;
                        return (
                          <td
                            key={predCls}
                            className={`tabular-nums px-3 py-2.5 font-bold ${
                              isDiag
                                ? 'bg-emerald-50/70 text-[#16A34A]'
                                : count > 0
                                  ? 'bg-red-50 text-[#DC3C2B]'
                                  : 'text-[#9CA3AF]'
                            }`}
                          >
                            {count}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-[#F0E7E2] bg-white p-5">
            <h2 className="mb-3 text-base font-bold text-[#151923]">
              Metrik Evaluasi per Kelas (Precision, Recall, F1-Score)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#F0E7E2] bg-[#FCF8F5] text-[#6B7280]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Kelas</th>
                    <th className="px-3 py-2 text-right font-semibold">Precision</th>
                    <th className="px-3 py-2 text-right font-semibold">Recall</th>
                    <th className="px-3 py-2 text-right font-semibold">F1-Score</th>
                    <th className="px-3 py-2 text-right font-semibold">Support</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E7E2]">
                  {C45_CLASSES.map((cls) => {
                    const m = c45Evaluation.perClass[cls];
                    return (
                      <tr key={cls}>
                        <td className="px-3 py-2.5 font-semibold text-[#151923]">{cls}</td>
                        <td className="tabular-nums px-3 py-2.5 text-right">
                          {(m.precision * 100).toFixed(1)}%
                        </td>
                        <td className="tabular-nums px-3 py-2.5 text-right">
                          {(m.recall * 100).toFixed(1)}%
                        </td>
                        <td className="tabular-nums px-3 py-2.5 text-right font-bold text-[#C93D22]">
                          {(m.f1 * 100).toFixed(1)}%
                        </td>
                        <td className="tabular-nums px-3 py-2.5 text-right">{m.support}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Interactive Prediction Section */}
      <section className="rounded-2xl border border-[#F0E7E2] bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#151923]">Uji Prediksi Transaksi Baru (C4.5)</h2>
          </div>
          <button
            type="button"
            onClick={handleRunPrediction}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#E85D3F] px-4 py-2 text-xs font-bold text-white hover:bg-[#C93D22]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Prediksi Sekarang
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {C45_ATTRIBUTES.map((attr) => (
            <label key={attr.key} className="block text-xs font-medium text-[#6B7280]">
              {attr.label}
              <select
                value={sampleInput[attr.key]}
                onChange={(e) =>
                  setSampleInput((prev) => ({
                    ...prev,
                    [attr.key]: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] px-3 py-2 text-xs font-semibold text-[#151923] focus:border-[#E85D3F] focus:bg-white focus:outline-none"
              >
                {attr.values.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        {predictionOutput && (
          <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-[#F0E7E2] bg-[#FCF8F5] p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Jalur Penelusuran Decision Tree
              </p>
              <p className="mt-1 font-mono text-xs text-[#151923]">
                {predictionOutput.path.join('  →  ')}
              </p>
            </div>
            <div className="shrink-0">
              <span
                className={`inline-block rounded-xl px-4 py-2 text-xs font-bold ${
                  predictionOutput.predictedClass === 'Sesuai'
                    ? 'bg-emerald-50 text-[#16A34A]'
                    : predictionOutput.predictedClass === 'Perlu Pemeriksaan'
                      ? 'bg-amber-50 text-[#D97706]'
                      : 'bg-red-50 text-[#DC3C2B]'
                }`}
              >
                Prediksi: {predictionOutput.predictedClass}
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
