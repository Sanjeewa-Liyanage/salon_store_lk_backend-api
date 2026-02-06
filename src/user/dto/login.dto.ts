import { IsNotEmpty, IsEmail } from "class-validator";
export class loginDto{
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsNotEmpty()
    password: string;
}