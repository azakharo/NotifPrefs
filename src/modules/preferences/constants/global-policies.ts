import { Channel } from '../types/channel.enum';
import { NotifType } from '../types/notif-type.enum';
import { Region } from '../types/region.enum';

export interface GlobalPolicy {
  id: string;
  notifType: NotifType;
  channel: Channel;
  region: Region;
  blocked: boolean;
  reason: string;
}

export const GLOBAL_POLICIES: GlobalPolicy[] = [
  {
    id: 'gdpr-marketing-sms',
    notifType: NotifType.MARKETING,
    channel: Channel.SMS,
    region: Region.EU,
    blocked: true,
    reason: 'GDPR compliance - marketing SMS blocked in EU',
  },
  {
    id: 'gdpr-marketing-push',
    notifType: NotifType.MARKETING,
    channel: Channel.PUSH,
    region: Region.EU,
    blocked: true,
    reason: 'GDPR compliance - marketing push blocked in EU',
  },
];
