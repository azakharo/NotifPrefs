import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { UserPreferencesData } from '../types/user-preferences.interface';
import type { QuietHours } from '../types/quiet-hours.type';

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId!: string;

  @Column('jsonb', { name: 'preferences' })
  preferences!: UserPreferencesData;

  @Column('jsonb', { name: 'quiet_hours', nullable: true })
  quietHours!: QuietHours | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
