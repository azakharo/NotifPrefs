import { NotifType } from '../types/notif-type.enum';

export const BLOCKED_IN_QUIET_HOURS: Record<NotifType, boolean> = {
  [NotifType.TRANSACTIONAL]: false,
  [NotifType.MARKETING]: true,
};
