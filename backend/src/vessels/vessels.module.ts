import { Module } from '@nestjs/common';
import { VesselsService } from './vessels.service';
import { VesselsController } from './vessels.controller';

@Module({
  controllers: [VesselsController],
  providers: [VesselsService],
  exports: [VesselsService],
})
export class VesselsModule {}
