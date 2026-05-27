import { Channel } from '../types/channel.enum';
import { NotifType } from '../types/notif-type.enum';
import { UserPreferencesData } from '../types/user-preferences.interface';

export const DEFAULT_PREFERENCES: UserPreferencesData = {
  [NotifType.TRANSACTIONAL]: {
    [Channel.EMAIL]: { enabled: true },
    [Channel.SMS]: { enabled: true },
    [Channel.PUSH]: { enabled: true },
    [Channel.MESSENGER]: { enabled: true },
  },
  [NotifType.MARKETING]: {
    [Channel.EMAIL]: { enabled: false },
    [Channel.SMS]: { enabled: false },
    [Channel.PUSH]: { enabled: false },
    [Channel.MESSENGER]: { enabled: false },
  },
};
