import { RoleEnum } from '../../../Enum/RoleEnum/RoleEnum';

export interface SignUpRequest {
  username: string;
  email: string;
  password: string;
  role?: RoleEnum;
}
