import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { StudentFormComponent } from './student-form.component';
import { StudentService } from '../../../core/service/student.service';
import { Student } from '../../../core/models/Student';

describe('StudentFormComponent', () => {
  let fixture: ComponentFixture<StudentFormComponent>;
  let component: StudentFormComponent;
  let studentServiceMock: { getById: jest.Mock; create: jest.Mock; update: jest.Mock };
  let routerMock: { navigate: jest.Mock };

  const existing: Student = {
    id: 7, firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com',
    createdAt: '2025-01-01T10:00:00', updatedAt: '2025-01-02T10:00:00'
  };
  const valid = { firstName: 'Alan', lastName: 'Turing', email: 'alan@example.com' };

  const httpError = (status: number) => throwError(() => new HttpErrorResponse({ status }));
  const el = (): HTMLElement => fixture.nativeElement;

  async function setup(params: Record<string, string> = {}) {
    await TestBed.configureTestingModule({
      imports: [StudentFormComponent],
      providers: [
        { provide: StudentService, useValue: studentServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(params) } } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(StudentFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    studentServiceMock = { getById: jest.fn(), create: jest.fn(), update: jest.fn() };
    routerMock = { navigate: jest.fn() };
  });

  describe('validation', () => {
    beforeEach(() => setup());

    it('should be invalid and not call the service when empty', () => {
      component.onSubmit();
      fixture.detectChanges();

      expect(component.submitted).toBe(true);
      expect(studentServiceMock.create).not.toHaveBeenCalled();
      expect(el().textContent).toContain('Le prénom est obligatoire');
      expect(el().textContent).toContain('Le nom est obligatoire');
      expect(el().textContent).toContain("L'e-mail est obligatoire");
    });

    it('should reject an invalid e-mail format', () => {
      component.studentForm.setValue({ ...valid, email: 'not-an-email' });

      component.onSubmit();
      fixture.detectChanges();

      expect(studentServiceMock.create).not.toHaveBeenCalled();
      expect(el().textContent).toContain("Le format de l'e-mail est invalide");
    });

    it('should not show errors before the first submit', () => {
      expect(el().querySelector('.invalid-feedback')).toBeNull();
    });
  });

  describe('create mode (/students/new)', () => {
    beforeEach(() => setup());

    it('should be in create mode and not load any student', () => {
      expect(component.isEditMode).toBe(false);
      expect(studentServiceMock.getById).not.toHaveBeenCalled();
      expect(el().querySelector('.card-header')?.textContent).toContain('Ajouter');
    });

    it('should call create with the request DTO, show submitting, then navigate to /students', () => {
      const response$ = new Subject<Student>();
      studentServiceMock.create.mockReturnValue(response$);
      component.studentForm.setValue(valid);

      component.onSubmit();
      expect(studentServiceMock.create).toHaveBeenCalledWith(valid);
      expect(component.submitting).toBe(true);
      expect(routerMock.navigate).not.toHaveBeenCalled();

      response$.next({ ...existing, ...valid });
      expect(component.submitting).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/students']);
    });

    it('should ignore a second submit while one is in progress', () => {
      studentServiceMock.create.mockReturnValue(new Subject<Student>());
      component.studentForm.setValue(valid);

      component.onSubmit();
      component.onSubmit();

      expect(studentServiceMock.create).toHaveBeenCalledTimes(1);
    });

    it.each([
      [400, 'Données invalides'],
      [409, 'existe déjà'],
      [404, 'introuvable'],
      [0, 'Serveur injoignable'],
      [500, 'Une erreur est survenue']
    ])('should show a message on HTTP %i and stay on the form', (status, text) => {
      studentServiceMock.create.mockReturnValue(httpError(status));
      component.studentForm.setValue(valid);

      component.onSubmit();
      fixture.detectChanges();

      expect(component.submitting).toBe(false);
      expect(el().querySelector('.alert-danger')?.textContent).toContain(text);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });

  describe('edit mode (/students/:id/edit)', () => {
    it('should load the student and prefill the form', async () => {
      studentServiceMock.getById.mockReturnValue(of(existing));
      await setup({ id: '7' });

      expect(component.isEditMode).toBe(true);
      expect(studentServiceMock.getById).toHaveBeenCalledWith(7);
      expect(component.studentForm.value).toEqual({
        firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com'
      });
      expect(el().querySelector('.card-header')?.textContent).toContain('Modifier');
    });

    it('should show a loading state while the student is loading', async () => {
      const response$ = new Subject<Student>();
      studentServiceMock.getById.mockReturnValue(response$);
      await setup({ id: '7' });

      expect(component.loading).toBe(true);
      expect(el().textContent).toContain('Chargement');

      response$.next(existing);
      fixture.detectChanges();
      expect(component.loading).toBe(false);
      expect(el().textContent).not.toContain('Chargement');
    });

    it('should call update with the id and the request DTO, then navigate to /students', async () => {
      studentServiceMock.getById.mockReturnValue(of(existing));
      studentServiceMock.update.mockReturnValue(of({ ...existing, lastName: 'Byron' }));
      await setup({ id: '7' });

      component.studentForm.patchValue({ lastName: 'Byron' });
      component.onSubmit();

      expect(studentServiceMock.update).toHaveBeenCalledWith(7, {
        firstName: 'Ada', lastName: 'Byron', email: 'ada@example.com'
      });
      expect(studentServiceMock.create).not.toHaveBeenCalled();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/students']);
    });

    it('should show "introuvable" when the student does not exist (404)', async () => {
      studentServiceMock.getById.mockReturnValue(httpError(404));
      await setup({ id: '999' });
      fixture.detectChanges();

      expect(component.loading).toBe(false);
      expect(el().querySelector('.alert-danger')?.textContent).toContain('Étudiant introuvable');
    });

    it('should show a network error when loading fails with status 0', async () => {
      studentServiceMock.getById.mockReturnValue(httpError(0));
      await setup({ id: '7' });
      fixture.detectChanges();

      expect(el().querySelector('.alert-danger')?.textContent).toContain('Serveur injoignable');
    });

    it('should show a conflict message when update returns 409', async () => {
      studentServiceMock.getById.mockReturnValue(of(existing));
      studentServiceMock.update.mockReturnValue(httpError(409));
      await setup({ id: '7' });

      component.onSubmit();
      fixture.detectChanges();

      expect(el().querySelector('.alert-danger')?.textContent).toContain('existe déjà');
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('should reject a non-numeric id without calling the API', async () => {
      await setup({ id: 'abc' });
      fixture.detectChanges();

      expect(studentServiceMock.getById).not.toHaveBeenCalled();
      expect(el().querySelector('.alert-danger')?.textContent).toContain('invalide');
    });
  });

  describe('cancel', () => {
    it('should navigate back to /students without calling the API', async () => {
      await setup();

      component.onCancel();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/students']);
      expect(studentServiceMock.create).not.toHaveBeenCalled();
    });

    it('should navigate back when clicking the "Annuler" button', async () => {
      await setup();

      const cancel = Array.from(el().querySelectorAll('button')).find(b => b.textContent?.includes('Annuler'));
      cancel?.click();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/students']);
    });
  });
});
