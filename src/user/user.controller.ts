import { Controller, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './schema/user.schema';
import { UserRegistrationDto } from './dto/userregister.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

 
}
