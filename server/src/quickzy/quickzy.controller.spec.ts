import { Test, TestingModule } from '@nestjs/testing';
import { QuickzyController } from './quickzy.controller.js';

describe('QuickzyController', () => {
  let controller: QuickzyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuickzyController],
    }).compile();

    controller = module.get<QuickzyController>(QuickzyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
