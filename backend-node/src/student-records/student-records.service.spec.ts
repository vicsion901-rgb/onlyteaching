import { Test, TestingModule } from '@nestjs/testing';
import { StudentRecordsService } from './student-records.service';

describe('StudentRecordsService', () => {
  let service: StudentRecordsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StudentRecordsService],
    }).compile();

    service = module.get<StudentRecordsService>(StudentRecordsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
