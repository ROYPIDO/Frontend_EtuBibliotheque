import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth.service';
import { Login } from '../models/Login';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  // Faux jeton fictif, uniquement pour les tests
  const fakeToken = 'fake.jwt.token';
  const credentials: Login = { login: 'user', password: 'secret' };

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should POST credentials to /api/login with a text response type', () => {
    service.login(credentials).subscribe();

    const req = httpMock.expectOne('/api/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(credentials);
    expect(req.request.responseType).toBe('text');
    req.flush(fakeToken);
  });

  it('should return and store the token on success', () => {
    let result: string | undefined;
    service.login(credentials).subscribe(token => (result = token));

    httpMock.expectOne('/api/login').flush(fakeToken);

    expect(result).toBe(fakeToken);
    expect(service.getToken()).toBe(fakeToken);
    expect(service.isLoggedIn()).toBe(true);
  });

  it('should not store a token and should propagate the error on 401', () => {
    let status: number | undefined;
    service.login(credentials).subscribe({ error: err => (status = err.status) });

    httpMock.expectOne('/api/login').flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    expect(service.getToken()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });

  it('should remove the token on logout', () => {
    sessionStorage.setItem('auth_token', fakeToken);
    expect(service.isLoggedIn()).toBe(true);

    service.logout();

    expect(service.getToken()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });
});
