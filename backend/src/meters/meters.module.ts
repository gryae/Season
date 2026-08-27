import { Module } from '@nestjs/common';
import { MetersController } from './meters.controller';
import { MetersService } from './meters.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';

@Module({
  imports: [PrismaModule, WorkOrdersModule],
  controllers: [MetersController],
  providers: [MetersService],
  exports: [MetersService],
})
export class MetersModule {}
