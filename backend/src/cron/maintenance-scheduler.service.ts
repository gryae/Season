import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WorkOrdersService } from '../work-orders/work-orders.service';

@Injectable()
export class MaintenanceSchedulerService {
  private readonly logger = new Logger(MaintenanceSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workOrdersService: WorkOrdersService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.debug('Checking for due maintenance schedules...');
    
    // Find active maintenance schedules and include their vessel's current run hours
    const dueSchedules = await this.prisma.maintenanceSchedule.findMany({
      where: {
        isActive: true,
      },
      include: {
        vessel: true,
      },
    });

    const now = new Date();

    for (const schedule of dueSchedules) {
      let isDue = false;
      let newTargetRunHours = schedule.targetRunHours;
      let newNextDueDate = schedule.nextDueDate;

      if (schedule.recurrenceType === 'RUN_HOURS' && schedule.targetRunHours) {
        if (schedule.vessel.currentRunHours >= schedule.targetRunHours) {
          isDue = true;
          newTargetRunHours = schedule.targetRunHours + (schedule.intervalRunHours || 0);
        }
      } else if (schedule.recurrenceType === 'TIME_BASED' && schedule.nextDueDate) {
        if (now >= schedule.nextDueDate) {
          isDue = true;
          if (schedule.timeFrequency && schedule.timeInterval) {
            const nextDate = new Date(schedule.nextDueDate);
            if (schedule.timeFrequency === 'DAILY') nextDate.setDate(nextDate.getDate() + schedule.timeInterval);
            if (schedule.timeFrequency === 'WEEKLY') nextDate.setDate(nextDate.getDate() + schedule.timeInterval * 7);
            if (schedule.timeFrequency === 'MONTHLY') nextDate.setMonth(nextDate.getMonth() + schedule.timeInterval);
            if (schedule.timeFrequency === 'YEARLY') nextDate.setFullYear(nextDate.getFullYear() + schedule.timeInterval);
            newNextDueDate = nextDate;
          }
        }
      }

      if (isDue) {
        this.logger.log(`Maintenance due for ${schedule.vessel.name}: ${schedule.taskName}`);
        
        // Check if an incomplete PREVENTIVE work order for this schedule already exists
        const existingIncomplete = await this.prisma.workOrder.findFirst({
          where: {
            maintenanceScheduleId: schedule.id,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
        });

        if (!existingIncomplete) {
          // Create the PREVENTIVE Work Order
          await this.workOrdersService.create({
            vesselId: schedule.vesselId,
            maintenanceScheduleId: schedule.id,
            title: `Preventive: ${schedule.taskName}`,
            description: schedule.description || `Automated maintenance generated at ${schedule.recurrenceType === 'RUN_HOURS' ? schedule.vessel.currentRunHours + ' run hours' : new Date().toLocaleDateString()}.`,
            type: 'PREVENTIVE',
            priority: 'HIGH',
            scheduledDate: new Date().toISOString(),
          });

          // Generate alert
          await this.prisma.alert.create({
            data: {
              type: 'WORK_ORDER_CREATED',
              title: `Maintenance Due: ${schedule.taskName}`,
              message: `Preventive maintenance automatically triggered for ${schedule.vessel.name}`,
              severity: 'WARNING',
            }
          });
        }

        // Advance the schedule target
        await this.prisma.maintenanceSchedule.update({
          where: { id: schedule.id },
          data: {
            lastTriggeredAt: schedule.vessel.currentRunHours,
            targetRunHours: newTargetRunHours,
            nextDueDate: newNextDueDate,
          },
        });
      }
    }
  }
}
