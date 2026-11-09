import { IsEmail, IsString, IsStrongPassword } from "class-validator"

export class signupUserDTO {
    @IsString()
    username: string

    @IsString()
    @IsEmail()
    email: string

    @IsString()
    @IsStrongPassword()
    password: string

    @IsString()
    creatorCode:string

    @IsString()
    role:string
}