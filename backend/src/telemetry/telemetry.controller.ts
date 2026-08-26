import { Controller, Get, Param, Query } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Get('live')
  getLiveLocations() {
    return this.telemetryService.getLiveLocations();
  }

  @Get('history/:vesselId')
  getHistory(
    @Param('vesselId') vesselId: string,
    @Query('limit') limit?: string,
  ) {
    return this.telemetryService.getTelemetryHistory(vesselId, limit ? parseInt(limit) : 20);
  }
}
