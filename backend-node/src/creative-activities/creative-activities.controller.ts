import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CreativeActivitiesService } from './creative-activities.service';

@Controller('creative-activities')
export class CreativeActivitiesController {
  constructor(private readonly creativeActivitiesService: CreativeActivitiesService) {}

  @Post()
  create(@Body() createCreativeActivityDto: any) {
    return this.creativeActivitiesService.create(createCreativeActivityDto);
  }

  @Get()
  findAll() {
    return this.creativeActivitiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.creativeActivitiesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCreativeActivityDto: any) {
    return this.creativeActivitiesService.update(+id, updateCreativeActivityDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.creativeActivitiesService.remove(+id);
  }
}
