import { RoleEnum } from '../../../Enum/RoleEnum/RoleEnum';
import { SetupRole } from './choose-role.service';

export interface ChooseRoleRequest {
  email: string;
  role: RoleEnum;
}