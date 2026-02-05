import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
// import { PlaygroundController } from './playground.controller';
// import { PlaygroundService } from './playground.service';
import { PlaygroundService } from './playground.service';
import { PlaygroundController } from './playground.controller';

@Module({
  imports: [DiscoveryModule],
  controllers: [PlaygroundController],
  providers: [PlaygroundService],
})
export class PlaygroundModule {}