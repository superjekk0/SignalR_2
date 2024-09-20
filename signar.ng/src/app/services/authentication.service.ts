import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { RegisterDTO, LoginDTO, LoginResultDTO } from '../models/models';

const LOCAL_STORAGE_EMAIL_KEY = "email";

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  //readonly baseUrl = "http://localhost:5106/api/";
  readonly baseUrl = "https://localhost:7060/api/";
  accountBaseUrl = this.baseUrl + "Account/";

  authenticatedUserEmail: string | null = null;

  constructor(public http: HttpClient) {
    this.authenticatedUserEmail = sessionStorage.getItem(LOCAL_STORAGE_EMAIL_KEY);
  }

  async registerAndLogin(registerData: RegisterDTO): Promise<void> {
    let result = await lastValueFrom(this.http.post<LoginResultDTO>(this.accountBaseUrl + 'Register', registerData));
    sessionStorage.setItem("token", result.token);
    this.setUserEmail(result.email);
  }

  async login(loginData: LoginDTO): Promise<void> {
    let result = await lastValueFrom(this.http.post<LoginResultDTO>(this.accountBaseUrl + 'Login', loginData));
    sessionStorage.setItem("token", result.token);
    this.setUserEmail(result.email);
  }

  async logout(): Promise<void> {
    sessionStorage.removeItem("token");
    this.setUserEmail(null);
  }

  async testAuthorize(): Promise<void> {
    let result = await lastValueFrom(this.http.get<any>(this.accountBaseUrl + 'Test'));
    console.log(result);
  }

  isLoggedIn(): boolean {
    return localStorage.getItem(LOCAL_STORAGE_EMAIL_KEY) != null;
  }

  private setUserEmail(email: string | null) {
    if (email == null) {
      localStorage.removeItem(LOCAL_STORAGE_EMAIL_KEY);
    }
    else {
      localStorage.setItem(LOCAL_STORAGE_EMAIL_KEY, email);
    }
    this.authenticatedUserEmail = email;
  }
}
