import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterComponent } from './register.component';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { of } from 'rxjs';
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
