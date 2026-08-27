import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SparepartsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.sparepart.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { purchaseRequests: true } },
      },
    });
  }

  findOne(id: string) {
    return this.prisma.sparepart.findUnique({
      where: { id },
      include: { purchaseRequests: { orderBy: { requestedAt: 'desc' } } },
    });
  }

  create(data: {
    partNumber: string;
    name: string;
    description?: string;
    category: string;
    unit?: string;
    currentStock: number;
    minimumStockLevel: number;
    unitPrice?: number;
    location?: string;
  }) {
    return this.prisma.sparepart.create({ data });
  }

  update(id: string, data: Partial<{
    name: string;
    description: string;
    category: string;
    unit: string;
    currentStock: number;
    minimumStockLevel: number;
    unitPrice: number;
    location: string;
  }>) {
    return this.prisma.sparepart.update({ where: { id }, data });
  }

  async deductStock(sparepartId: string, quantity: number): Promise<{ sparepart: any; prCreated: boolean; pr?: any }> {
    const sparepart = await this.prisma.sparepart.findUnique({ where: { id: sparepartId } });
    if (!sparepart) throw new NotFoundException('Sparepart not found');

    const newStock = Math.max(0, sparepart.currentStock - quantity);

    const updated = await this.prisma.sparepart.update({
      where: { id: sparepartId },
      data: { currentStock: newStock },
    });

    let prCreated = false;
    let pr = null;

    // ⚡ Auto-PR logic: if stock drops below minimum, generate a Purchase Request
    if (newStock < sparepart.minimumStockLevel) {
      const existingPendingPR = await this.prisma.purchaseRequest.findFirst({
        where: { sparepartId, status: 'PENDING' },
      });

      if (!existingPendingPR) {
        const prNumber = `PR-${Date.now()}-${sparepartId.slice(-4).toUpperCase()}`;
        const quantityNeeded = sparepart.minimumStockLevel * 2 - newStock;

        pr = await this.prisma.purchaseRequest.create({
          data: {
            prNumber,
            sparepartId,
            quantityNeeded,
            reason: `Stock (${newStock} ${sparepart.unit}) below minimum level (${sparepart.minimumStockLevel} ${sparepart.unit}). Auto-generated PR.`,
            status: 'PENDING',
          },
        });

        // Log alert
        await this.prisma.alert.create({
          data: {
            type: 'LOW_STOCK',
            title: `Low Stock: ${sparepart.name}`,
            message: `Current stock (${newStock}) is below minimum (${sparepart.minimumStockLevel}). Purchase Request ${prNumber} created.`,
            severity: newStock === 0 ? 'CRITICAL' : 'WARNING',
            referenceId: sparepartId,
            referenceType: 'Sparepart',
          },
        });

        prCreated = true;
      }
    }

    return { sparepart: updated, prCreated, pr };
  }

  getAllPurchaseRequests() {
    return this.prisma.purchaseRequest.findMany({
      include: { sparepart: true },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async updatePRStatus(id: string, status: string) {
    const pr = await this.prisma.purchaseRequest.findUnique({ where: { id } });
    if (!pr) throw new NotFoundException('PR not found');

    const updatedPR = await this.prisma.purchaseRequest.update({
      where: { id },
      data: { status: status as any },
    });

    if (status === 'FULFILLED' && pr.status !== 'FULFILLED') {
      await this.prisma.sparepart.update({
        where: { id: pr.sparepartId },
        data: {
          currentStock: { increment: pr.quantityNeeded }
        }
      });
    }

    return updatedPR;
  }

  async createPurchaseRequest(data: { sparepartId: string; quantityNeeded: number; reason?: string }) {
    const prNumber = `PR-${Date.now()}-${data.sparepartId.slice(-4).toUpperCase()}`;
    return this.prisma.purchaseRequest.create({
      data: {
        prNumber,
        ...data,
        status: 'PENDING',
      },
    });
  }

  getLowStockItems() {
    return this.prisma.$queryRaw`
      SELECT * FROM "Sparepart"
      WHERE "currentStock" < "minimumStockLevel"
      ORDER BY "name"
    `;
  }
}
