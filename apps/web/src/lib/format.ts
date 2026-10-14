export const fmt = (n: number, d = 0) => n.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
export const peso = (n: number, d = 2) => `${n < 0 ? "-" : ""}₱${fmt(Math.abs(n), d)}`;
export const kgf = (n: number) => `${fmt(n)} kg`;
