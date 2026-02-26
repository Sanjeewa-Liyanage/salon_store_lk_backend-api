import { IsString, IsNotEmpty, IsOptional, IsEmail, IsBoolean, IsEnum, IsNumber } from 'class-validator';
import { PlanState } from '../enum/planstate.enum';

export class PlanCreateDto{
    @IsString()
    @IsNotEmpty()
    planName: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsEnum(PlanState)
    state: PlanState;

    @IsNumber()
    price: number;

    @IsNotEmpty()
    features: string[];

    @IsNumber()
    duration: number; // in days
    
    @IsNumber()
    priority: number; // lower number means higher priority
}