import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../service/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  const router = { navigate: jest.fn() };

  // Faux jeton fictif, uniquement pour les tests
  const fakeToken = 'fake.jwt.token';

  beforeEach(() => {
    sessionStorage.clear();
    router.navigate.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router }
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  describe('header Authorization', () => {
    it('should add the Bearer token to protected /api/ requests', () => {
      sessionStorage.setItem('auth_token', fakeToken);
      http.get('/api/students').subscribe();

      const req = httpMock.expectOne('/api/students');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${fakeToken}`);
    });

    it('should add the token to every method (e.g. DELETE) and URLs with a query string', () => {
      sessionStorage.setItem('auth_token', fakeToken);
      http.delete('/api/students/1?force=true').subscribe();

      const req = httpMock.expectOne('/api/students/1?force=true');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${fakeToken}`);
    });

    it('should not add the header when there is no token', () => {
      http.get('/api/students').subscribe();

      const req = httpMock.expectOne('/api/students');
      expect(req.request.headers.has('Authorization')).toBe(false);
    });

    it('should not add the header to non-API requests', () => {
      sessionStorage.setItem('auth_token', fakeToken);
      http.get('/assets/data.json').subscribe();

      const req = httpMock.expectOne('/assets/data.json');
      expect(req.request.headers.has('Authorization')).toBe(false);
    });

    it.each(['/api/login', '/api/register'])('should not add the header to %s', url => {
      sessionStorage.setItem('auth_token', fakeToken);
      http.post(url, {}).subscribe();

      const req = httpMock.expectOne(url);
      expect(req.request.headers.has('Authorization')).toBe(false);
    });
  });

  describe('401 handling', () => {
    it('should logout and redirect to /login on a 401 from a protected API', () => {
      sessionStorage.setItem('auth_token', fakeToken);
      let error: HttpErrorResponse | undefined;
      http.get('/api/students').subscribe({ error: (e: HttpErrorResponse) => (error = e) });

      httpMock.expectOne('/api/students').flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(authService.getToken()).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
      expect(error?.status).toBe(401);
    });

    it('should not logout nor redirect on other errors (403, 500)', () => {
      sessionStorage.setItem('auth_token', fakeToken);
      http.get('/api/students').subscribe({ error: () => {} });
      httpMock.expectOne('/api/students').flush('Forbidden', { status: 403, statusText: 'Forbidden' });

      http.get('/api/students').subscribe({ error: () => {} });
      httpMock.expectOne('/api/students').flush('Error', { status: 500, statusText: 'Server Error' });

      expect(authService.getToken()).toBe(fakeToken);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it.each(['/api/login', '/api/register'])('should ignore a 401 from %s', url => {
      sessionStorage.setItem('auth_token', fakeToken);
      let error: HttpErrorResponse | undefined;
      http.post(url, {}).subscribe({ error: (e: HttpErrorResponse) => (error = e) });

      httpMock.expectOne(url).flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(authService.getToken()).toBe(fakeToken);
      expect(router.navigate).not.toHaveBeenCalled();
      expect(error?.status).toBe(401);
    });
  });

  describe('login regression', () => {
    it('should still store the token after a successful login, sent without Authorization', () => {
      authService.login({ login: 'user', password: 'secret' }).subscribe();

      const req = httpMock.expectOne('/api/login');
      expect(req.request.headers.has('Authorization')).toBe(false);
      expect(req.request.responseType).toBe('text');
      req.flush(fakeToken);

      expect(authService.getToken()).toBe(fakeToken);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should let the login 401 reach the caller without redirecting', () => {
      let error: HttpErrorResponse | undefined;
      authService.login({ login: 'user', password: 'bad' }).subscribe({ error: (e: HttpErrorResponse) => (error = e) });

      httpMock.expectOne('/api/login').flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(error?.status).toBe(401);
      expect(router.navigate).not.toHaveBeenCalled();
      expect(authService.getToken()).toBeNull();
    });
  });
});
