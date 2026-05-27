import { IsUUID, IsEnum, IsISO8601 } from 'class-validator';
import { NotifType } from '../types/notif-type.enum';
import { Channel } from '../types/channel.enum';
import { Region } from '../types/region.enum';

export class EvaluateRequestDto {
  @IsUUID()
  userId!: string;

  @IsEnum(NotifType)
  notifType!: NotifType;

  @IsEnum(Channel)
  channel!: Channel;

  @IsEnum(Region)
  region!: Region;

  @IsISO8601()
  datetime!: string;
}
