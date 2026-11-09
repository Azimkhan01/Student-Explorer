import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';

import { CreatorCodeService } from './creator-code.service.js';

interface sendCreatorDto {
    username: string;
    email: string;
    role: string;
}

interface checkCreatorCode extends sendCreatorDto {
    creatorCode: string;
}

@Controller()
export class CreatorCodeController {

    constructor(
        private readonly creatorCodeService: CreatorCodeService,
    ) {}

    @EventPattern({ cmd: "sendCreatorCode" })
    sendCreatorCode(@Payload() data: sendCreatorDto) {
        return this.creatorCodeService.sendCreatorCode(data);
    }

    @MessagePattern({ cmd: "checkCreatorCode" })
    checkCreatorCode(@Payload() data: checkCreatorCode) {
        console.log("running !!");

        return this.creatorCodeService.checkCreatorCode(data);
    }
}