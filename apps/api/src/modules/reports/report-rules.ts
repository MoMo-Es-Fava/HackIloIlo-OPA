import { BadRequestException } from '@nestjs/common';

// The statement itself is computed by buildReport in @irpc/types, shared with the web demo data.
export {
  buildAnswerStats,
  buildReport,
  monthsBetween,
  splitServiceFee,
  type ReportRow,
} from '@irpc/types';

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const manilaToday = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

/** Validates YYYY-MM-DD and returns the UTC instant when that Manila day starts. */
export function manilaDayStart(date: string): Date {
  if (!DATE.test(date)) {
    throw new BadRequestException('Dates must use YYYY-MM-DD format.');
  }
  const [year, month, day] = date.split('-').map(Number);
  const utc = Date.UTC(year, month - 1, day);
  if (new Date(utc).toISOString().slice(0, 10) !== date) {
    throw new BadRequestException('Choose a valid calendar date.');
  }
  return new Date(utc - MANILA_OFFSET_MS);
}
