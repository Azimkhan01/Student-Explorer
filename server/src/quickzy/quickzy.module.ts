
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';


import { QuickzyService } from './quickzy.service.js';
import { QuickzyController } from './quickzy.controller.js';
import { Quickzy } from '../entity/quickzy.entity.js';
import { QnA } from '../entity/qna.entity.js';
import { Teacher } from '../entity/teacher.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quickzy,
      QnA,
      Teacher,
    ]),
  ],
  controllers: [QuickzyController],
  providers: [QuickzyService],
  exports: [QuickzyService],
})
export class QuickzyModule {}
