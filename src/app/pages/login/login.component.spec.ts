import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from '../../core/service/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceMock: { login: jest.Mock };
  let routerMock: { navigate: jest.Mock };

  beforeEach(async () => {
    authServiceMock = { login: jest.fn() };
    routerMock = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function fillForm() {
    component.loginForm.setValue({ login: 'user', password: 'secret' });
  }

  function httpError(status: number) {
    return throwError(() => new HttpErrorResponse({ status }));
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not call the service when the form is empty', () => {
    component.onSubmit();

    expect(authServiceMock.login).not.toHaveBeenCalled();
    expect(component.submitted).toBe(true);
  });

  it('should show loading, then a success message on success', () => {
    const response$ = new Subject<string>();
    authServiceMock.login.mockReturnValue(response$);
    fillForm();

    component.onSubmit();
    expect(authServiceMock.login).toHaveBeenCalledWith({ login: 'user', password: 'secret' });
    expect(component.loading).toBe(true);

    response$.next('fake.jwt.token');
    expect(component.loading).toBe(false);
    expect(component.successMessage).toBe('Connexion réussie.');
    expect(component.errorMessage).toBe('');
  });

  it('should navigate to /students only after a successful login', () => {
    const response$ = new Subject<string>();
    authServiceMock.login.mockReturnValue(response$);
    fillForm();

    component.onSubmit();
    expect(routerMock.navigate).not.toHaveBeenCalled();

    response$.next('fake.jwt.token');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/students']);
  });

  it('should show "Identifiants incorrects." on 401 and not navigate', () => {
    authServiceMock.login.mockReturnValue(httpError(401));
    fillForm();

    component.onSubmit();

    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(component.loading).toBe(false);
    expect(component.errorMessage).toBe('Identifiants incorrects.');
    expect(component.successMessage).toBe('');
  });

  it('should show a server-unreachable message on status 0', () => {
    authServiceMock.login.mockReturnValue(httpError(0));
    fillForm();

    component.onSubmit();

    expect(component.errorMessage).toContain('Serveur injoignable');
  });

  it('should show a generic message on other errors', () => {
    authServiceMock.login.mockReturnValue(httpError(500));
    fillForm();

    component.onSubmit();

    expect(component.errorMessage).toContain('Une erreur est survenue');
  });

  it('should expose the form controls through the "form" getter', () => {
    expect(component.form['login']).toBe(component.loginForm.controls['login']);
    expect(component.form['password']).toBe(component.loginForm.controls['password']);
  });

  it('should not show validation messages before the first submit', () => {
    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelector('.invalid-feedback')).toBeNull();
    expect(root.querySelector('.is-invalid')).toBeNull();
  });

  it('should show "required" messages for both fields after submitting an empty form', () => {
    component.onSubmit();
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('Login is required');
    expect(root.textContent).toContain('Password is required');
    expect(root.querySelectorAll('.is-invalid').length).toBe(2);
  });

  it('should ignore a second submit while a login is in progress', () => {
    authServiceMock.login.mockReturnValue(new Subject<string>());
    fillForm();

    component.onSubmit();
    component.onSubmit();

    expect(authServiceMock.login).toHaveBeenCalledTimes(1);
  });

  it('onReset should clear the form, the submitted flag and both messages', () => {
    authServiceMock.login.mockReturnValue(httpError(401));
    fillForm();
    component.onSubmit();
    expect(component.errorMessage).not.toBe('');

    component.onReset();

    expect(component.submitted).toBe(false);
    expect(component.errorMessage).toBe('');
    expect(component.successMessage).toBe('');
    expect(component.loginForm.value).toEqual({ login: null, password: null });
  });

  it('should reset the form when clicking the "Cancel" button', () => {
    fillForm();
    component.submitted = true;

    const cancel = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .find(b => b.textContent?.includes('Cancel'));
    cancel?.click();

    expect(component.submitted).toBe(false);
    expect(component.loginForm.value).toEqual({ login: null, password: null });
  });
});
