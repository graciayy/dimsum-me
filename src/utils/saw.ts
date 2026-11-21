import { SawAlternative, SawCalculationResult, SawCriterion, SawNormalizedRow } from '../types';

export function validateSawWeights(criteria: SawCriterion[]): {
  isValid: boolean;
  totalWeight: number;
  message: string;
} {
  if (criteria.length === 0) {
    return { isValid: false, totalWeight: 0, message: 'Minimal harus ada 1 kriteria.' };
  }
  for (const c of criteria) {
    if (Number.isNaN(c.weight) || c.weight < 0 || c.weight > 100) {
      return {
        isValid: false,
        totalWeight: criteria.reduce((acc, item) => acc + (Number.isFinite(item.weight) ? item.weight : 0), 0),
        message: `Bobot untuk "${c.name}" harus antara 0% dan 100%.`,
      };
    }
  }
  const totalWeight = Math.round(criteria.reduce((acc, c) => acc + c.weight, 0) * 100) / 100;
  const isValid = Math.abs(totalWeight - 100) < 0.01;
  return {
    isValid,
    totalWeight,
    message: isValid
      ? 'Total bobot valid (100%).'
      : `Total bobot saat ini ${totalWeight}%. Harus tepat 100%.`,
  };
}

export function classifySawScore(score: number): 'Baik' | 'Cukup' | 'Perlu Evaluasi' {
  if (score >= 0.75) return 'Baik';
  if (score >= 0.6) return 'Cukup';
  return 'Perlu Evaluasi';
}

export function calculateSaw(
  criteria: SawCriterion[],
  alternatives: SawAlternative[]
): SawCalculationResult {
  const validation = validateSawWeights(criteria);

  if (alternatives.length === 0 || criteria.length === 0) {
    return {
      criteria,
      rows: [],
      averageScore: 0,
      overallStatus: 'Perlu Evaluasi',
      isWeightValid: validation.isValid,
      totalWeight: validation.totalWeight,
    };
  }

  // Step 1: Find max/min per criterion across alternatives
  const extrema: Record<string, { max: number; min: number }> = {};
  for (const c of criteria) {
    const values = alternatives.map((alt) => Math.max(0, alt.scores[c.id] ?? 0));
    extrema[c.id] = {
      max: Math.max(...values, 0),
      min: Math.min(...values),
    };
  }

  // Step 2: Normalize matrix R and compute Preference Value V_i = sum(w_j * r_ij)
  const rawRows: SawNormalizedRow[] = alternatives.map((alt) => {
    const normalizedScores: Record<string, number> = {};
    let preferenceValue = 0;

    for (const c of criteria) {
      const x = Math.max(0, alt.scores[c.id] ?? 0);
      const { max, min } = extrema[c.id];
      let r = 0;
      if (c.type === 'benefit') {
        r = max > 0 ? x / max : 0;
      } else {
        // Cost attribute: min / x (guard against zero)
        if (min === 0) {
          r = x === 0 ? 1 : 0;
        } else {
          r = x > 0 ? min / x : 1;
        }
      }
      const roundedR = Math.round(r * 10000) / 10000;
      normalizedScores[c.id] = roundedR;

      const normalizedWeight = (c.weight / 100);
      preferenceValue += normalizedWeight * roundedR;
    }

    const roundedV = Math.round(preferenceValue * 1000) / 1000;
    return {
      alternativeId: alt.id,
      label: alt.label,
      cashierName: alt.cashierName,
      period: alt.period,
      rawScores: { ...alt.scores },
      normalizedScores,
      preferenceValue: roundedV,
      rank: 0,
      category: classifySawScore(roundedV),
    };
  });

  // Step 3: Sort descending by preferenceValue and assign ranks
  const sorted = [...rawRows].sort((a, b) => b.preferenceValue - a.preferenceValue);
  sorted.forEach((row, index) => {
    row.rank = index + 1;
  });

  const avg =
    sorted.length > 0
      ? Math.round((sorted.reduce((sum, r) => sum + r.preferenceValue, 0) / sorted.length) * 100) /
        100
      : 0;

  return {
    criteria,
    rows: sorted,
    averageScore: avg,
    overallStatus: classifySawScore(avg),
    isWeightValid: validation.isValid,
    totalWeight: validation.totalWeight,
  };
}
