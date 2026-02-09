import { Test, TestingModule } from '@nestjs/testing';
import { SalonController } from './salon.controller';

describe('SalonController', () => {
  let controller: SalonController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalonController],
    }).compile();

    controller = module.get<SalonController>(SalonController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
