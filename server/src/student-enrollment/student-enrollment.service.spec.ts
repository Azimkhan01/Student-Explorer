import { Test, TestingModule } from '@nestjs/testing';
import { StudentEnrollmentService } from './student-enrollment.service.js';

describe('StudentEnrollmentService', () => {
  let service: StudentEnrollmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StudentEnrollmentService],
    }).compile();

    service = module.get<StudentEnrollmentService>(StudentEnrollmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
