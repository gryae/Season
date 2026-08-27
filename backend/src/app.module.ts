import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { VesselsModule } from './vessels/vessels.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { SparepartsModule } from './spareparts/spareparts.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { ComplianceModule } from './compliance/compliance.module';
import { CronModule } from './cron/cron.module';
import { MetersModule } from './meters/meters.module';
import { UploadController } from './upload/upload.controller';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    VesselsModule,
    TelemetryModule,
    SparepartsModule,
    WorkOrdersModule,
    ComplianceModule,
    CronModule,
    MetersModule,
  ],
})
export class AppModule {}
