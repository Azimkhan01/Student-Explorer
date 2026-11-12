import { Test, TestingModule } from '@nestjs/testing';
import { QuickzyService } from './quickzy.service.js';

describe('QuickzyService', () => {
  let service: QuickzyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuickzyService],
    }).compile();

    service = module.get<QuickzyService>(QuickzyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
