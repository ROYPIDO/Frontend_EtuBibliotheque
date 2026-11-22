import { TestBed } from '@angular/core/testing';

import { UserService } from './user.service';
import {HttpErrorResponse, provideHttpClient} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Register } from '../models/Register';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  const user: Register = { firstName: 'Jane', lastName: 'Doe', login: 'jane', password: 'secret' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('register should POST the user to /api/register and return the response', () => {
    let result: Object | undefined;
    service.register(user).subscribe(response => (result = response));

    const req = httpMock.expectOne('/api/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(user);
    req.flush({ id: 1 });

    expect(result).toEqual({ id: 1 });
  });

  it('register should propagate HTTP errors to the caller', () => {
    let error: HttpErrorResponse | undefined;
    service.register(user).subscribe({ error: (e: HttpErrorResponse) => (error = e) });

    httpMock.expectOne('/api/register').flush('Conflict', { status: 409, statusText: 'Conflict' });

    expect(error?.status).toBe(409);
  });
});
