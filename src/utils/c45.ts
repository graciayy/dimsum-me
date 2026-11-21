import {
  C45AttributeMetric,
  C45Class,
  C45EvaluationMetrics,
  C45Record,
  C45TreeNode,
} from '../types';

export const C45_CLASSES: C45Class[] = ['Sesuai', 'Perlu Pemeriksaan', 'Tidak Sesuai'];

export const C45_ATTRIBUTES: Array<{
  key: keyof Omit<C45Record, 'id' | 'label'>;
  label: string;
  values: string[];
}> = [
  {
    key: 'selisihNominal',
    label: 'Selisih Nominal',
    values: ['Nol', 'Kecil (<=10rb)', 'Besar (>10rb)'],
  },
  {
    key: 'verifikasiQris',
    label: 'Verifikasi QRIS',
    values: ['Terverifikasi', 'Menunggu', 'Tidak Cocok'],
  },
  {
    key: 'kelengkapanBukti',
    label: 'Kelengkapan Bukti',
    values: ['Lengkap', 'Kurang', 'Tidak Ada'],
  },
  {
    key: 'ketepatanWaktu',
    label: 'Ketepatan Waktu Setor',
    values: ['Tepat Waktu', 'Terlambat'],
  },
];

export function getClassDistribution(records: C45Record[]): Record<C45Class, number> {
  const dist: Record<C45Class, number> = {
    Sesuai: 0,
    'Perlu Pemeriksaan': 0,
    'Tidak Sesuai': 0,
  };
  for (const r of records) {
    dist[r.label] = (dist[r.label] || 0) + 1;
  }
  return dist;
}

export function getMajorityClass(records: C45Record[]): C45Class {
  const dist = getClassDistribution(records);
  let bestClass: C45Class = 'Sesuai';
  let bestCount = -1;
  for (const cls of C45_CLASSES) {
    if (dist[cls] > bestCount) {
      bestCount = dist[cls];
      bestClass = cls;
    }
  }
  return bestClass;
}

export function computeEntropy(records: C45Record[]): number {
  const total = records.length;
  if (total === 0) return 0;
  const dist = getClassDistribution(records);
  let entropy = 0;
  for (const cls of C45_CLASSES) {
    const count = dist[cls];
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  }
  return Math.round(entropy * 10000) / 10000;
}

export function computeAttributeMetrics(
  records: C45Record[],
  attributes: Array<{ key: keyof Omit<C45Record, 'id' | 'label'>; label: string }>
): C45AttributeMetric[] {
  const total = records.length;
  const entropyBefore = computeEntropy(records);

  const metrics: C45AttributeMetric[] = attributes.map((attr) => {
    const groups = new Map<string, C45Record[]>();
    for (const r of records) {
      const val = String(r[attr.key]);
      const list = groups.get(val) ?? [];
      list.push(r);
      groups.set(val, list);
    }

    let weightedEntropy = 0;
    let splitInfo = 0;
    for (const subset of groups.values()) {
      const ratio = subset.length / total;
      if (ratio > 0) {
        weightedEntropy += ratio * computeEntropy(subset);
        splitInfo -= ratio * Math.log2(ratio);
      }
    }

    const informationGain = Math.max(0, entropyBefore - weightedEntropy);
    const gainRatio = splitInfo > 0 ? informationGain / splitInfo : 0;

    return {
      attribute: attr.key,
      attributeLabel: attr.label,
      entropyBefore: round4(entropyBefore),
      informationGain: round4(informationGain),
      splitInfo: round4(splitInfo),
      gainRatio: round4(gainRatio),
      selected: false,
    };
  });

  if (metrics.length > 0) {
    let bestIdx = 0;
    for (let i = 1; i < metrics.length; i++) {
      if (metrics[i].gainRatio > metrics[bestIdx].gainRatio) {
        bestIdx = i;
      }
    }
    metrics[bestIdx].selected = true;
  }

  return metrics;
}

let nodeCounter = 0;

function buildTreeRecursive(
  records: C45Record[],
  availableAttrs: Array<{ key: keyof Omit<C45Record, 'id' | 'label'>; label: string }>,
  fallbackClass: C45Class
): C45TreeNode {
  const id = `node-${++nodeCounter}`;
  const dist = getClassDistribution(records);
  const entropy = computeEntropy(records);

  if (records.length === 0) {
    return {
      id,
      type: 'leaf',
      label: fallbackClass,
      sampleCount: 0,
      distribution: dist,
      entropy: 0,
    };
  }

  const majority = getMajorityClass(records);

  // Pure node check
  if (entropy === 0 || availableAttrs.length === 0) {
    return {
      id,
      type: 'leaf',
      label: majority,
      sampleCount: records.length,
      distribution: dist,
      entropy,
    };
  }

  const metrics = computeAttributeMetrics(records, availableAttrs);
  const bestMetric = metrics.find((m) => m.selected) ?? metrics[0];

  // If no positive information gain, stop splitting
  if (!bestMetric || bestMetric.informationGain <= 0.0001) {
    return {
      id,
      type: 'leaf',
      label: majority,
      sampleCount: records.length,
      distribution: dist,
      entropy,
    };
  }

  const bestAttr = availableAttrs.find((a) => a.key === bestMetric.attribute)!;
  const remainingAttrs = availableAttrs.filter((a) => a.key !== bestAttr.key);

  const partitions = new Map<string, C45Record[]>();
  for (const r of records) {
    const val = String(r[bestAttr.key]);
    const list = partitions.get(val) ?? [];
    list.push(r);
    partitions.set(val, list);
  }

  const children: Record<string, C45TreeNode> = {};
  for (const [val, subset] of partitions.entries()) {
    children[val] = buildTreeRecursive(subset, remainingAttrs, majority);
  }

  return {
    id,
    type: 'internal',
    attribute: bestAttr.key,
    attributeLabel: bestAttr.label,
    sampleCount: records.length,
    distribution: dist,
    entropy,
    gainRatio: bestMetric.gainRatio,
    children,
  };
}

