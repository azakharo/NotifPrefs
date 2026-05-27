import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { UserPreferences } from '../modules/preferences/entities/user-preferences.entity';
import { DEFAULT_PREFERENCES } from '../modules/preferences/constants/default-preferences';
import { Channel } from '../modules/preferences/types/channel.enum';
import { NotifType } from '../modules/preferences/types/notif-type.enum';

/**
 * Seed script to populate database with initial data
 */
async function runSeed() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  try {
    console.log('🌱 Starting seed...');

    const user1Id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const user1QuietHours = {
      startTime: '22:00',
      endTime: '08:00',
      timezone: 'Europe/Moscow',
    };

    const user1 = dataSource.manager.create(UserPreferences, {
      userId: user1Id,
      preferences: DEFAULT_PREFERENCES,
      quietHours: user1QuietHours,
    });

    const user2Id = 'b1ffcd00-0d1c-5fe9-cc7e-7cc0ce491b22';
    const user2Preferences = {
      ...DEFAULT_PREFERENCES,
      [NotifType.MARKETING]: {
        ...DEFAULT_PREFERENCES[NotifType.MARKETING],
        [Channel.EMAIL]: { enabled: true },
      },
    };

    const user2 = dataSource.manager.create(UserPreferences, {
      userId: user2Id,
      preferences: user2Preferences,
      quietHours: null,
    });

    await dataSource.manager.save([user1, user2]);

    console.log('✅ Seed completed: 2 users created');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

// Run the seed
runSeed().catch((error) => {
  console.error('Seed error:', error);
  process.exit(1);
});
