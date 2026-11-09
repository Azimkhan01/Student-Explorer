import { Controller } from '@nestjs/common';
import { AppService } from './app.service.js';
import { EventPattern, Payload } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @EventPattern({ cmd: "ok" })
  getHello(@Payload() data: any): string {
    console.log(data)
   this.appService.getHello()
   return "done"
  }
}
