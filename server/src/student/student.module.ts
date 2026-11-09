import { Module } from '@nestjs/common';
import { StudentController } from './student.controller.js';
import { StudentService } from './student.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Entities from '../entity/index.js';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [ClientsModule.register([
    {
      name: 'USER_SERVICE',
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3010,
      },
    },
  ]),
  TypeOrmModule.forFeature(
    [Entities.Student]
  ),
  ],
  controllers: [StudentController],
  providers: [StudentService]
})
export class StudentModule { }
