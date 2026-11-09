import { Controller } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { VerifyAdminOTPDTO } from './dto/verifyAdminOTP.dto.js';

@Controller('admin')
export class AdminController {

    constructor(
        private readonly adminService:AdminService
    ){}

    @MessagePattern({cmd:"send-admin-otp"})
    async sendAdminotp(@Payload() {email}:{email:string}){
             return this.adminService.sendAdminOtp(email)
    }

     @MessagePattern({cmd:"verify-admin-otp"})
    async verifyAdminOTP(@Payload() verifyAdminOtpdto:VerifyAdminOTPDTO){
             return this.adminService.verifyAdminOtp(verifyAdminOtpdto);
    }
}
