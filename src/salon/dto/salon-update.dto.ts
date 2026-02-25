import { PartialType } from '@nestjs/swagger';
import { SalonCreateDto } from './salon-create.dto';

export class SalonUpdateDto extends PartialType(SalonCreateDto) {}
