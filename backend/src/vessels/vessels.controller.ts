import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { VesselsService } from './vessels.service';

@Controller('vessels')
export class VesselsController {
  constructor(private readonly vesselsService: VesselsService) {}

  @Post()
  create(@Body() data: any) {
    return this.vesselsService.create(data);
  }

  @Get()
  findAll() {
    return this.vesselsService.findAll();
  }

  @Get('stats')
  getStats() {
    return this.vesselsService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vesselsService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: any) {
    return this.vesselsService.updateStatus(id, status);
  }
}
