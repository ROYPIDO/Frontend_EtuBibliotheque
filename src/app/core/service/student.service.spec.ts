import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { StudentService } from './student.service';
import { Student, StudentRequest } from '../models/Student';

describe('StudentService', () => {
  let service: StudentService;
  let httpMock: HttpTestingController;

  const request: StudentRequest = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com'
  };
  const student: Student = {
    id: 1,
    ...request,
    createdAt: '2025-01-01T10:00:00',
    updatedAt: '2025-01-02T11:30:00'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(StudentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAll should GET /api/students and return the list', () => {
    let result: Student[] | undefined;
    service.getAll().subscribe(students => (result = students));

    const req = httpMock.expectOne('/api/students');
    expect(req.request.method).toBe('GET');
    req.flush([student]);

    expect(result).toEqual([student]);
  });

  it('getById should GET /api/students/{id} and return the student', () => {
    let result: Student | undefined;
    service.getById(1).subscribe(s => (result = s));

    const req = httpMock.expectOne('/api/students/1');
    expect(req.request.method).toBe('GET');
    req.flush(student);

    expect(result).toEqual(student);
  });

  it('create should POST the request DTO to /api/students', () => {
    let result: Student | undefined;
    service.create(request).subscribe(s => (result = s));

    const req = httpMock.expectOne('/api/students');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(student);

    expect(result).toEqual(student);
  });

  it('update should PUT the request DTO to /api/students/{id}', () => {
    const updated: StudentRequest = { ...request, lastName: 'Byron' };
    let result: Student | undefined;
    service.update(1, updated).subscribe(s => (result = s));

    const req = httpMock.expectOne('/api/students/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updated);
    req.flush({ ...student, lastName: 'Byron' });

    expect(result?.lastName).toBe('Byron');
  });

  it('delete should DELETE /api/students/{id}', () => {
    let completed = false;
    service.delete(1).subscribe({ complete: () => (completed = true) });

    const req = httpMock.expectOne('/api/students/1');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toBeNull();
    req.flush(null);

    expect(completed).toBe(true);
  });

  it('should propagate HTTP errors to the caller', () => {
    let error: HttpErrorResponse | undefined;
    service.getAll().subscribe({ error: (e: HttpErrorResponse) => (error = e) });

    httpMock.expectOne('/api/students').flush('Forbidden', { status: 403, statusText: 'Forbidden' });

    expect(error?.status).toBe(403);
  });
});
