import { Test, TestingModule } from '@nestjs/testing';
import { StudentExamResultController } from './student-exam-result.controller.js';

describe('StudentExamResultController', () => {
  let controller: StudentExamResultController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentExamResultController],
    }).compile();

    controller = module.get<StudentExamResultController>(StudentExamResultController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
