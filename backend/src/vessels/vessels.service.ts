import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VesselsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.vessel.findMany({
      include: {
        telemetries: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        _count: {
          select: { workOrders: true, certificates: true },
        },
      },
    });
  }

  findOne(id: string) {
    return this.prisma.vessel.findUnique({
      where: { id },
      include: {
        telemetries: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
        maintenanceSchedules: true,
        workOrders: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        certificates: true,
      },
    });
  }

  async getStats() {
    const [total, active, maintenance, docked] = await Promise.all([
      this.prisma.vessel.count(),
      this.prisma.vessel.count({ where: { status: 'ACTIVE' } }),
      this.prisma.vessel.count({ where: { status: 'MAINTENANCE' } }),
      this.prisma.vessel.count({ where: { status: 'DOCKED' } }),
    ]);
    return { total, active, maintenance, docked };
  }

  create(data: any) {
    return this.prisma.vessel.create({
      data: {
        name: data.name,
        imoNumber: data.imoNumber,
        vesselType: data.type,
        status: data.status || 'DOCKED',
        flag: data.flag || 'Unknown',
      },
    });
  }

  updateStatus(id: string, status: any) {
    return this.prisma.vessel.update({
      where: { id },
      data: { status },
    });
  }
}
