import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { StudentListComponent } from './student-list.component';
import { StudentService } from '../../../core/service/student.service';
import { Student } from '../../../core/models/Student';

describe('StudentListComponent', () => {
  let fixture: ComponentFixture<StudentListComponent>;
  let component: StudentListComponent;
  let studentServiceMock: { getAll: jest.Mock; delete: jest.Mock };

  const students: Student[] = [
    { id: 1, firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', createdAt: '2025-01-01T10:00:00', updatedAt: '2025-01-01T10:00:00' },
    { id: 2, firstName: 'Alan', lastName: 'Turing', email: 'alan@example.com', createdAt: '2025-01-02T10:00:00', updatedAt: '2025-01-02T10:00:00' }
  ];

  const httpError = (status: number) => throwError(() => new HttpErrorResponse({ status }));
  const el = (): HTMLElement => fixture.nativeElement;

  async function setup() {
    await TestBed.configureTestingModule({
      imports: [StudentListComponent],
      providers: [
        provideRouter([]),
        { provide: StudentService, useValue: studentServiceMock }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(StudentListComponent);
    component = fixture.componentInstance;
  }

  beforeEach(() => {
    studentServiceMock = { getAll: jest.fn(), delete: jest.fn() };
  });

  afterEach(() => jest.restoreAllMocks());

  it('should show a loading indicator, then hide it once loaded', async () => {
    const response$ = new Subject<Student[]>();
    studentServiceMock.getAll.mockReturnValue(response$);
    await setup();

    fixture.detectChanges();
    expect(component.loading).toBe(true);
    expect(el().textContent).toContain('Chargement');

    response$.next(students);
    fixture.detectChanges();
    expect(component.loading).toBe(false);
    expect(el().textContent).not.toContain('Chargement');
  });

  it('should display first name, last name and email of each student', async () => {
    studentServiceMock.getAll.mockReturnValue(of(students));
    await setup();
    fixture.detectChanges();

    const rows = el().querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Ada');
    expect(rows[0].textContent).toContain('Lovelace');
    expect(rows[0].textContent).toContain('ada@example.com');
    expect(rows[1].textContent).toContain('Turing');
  });

  it('should show an empty message when there is no student', async () => {
    studentServiceMock.getAll.mockReturnValue(of([]));
    await setup();
    fixture.detectChanges();

    expect(el().querySelector('table')).toBeNull();
    expect(el().textContent).toContain('Aucun étudiant');
  });

  it('should show an error message when loading fails', async () => {
    studentServiceMock.getAll.mockReturnValue(httpError(500));
    await setup();
    fixture.detectChanges();

    expect(component.loading).toBe(false);
    expect(el().querySelector('.alert-danger')?.textContent).toContain('Impossible de charger');
    expect(el().textContent).not.toContain('Aucun étudiant');
  });

  it('should link to the creation and edit routes', async () => {
    studentServiceMock.getAll.mockReturnValue(of(students));
    await setup();
    fixture.detectChanges();

    expect(el().querySelector('a[href="/students/new"]')).not.toBeNull();
    expect(el().querySelector('a[href="/students/1/edit"]')).not.toBeNull();
    expect(el().querySelector('a[href="/students/2/edit"]')).not.toBeNull();
  });

  describe('delete', () => {
    it('should delete then reload the list when confirmed', async () => {
      studentServiceMock.getAll.mockReturnValueOnce(of(students)).mockReturnValueOnce(of([students[1]]));
      studentServiceMock.delete.mockReturnValue(of(undefined));
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      await setup();
      fixture.detectChanges();

      component.onDelete(students[0]);
      fixture.detectChanges();

      expect(confirmSpy).toHaveBeenCalled();
      expect(studentServiceMock.delete).toHaveBeenCalledWith(1);
      expect(studentServiceMock.getAll).toHaveBeenCalledTimes(2);
      expect(el().querySelectorAll('tbody tr').length).toBe(1);
    });

    it('should do nothing when the confirmation is cancelled', async () => {
      studentServiceMock.getAll.mockReturnValue(of(students));
      jest.spyOn(window, 'confirm').mockReturnValue(false);
      await setup();
      fixture.detectChanges();

      component.onDelete(students[0]);

      expect(studentServiceMock.delete).not.toHaveBeenCalled();
      expect(studentServiceMock.getAll).toHaveBeenCalledTimes(1);
    });

    it('should show an error and keep the list when deletion fails', async () => {
      studentServiceMock.getAll.mockReturnValue(of(students));
      studentServiceMock.delete.mockReturnValue(httpError(500));
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      await setup();
      fixture.detectChanges();

      component.onDelete(students[0]);
      fixture.detectChanges();

      expect(el().querySelector('.alert-danger')?.textContent).toContain('suppression a échoué');
      expect(el().querySelectorAll('tbody tr').length).toBe(2);
      expect(studentServiceMock.getAll).toHaveBeenCalledTimes(1);
    });
  });
});
