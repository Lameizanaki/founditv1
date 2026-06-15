import { inject, Injectable } from "@angular/core";

import { HttpClient } from "@angular/common/http";
import { SignUpRequest } from "./SignUpRequest";
import { Observable, tap } from "rxjs";
import { SignUpResponse } from "./SignUpResponse";
import { env } from "../../../../environments/env";

@Injectable({
  providedIn: 'root',
})
export class SignUpService {

    private http = inject(HttpClient);
    private baseUrl: string = env.apiUrl;

    signUp(payload: SignUpRequest): Observable<SignUpResponse>{
        return this.http.post<SignUpResponse>(`${this.baseUrl}/auth/register`, payload).pipe(
            tap(() => {
                console.log("User registered successfully");
            })
        );
    }

}