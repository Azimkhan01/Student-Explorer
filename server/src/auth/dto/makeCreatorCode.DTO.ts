import { IsEmail, IsOptional, IsString } from 'class-validator'
export class MakeCreatorCodeDTO {
    @IsString()
    username: string

    @IsString()
    @IsEmail()
    email: string

    @IsString()
    @IsOptional()
    role:string


}