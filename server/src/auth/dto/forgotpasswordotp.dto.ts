import { IsEmail, IsString } from "class-validator"

export class ForgotPasswordOTPDTO {
    @IsString()
    email: string;

    @IsString()
    role: string;
}

export class checkFrogotPasswordOTP {
    @IsString()
    @IsEmail()
    email: string;

    @IsString()
    role: string;

    @IsString()
    resetCode: string;
}