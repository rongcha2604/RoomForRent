// billing.ts
// Mini library tính tiền trọ: pro-rate theo ngày thực, điện/nước, phụ phí, khấu trừ cọc.
// ISO date string (YYYY-MM-DD). Period dùng [start, end) — start inclusive, end exclusive.

export type Money = number; // VND
export type ISODate = string; // '2025-10-29'

export interface Period {
  start: ISODate; // inclusive (vd: '2025-10-10')
  end: ISODate;   // exclusive (vd: '2025-10-20' nghĩa là đến hết 19/10)
}

export interface UtilityUsage {
  kwh?: { prev: number; curr: number; rate: Money };     // điện
  m3?:  { prev: number; curr: number; rate: Money };     // nước
}

export interface Line {
  code: string;             // ví dụ: RENT, ELEC, WATER, CLEANING, SURCHARGE, DISCOUNT
  note?: string;
  qty?: number;
  unitPrice?: Money;
  amount: Money;            // line total (dương = thu, âm = giảm trừ)
}

export interface InvoiceDraft {
  roomId: string;
  period: Period;               // kỳ hóa đơn
  monthlyRent: Money;           // giá phòng theo tháng (có thể thay đổi theo thời gian — xem calcRent có đa tháng)
  utilities?: UtilityUsage;     // điện, nước tính theo chỉ số
  surcharges?: Line[];          // phụ phí cộng thêm (dương)
  discounts?: Line[];           // giảm trừ (âm)
  roundingTo?: number;          // làm tròn đến nghìn: 1000 (mặc định)
}

export interface InvoiceResult {
  lines: Line[];
  subtotal: Money;
  roundingDelta: Money;
  total: Money;
}

export interface DepositSettlement {
  // Quyết toán giữa hóa đơn & cọc
  fromDeposit: Money;       // phần đã trừ từ cọc (min(total, depositBalance))
  collectMore: Money;       // nếu total > depositBalance → số cần thu thêm
  refund: Money;            // nếu depositBalance > total → số hoàn lại
  depositRemaining: Money;  // số cọc còn lại sau quyết toán
}

export const VND = (x: Money) => Math.round(x); // lưu số nguyên VND

export function roundTo(x: Money, step: number = 1000): { rounded: Money; delta: Money } {
  const r = Math.round(x / step) * step;
  return { rounded: r, delta: r - x };
}

export function daysBetween(period: Period): number {
  const s = new Date(period.start);
  const e = new Date(period.end);
  // số ngày theo [start, end)
  return Math.max(0, Math.ceil((e.getTime() - s.getTime()) / 86400000));
}

export function daysInMonth(d: Date): number {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

export function splitPeriodByMonths(period: Period): Period[] {
  // Tách kỳ theo từng tháng để tính pro-rate chính xác khi kỳ vắt nhiều tháng
  const out: Period[] = [];
  let s = new Date(period.start);
  const end = new Date(period.end);

  while (s < end) {
    const year = s.getUTCFullYear();
    const month = s.getUTCMonth();
    const monthEnd = new Date(Date.UTC(year, month, daysInMonth(s)));
    monthEnd.setUTCDate(monthEnd.getUTCDate() + 1); // sang ngày đầu tháng kế (exclusive)
    const pEnd = monthEnd < end ? monthEnd : end;
    out.push({ start: s.toISOString().slice(0, 10), end: pEnd.toISOString().slice(0, 10) });
    s = pEnd;
  }
  return out;
}

/**
 * Tính tiền nhà pro-rate theo ngày thực. Nếu kỳ vắt nhiều tháng, chia tháng để tính đúng theo từng tháng.
 * monthlyRent: giá tháng áp cho toàn kỳ; nếu bạn có bảng giá thay đổi theo ngày, hãy gọi calcRent nhiều lần theo từng giai đoạn giá khác nhau rồi cộng lại.
 */
export function calcRentByPeriod(period: Period, monthlyRent: Money): Money {
  const chunks = splitPeriodByMonths(period);
  let sum = 0;
  for (const c of chunks) {
    const dStart = new Date(c.start);
    const dim = daysInMonth(dStart);
    const nDays = daysBetween(c);
    const prorated = (monthlyRent * nDays) / dim;
    sum += prorated;
  }
  return VND(sum);
}

export function calcUtilities(u?: UtilityUsage): { lines: Line[]; total: Money } {
  const lines: Line[] = [];
  let total = 0;

  if (u?.kwh) {
    const used = u.kwh.curr - u.kwh.prev;
    const amt = VND(used * u.kwh.rate);
    lines.push({ code: "ELEC", note: `Điện ${used} kWh`, qty: used, unitPrice: u.kwh.rate, amount: amt });
    total += amt;
  }

  if (u?.m3) {
    const used = u.m3.curr - u.m3.prev;
    const amt = VND(used * u.m3.rate);
    lines.push({ code: "WATER", note: `Nước ${used} m³`, qty: used, unitPrice: u.m3.rate, amount: amt });
    total += amt;
  }

  return { lines, total };
}

export function buildInvoice(d: InvoiceDraft): InvoiceResult {
  const lines: Line[] = [];

  // 1) Tiền nhà
  const rent = calcRentByPeriod(d.period, d.monthlyRent);
  const days = daysBetween(d.period);
  lines.push({ code: "RENT", note: `Tiền nhà (${days} ngày)`, amount: rent });

  // 2) Điện nước
  const util = calcUtilities(d.utilities);
  lines.push(...util.lines);

  // 3) Phụ phí & giảm trừ
  if (d.surcharges?.length) lines.push(...d.surcharges);
  if (d.discounts?.length)  lines.push(...d.discounts);

  const subtotal = VND(lines.reduce((a, b) => a + b.amount, 0));
  const { rounded, delta } = roundTo(subtotal, d.roundingTo ?? 1000);

  return {
    lines,
    subtotal,
    roundingDelta: delta, // dương nghĩa là làm tròn lên; âm = làm tròn xuống
    total: rounded
  };
}

export function settleWithDeposit(total: Money, depositBalance: Money): DepositSettlement {
  if (depositBalance >= total) {
    return {
      fromDeposit: total,
      collectMore: 0,
      refund: depositBalance - total,
      depositRemaining: depositBalance - total
    };
  }
  return {
    fromDeposit: depositBalance,
    collectMore: total - depositBalance,
    refund: 0,
    depositRemaining: 0
  };
}

/** Tách kỳ tại mốc cutDate để "chốt & tạo kỳ mới" (ví dụ thêm bạn ở chung).
 *  Trả về [kỳ_đầu, kỳ_sau]. cutDate trở thành start của kỳ sau.
 */
export function splitAt(original: Period, cutDate: ISODate): [Period, Period] {
  if (!(original.start < cutDate && cutDate <= original.end)) {
    throw new Error("cutDate phải nằm trong (start, end]");
  }
  return [
    { start: original.start, end: cutDate },
    { start: cutDate, end: original.end }
  ];
}

