import { IsNotEmpty, IsEmail } from "class-validator";
export class ForgetPasswordDto{
    @IsEmail()
    @IsNotEmpty()
    email: string;

   
}