import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { QuietHoursDto } from './quiet-hours.dto';
import type { UserPreferencesData } from '../types/user-preferences.interface';

export class UpdatePreferencesDto {
  @IsOptional()
  preferences?: UserPreferencesData;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuietHoursDto)
  quietHours?: QuietHoursDto | null;
}
