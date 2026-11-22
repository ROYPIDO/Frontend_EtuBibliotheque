import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterComponent } from './register.component';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { UserService } from '../../core/service/user.service';
import { UserMockService } from '../../core/service/user-mock.service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideHttpClient(),
        { provide: UserService, useValue: UserMockService },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should redirect to /login after a successful registration', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    jest.spyOn(window, 'alert').mockImplementation(() => {});
    // onSubmit lit le service via inject() : on remplace sa méthode register
    (component as any).userService = { register: () => of({}) };
    component.registerForm.setValue({
      firstName: 'Jane', lastName: 'Doe', login: 'jane', password: 'secret'
    });

    component.onSubmit();

    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});

// Ces tests injectent un vrai mock d'instance de UserService (jest.fn),
// ce qui permet de vérifier précisément les appels sans contourner inject().
describe('RegisterComponent (form behaviour)', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let userServiceMock: { register: jest.Mock };
  let navigateSpy: jest.SpyInstance;
  let alertSpy: jest.SpyInstance;

  const valid = { firstName: 'Jane', lastName: 'Doe', login: 'jane', password: 'secret' };

  beforeEach(async () => {
    userServiceMock = { register: jest.fn() };
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [{ provide: UserService, useValue: userServiceMock }]
    }).compileComponents();

    navigateSpy = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => jest.restoreAllMocks());

  it('should expose the form controls through the "form" getter', () => {
    expect(Object.keys(component.form)).toEqual(['firstName', 'lastName', 'login', 'password']);
  });

  it('should not show validation messages before the first submit', () => {
    expect(fixture.nativeElement.querySelector('.invalid-feedback')).toBeNull();
  });

  it('should not call the service and show "required" messages when the form is empty', () => {
    component.onSubmit();
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    expect(userServiceMock.register).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(component.submitted).toBe(true);
    expect(root.textContent).toContain('Le prénom est obligatoire');
    expect(root.textContent).toContain('Le nom est obligatoire');
    expect(root.textContent).toContain("L'identifiant est obligatoire");
    expect(root.textContent).toContain('Le mot de passe est obligatoire');
    expect(root.querySelectorAll('.is-invalid').length).toBe(4);
  });

  it('should reject the form when a single field is missing', () => {
    component.registerForm.setValue({ ...valid, lastName: '' });

    component.onSubmit();

    expect(userServiceMock.register).not.toHaveBeenCalled();
  });

  it('should send the form values to the service, then alert and redirect to /login', () => {
    userServiceMock.register.mockReturnValue(of({}));
    component.registerForm.setValue(valid);

    component.onSubmit();

    expect(userServiceMock.register).toHaveBeenCalledWith(valid);
    expect(alertSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('should mask the password field with type="password"', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[formControlName="password"]');
    expect(input.type).toBe('password');
  });

  it('should not display any error message on a successful registration', () => {
    userServiceMock.register.mockReturnValue(of({}));
    component.registerForm.setValue(valid);

    component.onSubmit();
    fixture.detectChanges();

    expect(alertSpy).toHaveBeenCalledWith('Inscription réussie !');
    expect(component.errorMessage).toBe('');
    expect(fixture.nativeElement.querySelector('.alert-danger')).toBeNull();
  });

  describe('HTTP error handling', () => {
    const cases: [number, string][] = [
      [409, 'Cet utilisateur existe déjà.'],
      [400, 'Données invalides. Veuillez vérifier le formulaire.'],
      [0, 'Serveur injoignable. Veuillez réessayer plus tard.'],
      [500, 'Une erreur est survenue. Veuillez réessayer.'],
    ];

    it.each(cases)('should display the French message for status %i, without redirecting', (status, message) => {
      userServiceMock.register.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
      component.registerForm.setValue(valid);

      component.onSubmit();
      fixture.detectChanges();

      expect(component.errorMessage).toBe(message);
      expect(fixture.nativeElement.querySelector('.alert-danger')?.textContent).toContain(message);
      expect(alertSpy).not.toHaveBeenCalled();
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('should clear the previous error on a new submit and on reset', () => {
      userServiceMock.register.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 409 })));
      component.registerForm.setValue(valid);
      component.onSubmit();
      expect(component.errorMessage).not.toBe('');

      userServiceMock.register.mockReturnValueOnce(of({}));
      component.onSubmit();
      expect(component.errorMessage).toBe('');

      userServiceMock.register.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 400 })));
      component.onSubmit();
      expect(component.errorMessage).not.toBe('');
      component.onReset();
      expect(component.errorMessage).toBe('');
    });
  });

  it('onReset should clear the form and the submitted flag', () => {
    userServiceMock.register.mockReturnValue(of({}));
    component.registerForm.setValue(valid);
    component.onSubmit();
    expect(component.submitted).toBe(true);

    component.onReset();

    expect(component.submitted).toBe(false);
    expect(component.registerForm.value).toEqual({
      firstName: null, lastName: null, login: null, password: null
    });
  });

  it('should reset the form when clicking the "Cancel" button', () => {
    component.registerForm.setValue(valid);
    component.submitted = true;

    const cancel = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .find(b => b.textContent?.includes('Cancel'));
    cancel?.click();

    expect(component.submitted).toBe(false);
    expect(component.registerForm.value.firstName).toBeNull();
  });
});
