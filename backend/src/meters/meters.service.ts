import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkOrdersService } from '../work-orders/work-orders.service';

@Injectable()
export class MetersService {
  constructor(
    private prisma: PrismaService,
    private workOrdersService: WorkOrdersService,
  ) {}

  findAll() {
    return this.prisma.meter.findMany({
      include: {
        vessel: { select: { id: true, name: true, imoNumber: true } },
        readings: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.meter.findUnique({
      where: { id },
      include: {
        vessel: true,
        readings: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });
  }

  async create(data: {
    vesselId: string;
    name: string;
    unit: string;
    lowThreshold?: number;
    highThreshold?: number;
    reminderFrequency?: string;
  }) {
    const meter = await this.prisma.meter.create({
      data: {
        vesselId: data.vesselId,
        name: data.name,
        unit: data.unit,
        lowThreshold: data.lowThreshold,
        highThreshold: data.highThreshold,
        reminderFrequency: data.reminderFrequency,
      },
    });

    // If reminder frequency is set, create a Maintenance Schedule for it
    if (data.reminderFrequency && data.reminderFrequency !== 'NONE') {
      let timeInterval = 1;
      let timeFrequency = 'DAILY';

      if (data.reminderFrequency === 'WEEKLY') {
        timeFrequency = 'WEEKLY';
      } else if (data.reminderFrequency === 'MONTHLY') {
        timeFrequency = 'MONTHLY';
      }

      await this.workOrdersService.createRecurring({
        vesselId: data.vesselId,
        title: `Log Meter Reading: ${data.name}`,
        description: `Please manually log the reading for ${data.name} on the vessel.`,
        recurrenceType: 'TIME_BASED',
        timeFrequency,
        timeInterval,
      });
    }

    return meter;
  }

  getReadings(meterId: string) {
    return this.prisma.meterReading.findMany({
      where: { meterId },
      orderBy: { timestamp: 'asc' }, // For charting
    });
  }

  async addReading(meterId: string, data: { value: number; loggedBy?: string }) {
    const meter = await this.prisma.meter.findUnique({ where: { id: meterId } });
    if (!meter) throw new NotFoundException('Meter not found');

    const reading = await this.prisma.meterReading.create({
      data: {
        meterId,
        value: data.value,
        loggedBy: data.loggedBy || 'System',
      },
    });

    // Check thresholds to trigger Auto Work Order
    let triggerAlert = false;
    let description = '';

    if (meter.highThreshold !== null && data.value > meter.highThreshold) {
      triggerAlert = true;
      description = `Meter ${meter.name} reading (${data.value} ${meter.unit}) exceeded High Threshold (${meter.highThreshold} ${meter.unit}).`;
    } else if (meter.lowThreshold !== null && data.value < meter.lowThreshold) {
      triggerAlert = true;
      description = `Meter ${meter.name} reading (${data.value} ${meter.unit}) dropped below Low Threshold (${meter.lowThreshold} ${meter.unit}).`;
    }

    if (triggerAlert) {
      const wo = await this.workOrdersService.create({
        vesselId: meter.vesselId,
        title: `[ALARM] ${meter.name} Out of Bounds`,
        description,
        type: 'CORRECTIVE',
        priority: 'CRITICAL',
      });
      
      const v = await this.prisma.vessel.findUnique({ where: { id: meter.vesselId } });
      const vesselName = v ? v.name : 'Unknown Vessel';
      const lowVal = meter.lowThreshold !== null ? meter.lowThreshold : 'None';
      const highVal = meter.highThreshold !== null ? meter.highThreshold : 'None';

      await this.workOrdersService.addComment(wo.id, {
        senderName: 'System Monitor',
        message: `Your ${meter.name} machine in vessel ${vesselName}, exceed. value : ${data.value}, low : ${lowVal}, high : ${highVal}`
      });
    }

    return reading;
  }
}
