import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PreferencesService } from './preferences.service';
import { UserPreferences } from './entities/user-preferences.entity';
import { DEFAULT_PREFERENCES } from './constants/default-preferences';
import { Channel } from './types/channel.enum';
import { NotifType } from './types/notif-type.enum';
import { Region } from './types/region.enum';
import type { UserPreferencesData } from './types/user-preferences.interface';

export const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
export const ANOTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440001';

export const SAMPLE_PREFERENCES = {
  transactional: {
    email: { enabled: true },
    sms: { enabled: true },
    push: { enabled: true },
    messenger: { enabled: true },
  },
  marketing: {
    email: { enabled: false },
    sms: { enabled: false },
    push: { enabled: false },
    messenger: { enabled: false },
  },
};

export const SAMPLE_QUIET_HOURS = {
  startTime: '22:00',
  endTime: '08:00',
  timezone: 'Europe/Moscow',
};

describe('PreferencesService', () => {
  let service: PreferencesService;
  let repository: jest.Mocked<Repository<UserPreferences>>;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const createMockRepository = () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferencesService,
        {
          provide: getRepositoryToken(UserPreferences),
          useFactory: createMockRepository,
        },
      ],
    }).compile();

    service = module.get<PreferencesService>(PreferencesService);
    repository = module.get(getRepositoryToken(UserPreferences));

    Object.defineProperty(service, 'logger', {
      value: mockLogger,
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPreferences', () => {
    it('should create new record with default preferences when user not found', async () => {
      const createdAt = new Date();
      const updatedAt = new Date();

      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue({
        userId: TEST_USER_ID,
        preferences: DEFAULT_PREFERENCES,
        quietHours: null,
        createdAt,
        updatedAt,
      });
      repository.save.mockResolvedValue({
        userId: TEST_USER_ID,
        preferences: DEFAULT_PREFERENCES,
        quietHours: null,
        createdAt,
        updatedAt,
      });

      const result = await service.getPreferences(TEST_USER_ID);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { userId: TEST_USER_ID },
      });
      expect(repository.create).toHaveBeenCalledWith({
        userId: TEST_USER_ID,
        preferences: DEFAULT_PREFERENCES,
        quietHours: null,
      });
      expect(repository.save).toHaveBeenCalled();
      expect(result.userId).toBe(TEST_USER_ID);
      expect(result.preferences).toEqual(DEFAULT_PREFERENCES);
    });

    it('should return existing preferences when user found', async () => {
      const existingPrefs = {
        userId: TEST_USER_ID,
        preferences: SAMPLE_PREFERENCES,
        quietHours: SAMPLE_QUIET_HOURS,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.findOne.mockResolvedValue(existingPrefs);

      const result = await service.getPreferences(TEST_USER_ID);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { userId: TEST_USER_ID },
      });
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
      expect(result.userId).toBe(TEST_USER_ID);
      expect(result.preferences).toEqual(SAMPLE_PREFERENCES);
      expect(result.quietHours).toEqual(SAMPLE_QUIET_HOURS);
    });

    it('should return correct DTO structure with userId, preferences, quietHours, timestamps', async () => {
      const createdAt = new Date('2024-01-01T00:00:00Z');
      const updatedAt = new Date('2024-01-02T00:00:00Z');

      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue({
        userId: TEST_USER_ID,
        preferences: DEFAULT_PREFERENCES,
        quietHours: null,
        createdAt,
        updatedAt,
      });
      repository.save.mockResolvedValue({
        userId: TEST_USER_ID,
        preferences: DEFAULT_PREFERENCES,
        quietHours: null,
        createdAt,
        updatedAt,
      });

      const result = await service.getPreferences(TEST_USER_ID);

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('preferences');
      expect(result).toHaveProperty('quietHours');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });
  });

  describe('updatePreferences', () => {
    it('should merge partial preferences with existing', async () => {
      const existingPrefs = {
        userId: TEST_USER_ID,
        preferences: DEFAULT_PREFERENCES,
        quietHours: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.findOne.mockResolvedValue(existingPrefs);
      repository.save.mockResolvedValue(existingPrefs);

      const updateDto = {
        preferences: {
          marketing: {
            email: { enabled: true },
          },
        } as UserPreferencesData,
      };

      const result = await service.updatePreferences(TEST_USER_ID, updateDto);

      expect(repository.save).toHaveBeenCalled();
      expect(result.preferences.marketing?.email.enabled).toBe(true);
    });

    it('should create new record if user not exists', async () => {
      const createdAt = new Date();
      const updatedAt = new Date();

      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue({
        userId: ANOTHER_USER_ID,
        preferences: DEFAULT_PREFERENCES,
        quietHours: null,
        createdAt,
        updatedAt,
      });
      repository.save.mockResolvedValue({
        userId: ANOTHER_USER_ID,
        preferences: DEFAULT_PREFERENCES,
        quietHours: null,
        createdAt,
        updatedAt,
      });

      const updateDto = {
        preferences: {
          marketing: {
            email: { enabled: true },
          },
        } as UserPreferencesData,
      };

      await service.updatePreferences(ANOTHER_USER_ID, updateDto);

      expect(repository.create).toHaveBeenCalledWith({
        userId: ANOTHER_USER_ID,
        preferences: DEFAULT_PREFERENCES,
        quietHours: null,
      });
      expect(repository.save).toHaveBeenCalled();
    });

    it('should set quietHours when provided', async () => {
      const existingPrefs = {
        userId: TEST_USER_ID,
        preferences: DEFAULT_PREFERENCES,
        quietHours: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.findOne.mockResolvedValue(existingPrefs);
      repository.save.mockResolvedValue({
        ...existingPrefs,
        quietHours: SAMPLE_QUIET_HOURS,
      });

      const updateDto = {
        quietHours: SAMPLE_QUIET_HOURS,
      };

      const result = await service.updatePreferences(TEST_USER_ID, updateDto);

      expect(repository.save).toHaveBeenCalled();
      expect(result.quietHours).toEqual(SAMPLE_QUIET_HOURS);
    });

    it('should clear quietHours when null provided', async () => {
      const existingPrefs = {
        userId: TEST_USER_ID,
        preferences: DEFAULT_PREFERENCES,
        quietHours: SAMPLE_QUIET_HOURS,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.findOne.mockResolvedValue(existingPrefs);
      repository.save.mockResolvedValue({
        ...existingPrefs,
        quietHours: null,
      });

      const updateDto = {
        quietHours: null,
      };

      const result = await service.updatePreferences(TEST_USER_ID, updateDto);

      expect(repository.save).toHaveBeenCalled();
      expect(result.quietHours).toBeNull();
    });

    it('should return updated preferences in response', async () => {
      const existingPrefs = {
        userId: TEST_USER_ID,
        preferences: DEFAULT_PREFERENCES,
        quietHours: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedPrefs = {
        ...existingPrefs,
        preferences: {
          ...DEFAULT_PREFERENCES,
          marketing: {
            email: { enabled: true },
            sms: { enabled: true },
            push: { enabled: true },
            messenger: { enabled: true },
          },
        },
      };

      repository.findOne.mockResolvedValue(existingPrefs);
      repository.save.mockResolvedValue(updatedPrefs);

      const updateDto = {
        preferences: {
          marketing: {
            email: { enabled: true },
          },
        } as UserPreferencesData,
      };

      const result = await service.updatePreferences(TEST_USER_ID, updateDto);

      expect(result).toHaveProperty('userId', TEST_USER_ID);
      expect(result).toHaveProperty('preferences');
      expect(result).toHaveProperty('quietHours');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });
  });

  describe('isInQuietHours', () => {
    it('should return true when time is within range', () => {
      const quietHours = {
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'Europe/Moscow',
      };

      const datetime = new Date('2024-01-01T23:00:00');

      const result = service.isInQuietHours(quietHours, datetime);

      expect(result).toBe(true);
    });

    it('should return false when time is outside range', () => {
      const quietHours = {
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'Europe/Moscow',
      };

      const datetime = new Date('2024-01-01T12:00:00');

      const result = service.isInQuietHours(quietHours, datetime);

      expect(result).toBe(false);
    });

    it('should handle overnight range correctly (e.g. 22:00 to 08:00)', () => {
      const quietHours = {
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'Europe/Moscow',
      };

      const lateNight = new Date('2024-01-01T02:00:00');
      const resultLateNight = service.isInQuietHours(quietHours, lateNight);
      expect(resultLateNight).toBe(true);

      const earlyMorning = new Date('2024-01-01T07:59:00');
      const resultEarlyMorning = service.isInQuietHours(
        quietHours,
        earlyMorning,
      );
      expect(resultEarlyMorning).toBe(true);

      const morning = new Date('2024-01-01T08:00:00');
      const resultMorning = service.isInQuietHours(quietHours, morning);
      expect(resultMorning).toBe(false);

      const afternoon = new Date('2024-01-01T14:00:00');
      const resultAfternoon = service.isInQuietHours(quietHours, afternoon);
      expect(resultAfternoon).toBe(false);

      const evening = new Date('2024-01-01T21:59:00');
      const resultEvening = service.isInQuietHours(quietHours, evening);
      expect(resultEvening).toBe(false);

      const night = new Date('2024-01-01T22:00:00');
      const resultNight = service.isInQuietHours(quietHours, night);
      expect(resultNight).toBe(true);
    });

    it('should handle same-day range correctly', () => {
      const quietHours = {
        startTime: '09:00',
        endTime: '17:00',
        timezone: 'Europe/Moscow',
      };

      const midday = new Date('2024-01-01T12:00:00');
      const resultMidday = service.isInQuietHours(quietHours, midday);
      expect(resultMidday).toBe(true);

      const morning = new Date('2024-01-01T08:00:00');
      const resultMorning = service.isInQuietHours(quietHours, morning);
      expect(resultMorning).toBe(false);

      const evening = new Date('2024-01-01T18:00:00');
      const resultEvening = service.isInQuietHours(quietHours, evening);
      expect(resultEvening).toBe(false);
    });

    it('should handle timezone conversion correctly', () => {
      const quietHours = {
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'Europe/Moscow',
      };

      // UTC 19:00 = Moscow 22:00 (start of quiet hours)
      const utcBeforeQuietHours = new Date('2024-01-01T18:59:00Z');
      expect(service.isInQuietHours(quietHours, utcBeforeQuietHours)).toBe(
        false,
      );

      const utcStartQuietHours = new Date('2024-01-01T19:00:00Z');
      expect(service.isInQuietHours(quietHours, utcStartQuietHours)).toBe(true);

      // UTC 05:00 = Moscow 08:00 (end of quiet hours, should be false)
      const utcEndQuietHours = new Date('2024-01-01T05:00:00Z');
      expect(service.isInQuietHours(quietHours, utcEndQuietHours)).toBe(false);

      // UTC 03:00 = Moscow 06:00 (middle of quiet hours)
      const utcMiddleQuietHours = new Date('2024-01-01T03:00:00Z');
      expect(service.isInQuietHours(quietHours, utcMiddleQuietHours)).toBe(
        true,
      );
    });
  });

  describe('findGlobalPolicy', () => {
    it('should return correct policy for matching notifType, channel, region', () => {
      const policy = service.findGlobalPolicy(
        NotifType.MARKETING,
        Channel.SMS,
        Region.EU,
      );

      expect(policy).toBeDefined();
      expect(policy?.blocked).toBe(true);
      expect(policy?.id).toBe('gdpr-marketing-sms');
    });

    it('should return undefined when no policy matches', () => {
      const policy = service.findGlobalPolicy(
        NotifType.TRANSACTIONAL,
        Channel.EMAIL,
        Region.US,
      );

      expect(policy).toBeUndefined();
    });
  });

  describe('evaluate', () => {
    it('should return deny with reason blocked_by_global_policy when global policy blocks', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue({
        userId: TEST_USER_ID,
        preferences: DEFAULT_PREFERENCES,
        quietHours: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repository.save.mockResolvedValue({
        userId: TEST_USER_ID,
        preferences: DEFAULT_PREFERENCES,
        quietHours: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.evaluate({
        userId: TEST_USER_ID,
        notifType: NotifType.MARKETING,
        channel: Channel.SMS,
        region: Region.EU,
        datetime: new Date().toISOString(),
      });

      expect(result.decision).toBe('deny');
      expect(result.reason).toBe('blocked_by_global_policy');
    });

    it('should return deny with blocked_by_global_policy when global policy blocks despite user having channel enabled', async () => {
      const existingPrefs = {
        userId: TEST_USER_ID,
        preferences: {
          transactional: {
            email: { enabled: true },
            sms: { enabled: true },
            push: { enabled: true },
            messenger: { enabled: true },
          },
          marketing: {
            email: { enabled: true },
            sms: { enabled: true },
            push: { enabled: true },
            messenger: { enabled: true },
          },
        },
        quietHours: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.findOne.mockResolvedValue(existingPrefs);

      const result = await service.evaluate({
        userId: TEST_USER_ID,
        notifType: NotifType.MARKETING,
        channel: Channel.SMS,
        region: Region.EU,
        datetime: new Date().toISOString(),
      });

      expect(result.decision).toBe('deny');
      expect(result.reason).toBe('blocked_by_global_policy');
    });

    it('should return deny with reason disabled_by_user when user disabled channel', async () => {
      const existingPrefs = {
        userId: TEST_USER_ID,
        preferences: {
          transactional: {
            email: { enabled: true },
            sms: { enabled: true },
            push: { enabled: true },
            messenger: { enabled: true },
          },
          marketing: {
            email: { enabled: false },
            sms: { enabled: false },
            push: { enabled: false },
            messenger: { enabled: false },
          },
        },
        quietHours: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.findOne.mockResolvedValue(existingPrefs);

      const result = await service.evaluate({
        userId: TEST_USER_ID,
        notifType: NotifType.MARKETING,
        channel: Channel.EMAIL,
        region: Region.US,
        datetime: new Date().toISOString(),
      });

      expect(result.decision).toBe('deny');
      expect(result.reason).toBe('disabled_by_user');
    });

    it('should return deny with reason blocked_by_quiet_hours when marketing notification during quiet hours', async () => {
      const existingPrefs = {
        userId: TEST_USER_ID,
        preferences: {
          transactional: {
            email: { enabled: true },
            sms: { enabled: true },
            push: { enabled: true },
            messenger: { enabled: true },
          },
          marketing: {
            email: { enabled: true },
            sms: { enabled: true },
            push: { enabled: true },
            messenger: { enabled: true },
          },
        },
        quietHours: SAMPLE_QUIET_HOURS,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.findOne.mockResolvedValue(existingPrefs);

      const datetimeInQuietHours = new Date('2024-01-01T23:00:00+03:00');

      const result = await service.evaluate({
        userId: TEST_USER_ID,
        notifType: NotifType.MARKETING,
        channel: Channel.EMAIL,
        region: Region.US,
        datetime: datetimeInQuietHours.toISOString(),
      });

      expect(result.decision).toBe('deny');
      expect(result.reason).toBe('blocked_by_quiet_hours');
    });

    it('should return allow for transactional during quiet hours', async () => {
      const existingPrefs = {
        userId: TEST_USER_ID,
        preferences: {
          transactional: {
            email: { enabled: true },
            sms: { enabled: true },
            push: { enabled: true },
            messenger: { enabled: true },
          },
          marketing: {
            email: { enabled: true },
            sms: { enabled: true },
            push: { enabled: true },
            messenger: { enabled: true },
          },
        },
        quietHours: SAMPLE_QUIET_HOURS,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.findOne.mockResolvedValue(existingPrefs);

      const datetimeInQuietHours = new Date('2024-01-01T23:00:00+03:00');

      const result = await service.evaluate({
        userId: TEST_USER_ID,
        notifType: NotifType.TRANSACTIONAL,
        channel: Channel.EMAIL,
        region: Region.US,
        datetime: datetimeInQuietHours.toISOString(),
      });

      expect(result.decision).toBe('allow');
    });

    it('should return allow when all conditions are met', async () => {
      const existingPrefs = {
        userId: TEST_USER_ID,
        preferences: {
          transactional: {
            email: { enabled: true },
            sms: { enabled: true },
            push: { enabled: true },
            messenger: { enabled: true },
          },
          marketing: {
            email: { enabled: true },
            sms: { enabled: true },
            push: { enabled: true },
            messenger: { enabled: true },
          },
        },
        quietHours: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.findOne.mockResolvedValue(existingPrefs);

      const result = await service.evaluate({
        userId: TEST_USER_ID,
        notifType: NotifType.TRANSACTIONAL,
        channel: Channel.EMAIL,
        region: Region.US,
        datetime: new Date().toISOString(),
      });

      expect(result.decision).toBe('allow');
    });
  });

  describe('idempotency', () => {
    it('should not save when state already matches request', async () => {
      const existingPrefs = {
        userId: TEST_USER_ID,
        preferences: SAMPLE_PREFERENCES,
        quietHours: SAMPLE_QUIET_HOURS,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.findOne.mockResolvedValue(existingPrefs);

      const updateDto = {
        preferences: SAMPLE_PREFERENCES,
        quietHours: SAMPLE_QUIET_HOURS,
      };

      await service.updatePreferences(TEST_USER_ID, updateDto);

      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should return same result for repeated identical requests', async () => {
      const existingPrefs = {
        userId: TEST_USER_ID,
        preferences: SAMPLE_PREFERENCES,
        quietHours: SAMPLE_QUIET_HOURS,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.findOne.mockResolvedValue(existingPrefs);

      const updateDto = {
        preferences: SAMPLE_PREFERENCES,
        quietHours: SAMPLE_QUIET_HOURS,
      };

      const result1 = await service.updatePreferences(TEST_USER_ID, updateDto);
      const result2 = await service.updatePreferences(TEST_USER_ID, updateDto);

      expect(result1).toEqual(result2);
    });

    it('should not log when no actual change occurs', async () => {
      const existingPrefs = {
        userId: TEST_USER_ID,
        preferences: SAMPLE_PREFERENCES,
        quietHours: SAMPLE_QUIET_HOURS,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.findOne.mockResolvedValue(existingPrefs);

      const updateDto = {
        preferences: SAMPLE_PREFERENCES,
        quietHours: SAMPLE_QUIET_HOURS,
      };

      await service.updatePreferences(TEST_USER_ID, updateDto);

      expect(mockLogger.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Preferences updated'),
      );
    });
  });
});
