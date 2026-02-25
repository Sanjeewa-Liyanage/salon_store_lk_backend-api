
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
// @ts-ignore
describe('UserController', () => {
  let controller: UserController;
// @ts-ignore
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
    }).compile();

    controller = module.get<UserController>(UserController);
  });
// @ts-ignore
  it('should be defined', () => {
    // @ts-ignore
    expect(controller).toBeDefined();
  });
});
