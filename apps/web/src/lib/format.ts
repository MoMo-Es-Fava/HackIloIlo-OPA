export const fmt = (n: number, d = 0) => n.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
export const peso = (n: number | string | null, d = 2) => n === null ? "Not available" : `${Number(n) < 0 ? "-" : ""}₱${fmt(Math.abs(Number(n)), d)}`;
export const kgf = (n: number | string) => `${Number(n).toLocaleString("en-PH", { maximumFractionDigits: 2 })} kg`;
export const dateLabel = (iso: string) => new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium", timeZone: "Asia/Manila",
}).format(new Date(iso));
// Accounting style, as in IRPC's financial statements: a negative amount is shown in parentheses.
export const pesoAccounting = (n: number | string, d = 0) => Number(n) < 0 ? `(${peso(Math.abs(Number(n)), d)})` : peso(n, d);
