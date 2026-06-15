import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

import { ChooseRoleRequest } from './ChooseRoleRequest';
import { ChooseRoleResponse } from './ChooseRoleResponse';
import { RoleEnum } from '../../../Enum/RoleEnum/RoleEnum';
import { env } from '../../../../environments/env';

export type SetupRole = RoleEnum.CLIENT | RoleEnum.FREELANCER | RoleEnum.ADMIN;

@Injectable({
  providedIn: 'root',
})
export class ChooseRoleService {
  private http = inject(HttpClient);

  chooseRole(request: ChooseRoleRequest): Observable<ChooseRoleResponse> {
    if (!request.role || !request.email) {
      return throwError(() => new Error('Email and role are required'));
    }
    return this.http.put<ChooseRoleResponse>(`${env.apiUrl}/role/update-role`, request);
  }
}
