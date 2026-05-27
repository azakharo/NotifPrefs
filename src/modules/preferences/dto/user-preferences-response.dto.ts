import type { UserPreferencesData } from '../types/user-preferences.interface';
import type { QuietHours } from '../types/quiet-hours.type';

export class UserPreferencesResponseDto {
  userId!: string;
  preferences!: UserPreferencesData;
  quietHours!: QuietHours | null;
  createdAt!: Date;
  updatedAt!: Date;
}
