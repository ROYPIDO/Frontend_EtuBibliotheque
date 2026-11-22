import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { authGuard } from './auth.guard';
import { AuthService } from '../service/auth.service';

describe('authGuard', () => {
  const loginTree = new UrlTree();
  const authService = { isLoggedIn: jest.fn() };
  const router = { createUrlTree: jest.fn() };

  const runGuard = () =>
    TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

  beforeEach(() => {
    authService.isLoggedIn.mockReset();
    router.createUrlTree.mockReset().mockReturnValue(loginTree);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router }
      ]
    });
  });

  it('should allow access when the user is authenticated', () => {
    authService.isLoggedIn.mockReturnValue(true);

    expect(runGuard()).toBe(true);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('should redirect to /login with a UrlTree when the user is not authenticated', () => {
    authService.isLoggedIn.mockReturnValue(false);

    expect(runGuard()).toBe(loginTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
