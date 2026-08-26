import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TelemetryService } from '../telemetry/telemetry.service';
import { ComplianceService } from '../compliance/compliance.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private telemetryService: TelemetryService,
    private complianceService: ComplianceService,
  ) {}

  // ============================================================
  // 1. GPS TELEMETRY SEEDER — Every 60 seconds
  //    Seeds dummy GPS coordinates + increments run_hours
  // ============================================================
  @Cron(CronExpression.EVERY_MINUTE)
  async handleTelemetrySeed() {
    this.logger.log('🛰️ [CRON] Seeding GPS telemetry...');
    try {
      await this.telemetryService.seedDummyGpsData();
    } catch (error) {
      this.logger.error('Telemetry seed error:', error.message);
    }
  }

  // ============================================================
  // 2. AUTO PREVENTIVE MAINTENANCE ENGINE — Every hour
  //    Checks run_hours of each vessel against PM schedule
  //    Auto-generates Work Orders when threshold is reached
  // ============================================================
  @Cron(CronExpression.EVERY_HOUR)
  async handlePreventiveMaintenanceCheck() {
    this.logger.log('⚙️ [CRON] Running Preventive Maintenance check...');

    try {
      const vessels = await this.prisma.vessel.findMany({
        where: { status: 'ACTIVE' },
      });

      let woCreated = 0;

      for (const vessel of vessels) {
        const schedules = await this.prisma.maintenanceSchedule.findMany({
          where: {
            vesselId: vessel.id,
            isActive: true,
            targetRunHours: { lte: vessel.currentRunHours },
          },
        });

        for (const schedule of schedules) {
          // Check if there's already an open WO for this schedule
          const existingOpenWO = await this.prisma.workOrder.findFirst({
            where: {
              maintenanceScheduleId: schedule.id,
              status: { in: ['PENDING', 'IN_PROGRESS'] },
            },
          });

          if (existingOpenWO) {
            this.logger.debug(
              `⏭️ Skipping PM for "${schedule.taskName}" — WO already open: ${existingOpenWO.woNumber}`
            );
            continue;
          }

          // ⚡ Generate new Work Order
          const woNumber = `WO-PM-${Date.now()}-${vessel.id.slice(-4).toUpperCase()}`;

          const newWO = await this.prisma.workOrder.create({
            data: {
              woNumber,
              vesselId: vessel.id,
              maintenanceScheduleId: schedule.id,
              title: `[PM] ${schedule.taskName} — ${vessel.name}`,
              description: schedule.description ||
                `Preventive Maintenance triggered at ${vessel.currentRunHours.toFixed(1)} run hours. ` +
                `Task: ${schedule.taskName}. Interval: every ${schedule.intervalRunHours} hours.`,
              priority: 'HIGH',
              status: 'PENDING',
              scheduledDate: new Date(),
            },
          });

          // Update the next target run hours
          await this.prisma.maintenanceSchedule.update({
            where: { id: schedule.id },
            data: {
              targetRunHours: vessel.currentRunHours + schedule.intervalRunHours,
              lastTriggeredAt: vessel.currentRunHours,
            },
          });

          // Log alert
          await this.prisma.alert.create({
            data: {
              type: 'WORK_ORDER_CREATED',
              title: `🔧 Auto-PM Work Order Created: ${vessel.name}`,
              message: `Work Order ${woNumber} auto-generated for "${schedule.taskName}" at ${vessel.currentRunHours.toFixed(1)} run hours.`,
              severity: 'INFO',
              referenceId: newWO.id,
              referenceType: 'WorkOrder',
            },
          });

          this.logger.log(
            `✅ Auto-PM WO created: ${woNumber} | Vessel: ${vessel.name} | Task: ${schedule.taskName}`
          );
          woCreated++;
        }
      }

      this.logger.log(`⚙️ PM check complete. ${woCreated} Work Order(s) auto-generated.`);
    } catch (error) {
      this.logger.error('PM Engine error:', error.message);
    }
  }

  // ============================================================
  // 3. CERTIFICATE EXPIRY CHECKER — Daily at 08:00 AM
  //    Checks if any certificate expires within 30 days
  //    Creates early-warning alerts in the database
  // ============================================================
  @Cron('0 8 * * *')
  async handleCertificateExpiryCheck() {
    this.logger.log('📋 [CRON] Running daily certificate expiry check...');
    try {
      const alerts = await this.complianceService.checkExpiringCertificates();
      this.logger.log(`📋 Certificate check done. ${alerts.length} new alert(s).`);
    } catch (error) {
      this.logger.error('Certificate check error:', error.message);
    }
  }

  // ============================================================
  // 4. LOW STOCK ALERT CHECK — Every 6 hours
  //    Proactively checks for low-stock items and re-alerts
  // ============================================================
  @Cron('0 */6 * * *')
  async handleLowStockCheck() {
    this.logger.log('📦 [CRON] Running low stock check...');
    try {
      // Raw query to compare two columns (Prisma can't do column-to-column comparison)
      const items = await this.prisma.$queryRaw<any[]>`
        SELECT id, name, "currentStock", "minimumStockLevel"
        FROM "Sparepart"
        WHERE "currentStock" < "minimumStockLevel"
      `;

      this.logger.log(`📦 Low stock check: ${items.length} item(s) below minimum level.`);

      for (const item of items) {
        // Check if a PENDING PR already exists
        const existingPR = await this.prisma.purchaseRequest.findFirst({
          where: { sparepartId: item.id, status: 'PENDING' },
        });

        if (!existingPR) {
          this.logger.warn(`📦 Low stock: ${item.name} (${item.currentStock}/${item.minimumStockLevel}) — consider raising a PR.`);
        }
      }
    } catch (error) {
      this.logger.error('Low stock check error:', error.message);
    }
  }
}
