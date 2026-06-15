import { RoleEnum } from "../../../Enum/RoleEnum/RoleEnum";

export interface SignUpResponse {
  username: string;
  email: string;
  role?: RoleEnum;
}
