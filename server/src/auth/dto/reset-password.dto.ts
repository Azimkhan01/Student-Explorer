import {
    IsEmail,
    IsIn,
    IsString,
    MinLength,
} from 'class-validator';

export class ResetPasswordDTO {

    @IsEmail()
    email: string;

    @IsString()
    @IsIn(['student', 'teacher'])
    role: string;

    @IsString()
    @MinLength(8)
    newPassword: string;

}