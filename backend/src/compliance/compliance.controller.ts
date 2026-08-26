import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ComplianceService } from './compliance.service';

@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('certificates')
  findAll(@Query('vesselId') vesselId?: string) {
    return this.complianceService.findAllCertificates(vesselId);
  }

  @Post('certificates')
  create(@Body() body: any) {
    return this.complianceService.createCertificate(body);
  }

  @Patch('certificates/:id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.complianceService.updateCertificate(id, body);
  }

  @Get('alerts')
  getAlerts(@Query('unread') unread?: string) {
    return this.complianceService.getAlerts(unread === 'true' ? false : undefined);
  }

  @Patch('alerts/:id/read')
  markRead(@Param('id') id: string) {
    return this.complianceService.markAlertRead(id);
  }

  @Post('check-expiry')
  runCheck() {
    return this.complianceService.checkExpiringCertificates();
  }

  @Get('stats')
  getStats() {
    return this.complianceService.getExpiryStats();
  }
}
