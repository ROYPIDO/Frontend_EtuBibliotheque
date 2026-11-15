import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from '../../core/service/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceMock: { login: jest.Mock };

  beforeEach(async () => {
    authServiceMock = { login: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [{ provide: AuthService, useValue: authServiceMock }]
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

  it('should show "Identifiants incorrects." on 401', () => {
    authServiceMock.login.mockReturnValue(httpError(401));
    fillForm();

    component.onSubmit();

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
});
