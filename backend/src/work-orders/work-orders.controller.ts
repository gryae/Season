import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';

@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.workOrdersService.findAll(status);
  }

  @Get('stats')
  getStats() {
    return this.workOrdersService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workOrdersService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.workOrdersService.create(body);
  }

  @Post('recurring')
  createRecurring(@Body() body: any) {
    return this.workOrdersService.createRecurring(body);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: any) {
    return this.workOrdersService.updateStatus(id, body);
  }

  @Get(':id/comments')
  getComments(@Param('id') id: string) {
    return this.workOrdersService.getComments(id);
  }

  @Post(':id/comments')
  addComment(@Param('id') id: string, @Body() body: any) {
    return this.workOrdersService.addComment(id, body);
  }

  @Delete(':id/spareparts/:usageId')
  removeSparepartUsage(@Param('id') id: string, @Param('usageId') usageId: string) {
    return this.workOrdersService.removeSparepartUsage(id, usageId);
  }
}
