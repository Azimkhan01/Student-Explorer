import { Test, TestingModule } from '@nestjs/testing';
import { ForgotPasswordController } from './forgot-password.controller.js';

describe('ForgotPasswordController', () => {
  let controller: ForgotPasswordController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ForgotPasswordController],
    }).compile();

    controller = module.get<ForgotPasswordController>(ForgotPasswordController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
