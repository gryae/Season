import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { MetersService } from './meters.service';

@Controller('meters')
export class MetersController {
  constructor(private readonly metersService: MetersService) {}

  @Get()
  findAll() {
    return this.metersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.metersService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.metersService.create(body);
  }

  @Get(':id/readings')
  getReadings(@Param('id') id: string) {
    return this.metersService.getReadings(id);
  }

  @Post(':id/readings')
  addReading(@Param('id') id: string, @Body() body: any) {
    return this.metersService.addReading(id, body);
  }
}
