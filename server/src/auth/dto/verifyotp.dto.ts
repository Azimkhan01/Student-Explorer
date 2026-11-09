import { IsEmail, IsInt, IsString, Length } from "class-validator"

export class verifyOTPDTO{
    
    @IsString()
    @IsEmail()
    email:string

    @IsString()
    @Length(6)
    otp:string
}