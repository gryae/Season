import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { MaintenanceSchedulerService } from './maintenance-scheduler.service';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';

@Module({
  imports: [TelemetryModule, ComplianceModule, WorkOrdersModule],
  providers: [CronService, MaintenanceSchedulerService],
})
export class CronModule {}