export function trainC45Tree(trainingData: C45Record[]): {
  tree: C45TreeNode;
  rootMetrics: C45AttributeMetric[];
} {
  nodeCounter = 0;
  const rootMetrics = computeAttributeMetrics(trainingData, C45_ATTRIBUTES);
  const tree = buildTreeRecursive(trainingData, C45_ATTRIBUTES, 'Sesuai');
  return { tree, rootMetrics };
}

export function predictC45(
  tree: C45TreeNode,
  sample: Omit<C45Record, 'id' | 'label'>
): { predictedClass: C45Class; path: string[] } {
  const path: string[] = [];
  let current: C45TreeNode = tree;

  while (current.type === 'internal' && current.attribute && current.children) {
    const attrKey = current.attribute as keyof Omit<C45Record, 'id' | 'label'>;
    const val = String(sample[attrKey]);
    path.push(`${current.attributeLabel} = ${val}`);
    const nextNode = current.children[val];
    if (!nextNode) {
      // Fallback to majority class in current node distribution
      let best: C45Class = 'Sesuai';
      let bestCount = -1;
      for (const cls of C45_CLASSES) {
        if ((current.distribution[cls] ?? 0) > bestCount) {
          bestCount = current.distribution[cls] ?? 0;
          best = cls;
        }
      }
      path.push(`Fallback Majority → ${best}`);
      return { predictedClass: best, path };
    }
    current = nextNode;
  }

  const finalLabel = current.label ?? 'Sesuai';
  path.push(`Hasil: ${finalLabel}`);
  return { predictedClass: finalLabel, path };
}

export function evaluateC45Model(tree: C45TreeNode, testData: C45Record[]): C45EvaluationMetrics {
  const confusionMatrix: Record<C45Class, Record<C45Class, number>> = {
    Sesuai: { Sesuai: 0, 'Perlu Pemeriksaan': 0, 'Tidak Sesuai': 0 },
    'Perlu Pemeriksaan': { Sesuai: 0, 'Perlu Pemeriksaan': 0, 'Tidak Sesuai': 0 },
    'Tidak Sesuai': { Sesuai: 0, 'Perlu Pemeriksaan': 0, 'Tidak Sesuai': 0 },
  };

  let correctCount = 0;
  const testPredictions = testData.map((record) => {
    const { predictedClass, path } = predictC45(tree, record);
    confusionMatrix[record.label][predictedClass] += 1;
    const correct = predictedClass === record.label;
    if (correct) correctCount += 1;
    return { record, predicted: predictedClass, correct, path };
  });

  const perClass: Record<
    C45Class,
    { precision: number; recall: number; f1: number; support: number }
  > = {
    Sesuai: { precision: 0, recall: 0, f1: 0, support: 0 },
    'Perlu Pemeriksaan': { precision: 0, recall: 0, f1: 0, support: 0 },
    'Tidak Sesuai': { precision: 0, recall: 0, f1: 0, support: 0 },
  };

  let precisionSum = 0;
  let recallSum = 0;
  let f1Sum = 0;
  let activeClassCount = 0;

  for (const cls of C45_CLASSES) {
    const tp = confusionMatrix[cls][cls];
    let fn = 0;
    let fp = 0;
    let support = 0;

    for (const other of C45_CLASSES) {
      support += confusionMatrix[cls][other];
      if (other !== cls) {
        fn += confusionMatrix[cls][other];
        fp += confusionMatrix[other][cls];
      }
    }

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    perClass[cls] = {
      precision: round4(precision),
      recall: round4(recall),
      f1: round4(f1),
      support,
    };

    if (support > 0 || tp + fp > 0) {
      precisionSum += precision;
      recallSum += recall;
      f1Sum += f1;
      activeClassCount += 1;
    }
  }

  const accuracy = testData.length > 0 ? round4(correctCount / testData.length) : 0;
  const denom = activeClassCount > 0 ? activeClassCount : 1;

  return {
    accuracy,
    macroPrecision: round4(precisionSum / denom),
    macroRecall: round4(recallSum / denom),
    macroF1: round4(f1Sum / denom),
    confusionMatrix,
    perClass,
    testPredictions,
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
