import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { SparepartsService } from './spareparts.service';

@Controller('spareparts')
export class SparepartsController {
  constructor(private readonly sparepartsService: SparepartsService) {}

  @Get()
  findAll() {
    return this.sparepartsService.findAll();
  }

  @Get('low-stock')
  getLowStock() {
    return this.sparepartsService.getLowStockItems();
  }

  @Get('purchase-requests')
  getPurchaseRequests() {
    return this.sparepartsService.getAllPurchaseRequests();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sparepartsService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.sparepartsService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.sparepartsService.update(id, body);
  }

  @Post(':id/deduct')
  deductStock(@Param('id') id: string, @Body() body: { quantity: number }) {
    return this.sparepartsService.deductStock(id, body.quantity);
  }

  @Patch('purchase-requests/:id/status')
  updatePRStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.sparepartsService.updatePRStatus(id, body.status);
  }
}
