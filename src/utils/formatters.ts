export function formatRupiah(amount: number): string {
  const isNegative = amount < 0;
  const abs = Math.abs(Math.round(amount));
  const formatted = abs.toLocaleString('id-ID');
  return `${isNegative ? '-Rp ' : 'Rp '}${formatted}`;
}

export function formatCompactRupiah(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    const val = (amount / 1_000_000).toFixed(1).replace('.', ',');
    return `Rp ${val}jt`;
  }
  if (abs >= 1_000) {
    return `Rp ${Math.round(amount / 1_000)}k`;
  }
  return `Rp ${amount}`;
}

export function formatDateID(isoDate: string): string {
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts;
  const monthIdx = parseInt(m, 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return isoDate;
  return `${parseInt(d, 10)} ${months[monthIdx]} ${y}`;
}

export function formatShortDateID(isoDate: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts;
  const monthIdx = parseInt(m, 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return isoDate;
  return `${parseInt(d, 10)} ${months[monthIdx]} ${y}`;
}

export function generateCsvString(headers: string[], rows: Array<Array<string | number>>): string {
  const escape = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  return [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
}
