import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { merge } from 'lodash';
import { UserPreferences } from './entities/user-preferences.entity';
import { UserPreferencesData } from './types/user-preferences.interface';
import { QuietHours } from './types/quiet-hours.type';
import { Channel } from './types/channel.enum';
import { NotifType } from './types/notif-type.enum';
import { Region } from './types/region.enum';
import { DEFAULT_PREFERENCES } from './constants/default-preferences';
import { GLOBAL_POLICIES, GlobalPolicy } from './constants/global-policies';
import { BLOCKED_IN_QUIET_HOURS } from './constants/quiet-hours-rules';
import {
  UpdatePreferencesDto,
  EvaluateRequestDto,
  EvaluateResponseDto,
  UserPreferencesResponseDto,
} from './dto';
import { toZonedTime } from 'date-fns-tz';

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(
    @InjectRepository(UserPreferences)
    private readonly preferencesRepository: Repository<UserPreferences>,
  ) {}

  async getPreferences(userId: string): Promise<UserPreferencesResponseDto> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.preferencesRepository.create({
        userId,
        preferences: DEFAULT_PREFERENCES,
        quietHours: null,
      });
      await this.preferencesRepository.save(preferences);
    }

    return {
      userId: preferences.userId,
      preferences: preferences.preferences,
      quietHours: preferences.quietHours,
      createdAt: preferences.createdAt,
      updatedAt: preferences.updatedAt,
    };
  }

  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<UserPreferencesResponseDto> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.preferencesRepository.create({
        userId,
        preferences: DEFAULT_PREFERENCES,
        quietHours: null,
      });
    }

    const mergedPreferences: UserPreferencesData = dto.preferences
      ? merge({}, preferences.preferences, dto.preferences)
      : preferences.preferences;

    const mergedQuietHours =
      dto.quietHours !== undefined ? dto.quietHours : preferences.quietHours;

    const currentStr = JSON.stringify({
      preferences: preferences.preferences,
      quietHours: preferences.quietHours,
    });
    const newStr = JSON.stringify({
      preferences: mergedPreferences,
      quietHours: mergedQuietHours,
    });

    if (currentStr !== newStr) {
      preferences.preferences = mergedPreferences;
      preferences.quietHours = mergedQuietHours;
      await this.preferencesRepository.save(preferences);
      this.logger.log(`Preferences updated for user: ${userId}`);
    }

    return {
      userId: preferences.userId,
      preferences: preferences.preferences,
      quietHours: preferences.quietHours,
      createdAt: preferences.createdAt,
      updatedAt: preferences.updatedAt,
    };
  }

  async evaluate(dto: EvaluateRequestDto): Promise<EvaluateResponseDto> {
    const globalPolicy = this.findGlobalPolicy(
      dto.notifType,
      dto.channel,
      dto.region,
    );
    if (globalPolicy?.blocked) {
      const reason = 'blocked_by_global_policy';
      this.logger.log(
        `Decision: deny for user=${dto.userId}, type=${dto.notifType}, channel=${dto.channel}, reason=${reason}`,
      );
      return { decision: 'deny', reason };
    }

    const preferences = await this.getPreferences(dto.userId);
    if (
      !this.isChannelEnabled(
        preferences.preferences,
        dto.notifType,
        dto.channel,
      )
    ) {
      const reason = 'disabled_by_user';
      this.logger.log(
        `Decision: deny for user=${dto.userId}, type=${dto.notifType}, channel=${dto.channel}, reason=${reason}`,
      );
      return { decision: 'deny', reason };
    }

    if (preferences.quietHours) {
      const datetime = new Date(dto.datetime);
      if (
        this.isInQuietHours(preferences.quietHours, datetime) &&
        BLOCKED_IN_QUIET_HOURS[dto.notifType]
      ) {
        const reason = 'blocked_by_quiet_hours';
        this.logger.log(
          `Decision: deny for user=${dto.userId}, type=${dto.notifType}, channel=${dto.channel}, reason=${reason}`,
        );
        return { decision: 'deny', reason };
      }
    }

    this.logger.log(
      `Decision: allow for user=${dto.userId}, type=${dto.notifType}, channel=${dto.channel}`,
    );
    return { decision: 'allow' };
  }

  isInQuietHours(quietHours: QuietHours, datetime: Date): boolean {
    const zonedTime = toZonedTime(datetime, quietHours.timezone);
    const currentMinutes = zonedTime.getHours() * 60 + zonedTime.getMinutes();

    const [startHour, startMinute] = quietHours.startTime
      .split(':')
      .map(Number);
    const [endHour, endMinute] = quietHours.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }

  findGlobalPolicy(
    notifType: NotifType,
    channel: Channel,
    region: Region,
  ): GlobalPolicy | undefined {
    return GLOBAL_POLICIES.find(
      (policy) =>
        policy.notifType === notifType &&
        policy.channel === channel &&
        policy.region === region,
    );
  }

  isChannelEnabled(
    preferences: UserPreferencesData,
    notifType: NotifType,
    channel: Channel,
  ): boolean {
    const notifTypePrefs = preferences[notifType];
    if (!notifTypePrefs) {
      return true;
    }
    const channelPref = notifTypePrefs[channel];
    if (!channelPref) {
      return true;
    }
    return channelPref.enabled;
  }
}
