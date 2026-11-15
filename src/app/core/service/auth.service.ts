import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Login } from '../models/Login';

const TOKEN_KEY = 'auth_token';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private httpClient: HttpClient) { }

  // Le back-end renvoie le JWT en texte brut (pas du JSON) :
  // sans responseType 'text', HttpClient tenterait un JSON.parse et échouerait.
  login(credentials: Login): Observable<string> {
    return this.httpClient
      .post('/api/login', credentials, { responseType: 'text' })
      .pipe(tap(token => sessionStorage.setItem(TOKEN_KEY, token)));
  }

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}
