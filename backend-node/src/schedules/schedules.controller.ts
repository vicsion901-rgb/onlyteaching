import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    ParseIntPipe,
  } from '@nestjs/common';
  
  import { SchedulesService } from './schedules.service';
  import { CreateScheduleDto } from './dto/create-schedule.dto';
  import { UpdateScheduleDto } from './dto/update-schedule.dto';
  
  @Controller('schedules')
  export class SchedulesController {
    constructor(private readonly schedulesService: SchedulesService) {}
  
    @Get()
    findAll() {
      return this.schedulesService.findAll();
    }
  
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
      return this.schedulesService.findOne(id);
    }
  
    @Post()
    create(@Body() dto: CreateScheduleDto) {
      return this.schedulesService.create(dto);
    }
  
    @Patch(':id')
    update(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: UpdateScheduleDto,
    ) {
      return this.schedulesService.update(id, dto);
    }
  // 
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
      return this.schedulesService.remove(id);
    }
  }