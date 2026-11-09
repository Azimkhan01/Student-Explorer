import { Controller } from '@nestjs/common';

import {
    EventPattern,
    MessagePattern,
    Payload
} from '@nestjs/microservices';

import { ForgotPasswordService } from './forgot-password.service.js';
import { ForgotPasswordOTPVerfication } from './dto/forgotpassword.dto.js';

interface ForgotPasswordDto {
    email: string;
    role: string;
}

interface CheckForgotPasswordDto extends ForgotPasswordDto {
    resetCode: string;
}

@Controller()
export class ForgotPasswordController {

    constructor(
        private readonly forgotPasswordService: ForgotPasswordService
    ) {}

    // SEND OTP
    @MessagePattern({ cmd: 'forgot-password-otp' })
    sendForgotPasswordCode(@Payload() data: ForgotPasswordDto) {

        return this.forgotPasswordService.sendForgotPasswordCode(data);
    }

    // VERIFY OTP
    @MessagePattern({ cmd: 'checkForgotPassword' })
    checkForgotPasswordCode(@Payload() data: CheckForgotPasswordDto) {


        return this.forgotPasswordService.checkForgotPasswordCode(data);
    }

    @MessagePattern({cmd:"forgot-password-otp-verfication"})
    forgotpasswrodOtpverfication(@Payload() data:ForgotPasswordOTPVerfication){
        return this.forgotPasswordService.forgotpasswordotpverfication(data);
    }
}