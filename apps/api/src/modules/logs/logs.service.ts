import { Injectable } from '@nestjs/common';
import { PriceBasis, PriceItem } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface IrpcLogDto {
  id: string;
  createdAt: string;
  actor: string;
  category: 'Order' | 'Batch' | 'Inventory' | 'SMS' | 'Pricing';
  action: string;
  target: string;
  details: string | null;
}

const priceItemLabels: Record<PriceItem, string> = {
  [PriceItem.PALAY_FRESH]: 'Fresh palay',
  [PriceItem.PALAY_DRY]: 'Dry palay',
  [PriceItem.RICE]: 'Rice',
  [PriceItem.DRYING_FEE]: 'Drying fee',
  [PriceItem.MILLING_FEE]: 'Milling fee',
};
const priceBasisLabels: Record<PriceBasis, string> = {
  [PriceBasis.MARKET]: 'Market',
  [PriceBasis.NFA]: 'NFA',
};
const enumLabel = (value: string) =>
  value.toLowerCase().split('_').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');

@Injectable()
export class LogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<IrpcLogDto[]> {
    const [orders, batches, damages, stock, sms, prices] = await Promise.all([
      this.prisma.orderEvent.findMany({
        take: 100, orderBy: { createdAt: 'desc' },
        include: { actor: { select: { name: true } }, order: { select: { id: true } } },
      }),
      this.prisma.batchEvent.findMany({
        take: 100, orderBy: { createdAt: 'desc' },
        include: { actor: { select: { name: true } }, batch: { select: { code: true } } },
      }),
      this.prisma.batchDamage.findMany({
        take: 100, orderBy: { occurredAt: 'desc' },
        include: { recordedBy: { select: { name: true } }, batch: { select: { code: true } } },
      }),
      this.prisma.stockAdjustment.findMany({
        take: 100, orderBy: { createdAt: 'desc' },
        include: { actor: { select: { name: true } }, riceType: { select: { name: true } } },
      }),
      this.prisma.smsLog.findMany({ take: 100, orderBy: { createdAt: 'desc' } }),
      this.prisma.price.findMany({
        take: 100, orderBy: { effectiveAt: 'desc' },
        include: { createdBy: { select: { name: true } }, riceType: { select: { name: true } } },
      }),
    ]);

    const rows: IrpcLogDto[] = [
      ...orders.map((row) => ({
        id: `order-${row.id}`, createdAt: row.createdAt.toISOString(), actor: row.actor?.name ?? 'System', category: 'Order' as const,
        action: row.fromStatus ? `${enumLabel(row.fromStatus)} → ${enumLabel(row.toStatus)}` : `Created as ${enumLabel(row.toStatus)}`,
        target: `Order IRPC-${String(row.order.id).padStart(4, '0')}`, details: row.note,
      })),
      ...batches.map((row) => ({
        id: `batch-${row.id}`, createdAt: row.createdAt.toISOString(), actor: row.actor?.name ?? 'System', category: 'Batch' as const,
        action: row.fromStatus ? `${enumLabel(row.fromStatus)} → ${enumLabel(row.toStatus)}` : `Created as ${enumLabel(row.toStatus)}`,
        target: `Batch ${row.batch.code}`, details: row.note,
      })),
      ...damages.map((row) => ({
        id: `damage-${row.id}`, createdAt: row.occurredAt.toISOString(), actor: row.recordedBy?.name ?? 'System', category: 'Batch' as const,
        action: `Damaged ${row.kg.toFixed(2)} kg`, target: `Batch ${row.batch.code}`,
        details: `Recorded loss: ₱${row.costAmount.toFixed(2)}${row.note ? `. ${row.note}` : ''}`,
      })),
      ...stock.map((row) => ({
        id: `stock-${row.id}`, createdAt: row.createdAt.toISOString(), actor: row.actor?.name ?? 'System', category: 'Inventory' as const,
        action: `${row.changeKg.isNegative() ? 'Removed' : 'Added'} ${row.changeKg.abs().toFixed(2)} kg`, target: row.riceType.name, details: row.reason,
      })),
      ...sms.map((row) => ({
        id: `sms-${row.id}`, createdAt: row.createdAt.toISOString(), actor: 'System', category: 'SMS' as const,
        action: `${row.direction.toLowerCase()} · ${row.status}`, target: row.phone, details: row.providerId ? `Provider ID ${row.providerId}` : null,
      })),
      ...prices.map((row) => ({
        id: `price-${row.id}`, createdAt: row.effectiveAt.toISOString(), actor: row.createdBy.name, category: 'Pricing' as const,
        action: `Set ${priceItemLabels[row.item].toLowerCase()} price to ₱${row.pricePerKg.toFixed(2)}/kg`,
        target: row.riceType?.name ?? priceItemLabels[row.item], details: priceBasisLabels[row.basis],
      })),
    ];
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200);
  }
}
