import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SparepartsService } from '../spareparts/spareparts.service';

@Injectable()
export class WorkOrdersService {
  constructor(
    private prisma: PrismaService,
    private sparepartsService: SparepartsService,
  ) {}

  findAll(status?: string) {
    return this.prisma.workOrder.findMany({
      where: status && status !== 'ALL' ? { status: status as any } : undefined,
      include: {
        vessel: { select: { id: true, name: true, imoNumber: true } },
        maintenanceSchedule: { select: { id: true, taskName: true } },
        sparepartUsages: {
          include: { sparepart: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        vessel: true,
        maintenanceSchedule: true,
        sparepartUsages: { include: { sparepart: true } },
      },
    });
  }

  async create(data: {
    vesselId: string;
    maintenanceScheduleId?: string;
    title: string;
    description?: string;
    type?: string;
    priority?: string;
    assignedTo?: string;
    scheduledDate?: string;
  }) {
    const woNumber = `WO-${Date.now()}-${data.vesselId.slice(-4).toUpperCase()}`;
    return this.prisma.workOrder.create({
      data: {
        woNumber,
        vesselId: data.vesselId,
        maintenanceScheduleId: data.maintenanceScheduleId,
        title: data.title,
        description: data.description,
        type: (data.type as any) || 'CORRECTIVE',
        priority: (data.priority as any) || 'MEDIUM',
        assignedTo: data.assignedTo,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        status: 'PENDING',
      },
      include: { vessel: true },
    });
  }

  async createRecurring(data: {
    vesselId: string;
    title: string;
    description?: string;
    recurrenceType: string;
    intervalRunHours?: number;
    timeFrequency?: string;
    timeInterval?: number;
  }) {
    let nextDueDate: Date | null = null;
    let targetRunHours: number | null = null;
    
    if (data.recurrenceType === 'TIME_BASED' && data.timeFrequency && data.timeInterval) {
      nextDueDate = new Date();
      if (data.timeFrequency === 'DAILY') nextDueDate.setDate(nextDueDate.getDate() + data.timeInterval);
      if (data.timeFrequency === 'WEEKLY') nextDueDate.setDate(nextDueDate.getDate() + data.timeInterval * 7);
      if (data.timeFrequency === 'MONTHLY') nextDueDate.setMonth(nextDueDate.getMonth() + data.timeInterval);
      if (data.timeFrequency === 'YEARLY') nextDueDate.setFullYear(nextDueDate.getFullYear() + data.timeInterval);
    } else if (data.recurrenceType === 'RUN_HOURS' && data.intervalRunHours) {
      const vessel = await this.prisma.vessel.findUnique({ where: { id: data.vesselId } });
      targetRunHours = (vessel?.currentRunHours || 0) + data.intervalRunHours;
    }

    return this.prisma.maintenanceSchedule.create({
      data: {
        vesselId: data.vesselId,
        taskName: data.title,
        description: data.description,
        recurrenceType: data.recurrenceType as any,
        intervalRunHours: data.intervalRunHours,
        targetRunHours: targetRunHours,
        timeFrequency: data.timeFrequency as any,
        timeInterval: data.timeInterval,
        nextDueDate,
        isActive: true,
      },
    });
  }

  async getComments(id: string) {
    return this.prisma.workOrderComment.findMany({
      where: { workOrderId: id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addComment(id: string, data: { senderName: string; message: string }) {
    return this.prisma.workOrderComment.create({
      data: {
        workOrderId: id,
        senderName: data.senderName,
        message: data.message,
      },
    });
  }

  async updateStatus(id: string, body: {
    status: string;
    notes?: string;
    assignedTo?: string;
    sparepartsUsed?: Array<{ sparepartId: string; quantity: number }>;
  }) {
    const wo = await this.prisma.workOrder.findUnique({ where: { id } });
    if (!wo) throw new NotFoundException('Work Order not found');

    const updateData: any = {
      status: body.status as any,
      notes: body.notes,
      assignedTo: body.assignedTo,
    };

    if (body.status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    // ⚡ Deduct spareparts on completion
    const prResults: any[] = [];
    if (body.sparepartsUsed && body.sparepartsUsed.length > 0) {
      for (const usage of body.sparepartsUsed) {
        // Create usage record
        await this.prisma.workOrderSparepart.create({
          data: {
            workOrderId: id,
            sparepartId: usage.sparepartId,
            quantityUsed: usage.quantity,
          },
        });

        // Deduct stock (triggers PR if needed)
        const result = await this.sparepartsService.deductStock(usage.sparepartId, usage.quantity);
        if (result.prCreated) {
          prResults.push(result.pr);
        }
      }
    }

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: updateData,
      include: {
        vessel: true,
        sparepartUsages: { include: { sparepart: true } },
      },
    });

    return { workOrder: updated, purchaseRequestsCreated: prResults };
  }

  async getStats() {
    const [total, pending, inProgress, completed] = await Promise.all([
      this.prisma.workOrder.count(),
      this.prisma.workOrder.count({ where: { status: 'PENDING' } }),
      this.prisma.workOrder.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.workOrder.count({ where: { status: 'COMPLETED' } }),
    ]);
    return { total, pending, inProgress, completed };
  }
}
