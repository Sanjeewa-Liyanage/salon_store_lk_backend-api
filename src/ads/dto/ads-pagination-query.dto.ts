import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class AdsPaginationQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;

    @IsOptional()
    @Type(() => String)
    @IsIn(['all', 'active', 'pending_approval', 'rejected'])
    type?: 'all' | 'active' | 'pending_approval' | 'rejected';
}