import { Channel } from './channel.enum';
import { NotifType } from './notif-type.enum';
import { ChannelPreference } from './channel-preference.type';

export interface UserPreferencesData {
  [NotifType.TRANSACTIONAL]?: Record<Channel, ChannelPreference>;
  [NotifType.MARKETING]?: Record<Channel, ChannelPreference>;
}
