import { IsString, IsOptional, IsEnum, IsNumber, IsArray } from 'class-validator';
import { PlanState } from '../enum/planstate.enum';

export class PlanUpdateDto {
    @IsString()
    @IsOptional()
    planName?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsEnum(PlanState)
    @IsOptional()
    state?: PlanState;

    @IsNumber()
    @IsOptional()
    price?: number;

    @IsArray()
    @IsOptional()
    features?: string[];

    @IsNumber()
    @IsOptional()
    duration?: number; // in days
    
    @IsNumber()
    @IsOptional()
    priority?: number; // lower number means higher priority
}
