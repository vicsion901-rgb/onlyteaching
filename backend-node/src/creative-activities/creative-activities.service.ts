import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreativeActivity } from './entities/creative-activity.entity';

@Injectable()
export class CreativeActivitiesService {
  constructor(
    @InjectRepository(CreativeActivity)
    private creativeActivityRepository: Repository<CreativeActivity>,
  ) {}

  async create(createCreativeActivityDto: any) {
    const newActivity = this.creativeActivityRepository.create(createCreativeActivityDto);
    return await this.creativeActivityRepository.save(newActivity);
  }

  async findAll() {
    return await this.creativeActivityRepository.find();
  }

  async findOne(id: number) {
    return await this.creativeActivityRepository.findOne({ where: { id } });
  }

  async update(id: number, updateCreativeActivityDto: any) {
    await this.creativeActivityRepository.update(id, updateCreativeActivityDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.creativeActivityRepository.delete(id);
    return { deleted: true };
  }
}
