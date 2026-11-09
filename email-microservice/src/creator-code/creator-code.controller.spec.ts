import { Test, TestingModule } from '@nestjs/testing';
import { CreatorCodeController } from './creator-code.controller.js';

describe('CreatorCodeController', () => {
  let controller: CreatorCodeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreatorCodeController],
    }).compile();

    controller = module.get<CreatorCodeController>(CreatorCodeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
