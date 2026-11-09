import { IsString } from "class-validator";
import { MakeCreatorCodeDTO } from "./makeCreatorCode.DTO.js";

export class CheckCreatorCodeDTO extends MakeCreatorCodeDTO{
    @IsString()
    creatorCode:string
}