import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from './app.routes';
import { AuthService } from './core/service/auth.service';
import { StudentService } from './core/service/student.service';
import { of } from 'rxjs';

describe('app routes', () => {
  const authService = { isLoggedIn: jest.fn() };

  beforeEach(() => {
    authService.isLoggedIn.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: authService },
        { provide: StudentService, useValue: { getAll: () => of([]), getById: () => of({}) } }
      ]
    });
  });

  it.each(['/students/new', '/students/5/edit'])('should redirect %s to /login when not authenticated', async url => {
    authService.isLoggedIn.mockReturnValue(false);

    await RouterTestingHarness.create(url);

    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it.each(['/students/new', '/students/5/edit'])('should allow %s when authenticated', async url => {
    authService.isLoggedIn.mockReturnValue(true);

    await RouterTestingHarness.create(url);

    expect(TestBed.inject(Router).url).toBe(url);
  });

  it('should redirect /students to /login when not authenticated', async () => {
    authService.isLoggedIn.mockReturnValue(false);

    await RouterTestingHarness.create('/students');

    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('should allow /students when authenticated', async () => {
    authService.isLoggedIn.mockReturnValue(true);

    await RouterTestingHarness.create('/students');

    expect(TestBed.inject(Router).url).toBe('/students');
  });
});
