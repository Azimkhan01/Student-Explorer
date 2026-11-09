import { Test, TestingModule } from '@nestjs/testing';
import { CreatorCodeService } from './creator-code.service.js';

describe('CreatorCodeService', () => {
  let service: CreatorCodeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CreatorCodeService],
    }).compile();

    service = module.get<CreatorCodeService>(CreatorCodeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
