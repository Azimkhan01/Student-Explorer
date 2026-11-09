import { IsString } from "class-validator"

export class CheckStudentDTO{
    @IsString()
    username:string

    @IsString()
    email:string
}