import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BatchStatus,
  OrderStatus,
  OrderType,
  PalayCondition,
  PriceItem,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { BadInputDto, BatchDamageDto, CompleteMillingDto, StartMillingDto } from './batches.dto';
import { randomBytes } from 'node:crypto';

type Tx = Prisma.TransactionClient;
const D = (value: string | number | Prisma.Decimal) => new Prisma.Decimal(value);
const BATCH_DETAIL = {
  items: { include: { order: { select: { id: true, contactPhone: true, palayCondition: true, variety: true } } }, orderBy: { id: 'asc' as const } },
  events: { include: { actor: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' as const } },
  damages: { include: { recordedBy: { select: { id: true, name: true } } }, orderBy: { occurredAt: 'asc' as const } },
  sales: { include: { buyer: { select: { id: true, name: true } } }, orderBy: { soldAt: 'desc' as const } },
} satisfies Prisma.BatchRecordInclude;

@Injectable()
export class BatchesService {
  constructor(private readonly prisma: PrismaService) {}

  eligibleOrders() {
    return this.prisma.order.findMany({
      where: {
        type: OrderType.SELL_PALAY,
        status: OrderStatus.WEIGHED,
        weightConfirmedAt: { not: null },
        batchItems: { none: {} },
      },
      orderBy: { updatedAt: 'asc' },
      select: {
        id: true,
        contactName: true,
        palayCondition: true,
        variety: true,
        wetKg: true,
        dryKg: true,
        unitPrice: true,
        updatedAt: true,
      },
    }).then((orders) => orders.map((order) => ({
      id: order.id,
      farmerName: order.contactName,
      palayCondition: order.palayCondition,
      variety: order.variety,
      kg: (order.palayCondition === PalayCondition.DRY ? order.dryKg : order.wetKg)?.toString() ?? '0.00',
      unitPrice: order.unitPrice?.toString() ?? '0.00',
      receivedAt: order.updatedAt.toISOString(),
    })));
  }

  list(includeBadInput = false) {
    return this.prisma.batchRecord.findMany({
      where: includeBadInput ? { status: BatchStatus.BAD_INPUT } : { status: { not: BatchStatus.BAD_INPUT } },
      include: BATCH_DETAIL,
      orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
    });
  }

  async get(id: number) {
    const batch = await this.prisma.batchRecord.findUnique({ where: { id }, include: BATCH_DETAIL });
    if (!batch) throw new NotFoundException('Batch not found.');
    return batch;
  }

  async create(orderIds: number[], actorId: number) {
    const ids = [...new Set(orderIds)];
    return this.prisma.$transaction(async (tx) => {
      const orders = await tx.order.findMany({
        where: { id: { in: ids }, batchItems: { none: {} } },
        include: { events: { where: { toStatus: OrderStatus.WEIGHED }, orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      if (orders.length !== ids.length || orders.some((order) =>
        order.type !== OrderType.SELL_PALAY || order.status !== OrderStatus.WEIGHED ||
        !order.weightConfirmedAt || !order.palayCondition || !order.unitPrice,
      )) {
        throw new ConflictException('Select only weighed, confirmed palay purchases that are not already in a batch.');
      }
      const condition = orders[0].palayCondition!;
      if (orders.some((order) => order.palayCondition !== condition)) {
        throw new BadRequestException('Fresh and dry palay must be placed in separate batches.');
      }
      const items = orders.map((order) => {
        const kg = condition === PalayCondition.DRY ? order.dryKg : order.wetKg;
        if (!kg || kg.lte(0)) throw new ConflictException(`Order ${order.id} has no confirmed palay weight.`);
        const unitPrice = order.unitPrice!;
        return {
          orderId: order.id,
          farmerName: order.contactName,
          kg,
          unitPrice,
          orderCost: kg.mul(unitPrice).toDecimalPlaces(2),
          soldAt: order.events[0]?.createdAt ?? order.updatedAt,
          paidAt: order.paidAt,
        };
      });
      const inputKg = items.reduce((sum, item) => sum.add(item.kg), D(0));
      const palayCost = items.reduce((sum, item) => sum.add(item.orderCost), D(0)).toDecimalPlaces(2);
      const now = new Date();
      const date = now.toISOString().slice(0, 10).replaceAll('-', '');
      const code = `B-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
      return tx.batchRecord.create({
        data: {
          code,
          status: BatchStatus.NONE,
          wetKg: inputKg,
          ...(condition === PalayCondition.DRY ? { dryKg: inputKg } : {}),
          palayCost,
          totalCost: palayCost,
          receivedAt: new Date(Math.min(...items.map((item) => item.soldAt.getTime()))),
          createdById: actorId,
          items: { create: items },
          events: { create: { toStatus: BatchStatus.NONE, actorId, note: condition === PalayCondition.DRY ? 'Dry palay received; batch can proceed directly to milling.' : 'Fresh palay received.' } },
        },
        include: BATCH_DETAIL,
      });
    });
  }

  async startDrying(id: number, actorId: number) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await this.mustGet(tx, id);
      if (batch.status !== BatchStatus.NONE || batch.dryKg) {
        throw new ConflictException('Only a fresh palay batch that has not started processing can start drying.');
      }
      const rate = await this.currentRate(tx, PriceItem.DRYING_FEE);
      const updated = await tx.batchRecord.update({
        where: { id }, data: { status: BatchStatus.DRYING, dryingStartedAt: new Date(), dryingRate: rate },
      });
      await tx.batchEvent.create({ data: { batchId: id, fromStatus: batch.status, toStatus: BatchStatus.DRYING, actorId, note: `Drying started at ₱${rate.toFixed(2)}/kg.` } });
      return updated;
    });
  }

  async startMilling(id: number, dto: StartMillingDto, actorId: number) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await this.mustGet(tx, id);
      let dryKg = batch.dryKg;
      let dryingEndedAt: Date | undefined;
      if (batch.status === BatchStatus.DRYING) {
        if (!dto.dryKg) throw new BadRequestException('Enter the dried palay weight before starting milling.');
        dryKg = D(dto.dryKg);
        const availableWetKg = batch.wetKg.sub(await this.damageAt(tx, id, BatchStatus.NONE));
        if (dryKg.lte(0) || dryKg.gt(availableWetKg)) throw new BadRequestException('Dried weight must be above zero and cannot exceed the remaining fresh palay.');
        dryingEndedAt = new Date();
      } else if (batch.status !== BatchStatus.NONE || !dryKg) {
        throw new ConflictException('Start drying first for fresh palay, or use a batch of dry palay to mill directly.');
      } else {
        const remaining = dryKg.sub(await this.damageAt(tx, id, BatchStatus.NONE));
        if (remaining.lte(0)) throw new ConflictException('This batch has no undamaged dry palay remaining.');
        dryKg = remaining;
      }
      const rate = await this.currentRate(tx, PriceItem.MILLING_FEE);
      const updated = await tx.batchRecord.update({
        where: { id },
        data: { status: BatchStatus.MILLING, dryKg, ...(dryingEndedAt ? { dryingEndedAt } : {}), millingStartedAt: new Date(), millingRate: rate },
      });
      await tx.batchEvent.create({
        data: {
          batchId: id, fromStatus: batch.status, toStatus: BatchStatus.MILLING, actorId,
          note: batch.status === BatchStatus.NONE ? `Dry palay sent directly to milling at ₱${rate.toFixed(2)}/kg.` : `Drying complete; milling started at ₱${rate.toFixed(2)}/kg.`,
        },
      });
      return updated;
    });
  }

  async completeMilling(id: number, dto: CompleteMillingDto, actorId: number) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await this.mustGet(tx, id);
      if (batch.status !== BatchStatus.MILLING || !batch.dryKg || !batch.millingRate) {
        throw new ConflictException('Only a batch being milled can be completed.');
      }
      const riceKg = D(dto.riceKg);
      if (riceKg.lte(0) || riceKg.gt(batch.dryKg)) {
        throw new BadRequestException('Milled rice weight must be above zero and cannot exceed the available dried palay.');
      }
      const dryingCost = batch.dryingRate ? batch.wetKg.mul(batch.dryingRate).toDecimalPlaces(2) : D(0);
      const millingCost = riceKg.mul(batch.millingRate).toDecimalPlaces(2);
      const totalCost = batch.palayCost.add(dryingCost).add(millingCost).toDecimalPlaces(2);
      const updated = await tx.batchRecord.update({
        where: { id },
        data: { status: BatchStatus.COMPLETE, riceKg, millingEndedAt: new Date(), completedAt: new Date(), dryingCost, millingCost, totalCost },
      });
      await tx.batchEvent.create({ data: { batchId: id, fromStatus: batch.status, toStatus: BatchStatus.COMPLETE, actorId, note: `Milling complete: ${riceKg.toFixed(2)} kg rice.` } });
      return updated;
    });
  }

  async flagBadInput(id: number, dto: BadInputDto, actorId: number) {
    if (dto.reason.length < 3) throw new BadRequestException('Give a short reason (at least 3 characters).');
    return this.prisma.$transaction(async (tx) => {
      const batch = await this.mustGet(tx, id);
      if (batch.status === BatchStatus.BAD_INPUT || batch.status === BatchStatus.DAMAGED) throw new ConflictException('This batch cannot be marked as bad input.');
      await tx.batchRecord.update({
        where: { id },
        data: { statusBeforeBadInput: batch.status, status: BatchStatus.BAD_INPUT, badInputAt: new Date(), badInputReason: dto.reason, badInputById: actorId },
      });
      await tx.batchEvent.create({ data: { batchId: id, fromStatus: batch.status, toStatus: BatchStatus.BAD_INPUT, actorId, note: dto.reason } });
      return this.mustGet(tx, id);
    });
  }

  async restoreBadInput(id: number, actorId: number) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await this.mustGet(tx, id);
      if (batch.status !== BatchStatus.BAD_INPUT) throw new ConflictException('Only a bad-input batch can be restored.');
      const toStatus = batch.statusBeforeBadInput ?? BatchStatus.NONE;
      const updated = await tx.batchRecord.update({
        where: { id }, data: { status: toStatus, statusBeforeBadInput: null, badInputAt: null, badInputReason: null, badInputById: null },
      });
      await tx.batchEvent.create({ data: { batchId: id, fromStatus: BatchStatus.BAD_INPUT, toStatus, actorId, note: 'Restored from bad-input list.' } });
      return this.mustGet(tx, updated.id);
    });
  }

  async recordDamage(id: number, dto: BatchDamageDto, actorId: number) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await this.mustGet(tx, id);
      if (batch.status !== BatchStatus.NONE && batch.status !== BatchStatus.COMPLETE) {
        throw new ConflictException('Damage can be recorded for received or fully processed batches.');
      }
      const stage = batch.status;
      const capacity = stage === BatchStatus.NONE ? batch.wetKg : batch.riceKg;
      if (!capacity) throw new ConflictException('This batch has no recorded weight to damage.');
      const kg = D(dto.kg);
      const existing = await this.damageAt(tx, id, stage);
      if (kg.lte(0) || existing.add(kg).gt(capacity)) throw new BadRequestException('Damaged weight cannot exceed the remaining batch amount.');
      const costBase = stage === BatchStatus.NONE ? batch.palayCost : batch.totalCost;
      const costAmount = capacity.isZero() ? D(0) : costBase.mul(kg).div(capacity).toDecimalPlaces(2);
      const damagedKg = batch.damagedKg.add(kg);
      const fullWriteOff = existing.add(kg).gte(capacity);
      await tx.batchDamage.create({ data: { batchId: id, fromStatus: stage, kg, costAmount, note: dto.note || null, recordedById: actorId } });
      await tx.batchRecord.update({ where: { id }, data: { damagedKg, ...(fullWriteOff ? { status: BatchStatus.DAMAGED } : {}) } });
      if (fullWriteOff) {
        await tx.batchEvent.create({ data: { batchId: id, fromStatus: stage, toStatus: BatchStatus.DAMAGED, actorId, note: `Whole batch written off (${kg.toFixed(2)} kg damage recorded).` } });
      }
      return this.get(id);
    });
  }

  private async mustGet(tx: Tx, id: number) {
    const batch = await tx.batchRecord.findUnique({ where: { id }, include: BATCH_DETAIL });
    if (!batch) throw new NotFoundException('Batch not found.');
    return batch;
  }

  private damageAt(tx: Tx, batchId: number, status: BatchStatus) {
    return tx.batchDamage.aggregate({ where: { batchId, fromStatus: status }, _sum: { kg: true } })
      .then((result) => result._sum.kg ?? D(0));
  }

  private async currentRate(tx: Tx, item: PriceItem) {
    const row = await tx.price.findFirst({
      where: { item, riceTypeId: null, effectiveAt: { lte: new Date() } },
      orderBy: [{ effectiveAt: 'desc' }, { id: 'desc' }],
    });
    if (!row) throw new ConflictException(`Set the current ${item === PriceItem.DRYING_FEE ? 'drying' : 'milling'} fee before processing batches.`);
    return row.pricePerKg;
  }
}
