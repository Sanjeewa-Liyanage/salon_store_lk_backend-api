import { Test, TestingModule } from '@nestjs/testing';
import { SalonService } from './salon.service';

describe('SalonService', () => {
  let service: SalonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SalonService],
    }).compile();

    service = module.get<SalonService>(SalonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
