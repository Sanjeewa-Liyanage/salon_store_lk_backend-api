import { Module } from '@nestjs/common';
import { ResendMailService } from './resendmail.service';

@Module({
  providers: [ResendMailService],
  exports: [ResendMailService],
})
export class MailModule {}
