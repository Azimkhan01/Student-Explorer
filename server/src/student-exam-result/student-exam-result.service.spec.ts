import { Test, TestingModule } from '@nestjs/testing';
import { StudentExamResultService } from './student-exam-result.service.js';

describe('StudentExamResultService', () => {
  let service: StudentExamResultService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StudentExamResultService],
    }).compile();

    service = module.get<StudentExamResultService>(StudentExamResultService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
