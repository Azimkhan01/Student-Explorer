export interface SendCreatorDto {
    username: string;
    email: string;
    role: string;
}

export interface CheckCreatorCodeDto {
    username: string;
    email: string;
    creatorCode: string;
}