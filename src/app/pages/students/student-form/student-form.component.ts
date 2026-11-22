import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MaterialModule } from '../../../shared/material.module';
import { StudentService } from '../../../core/service/student.service';
import { StudentRequest } from '../../../core/models/Student';

@Component({
  selector: 'app-student-form',
  imports: [CommonModule, MaterialModule],
  templateUrl: './student-form.component.html',
  standalone: true,
  styleUrl: './student-form.component.css'
})
export class StudentFormComponent implements OnInit {
  private studentService = inject(StudentService);
  private formBuilder = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  studentForm: FormGroup = new FormGroup({});
  studentId: number | null = null;   // null = mode création
  submitted: boolean = false;
  loading: boolean = false;          // chargement de l'étudiant (mode modification)
  submitting: boolean = false;       // envoi du formulaire
  errorMessage: string = '';

  get isEditMode(): boolean {
    return this.studentId !== null;
  }

  ngOnInit(): void {
    this.studentForm = this.formBuilder.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });

    // Un paramètre :id dans l'URL signifie "modification".
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      const id = Number(idParam);
      if (!Number.isInteger(id)) {
        this.errorMessage = 'Identifiant d\'étudiant invalide.';
        return;
      }
      this.studentId = id;
      this.loadStudent(id);
    }
  }

  get form() {
    return this.studentForm.controls;
  }

  private loadStudent(id: number): void {
    this.loading = true;
    this.studentService.getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: student => {
          this.loading = false;
          // On ne préremplit que les champs du DTO de requête.
          this.studentForm.patchValue({
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email
          });
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          this.errorMessage = this.toMessage(err);
        }
      });
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (this.studentForm.invalid || this.loading || this.submitting) {
      return;
    }
    const student: StudentRequest = {
      firstName: this.studentForm.get('firstName')?.value,
      lastName: this.studentForm.get('lastName')?.value,
      email: this.studentForm.get('email')?.value
    };
    this.submitting = true;
    const request$ = this.studentId !== null
      ? this.studentService.update(this.studentId, student)
      : this.studentService.create(student);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigate(['/students']);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting = false;
          this.errorMessage = this.toMessage(err);
        }
      });
  }

  onCancel(): void {
    this.router.navigate(['/students']);
  }

  private toMessage(err: HttpErrorResponse): string {
    switch (err.status) {
      case 0:
        return 'Serveur injoignable. Veuillez réessayer plus tard.';
      case 400:
        return 'Données invalides. Vérifiez les champs saisis.';
      case 404:
        return 'Étudiant introuvable.';
      case 409:
        return 'Un étudiant avec cet e-mail existe déjà.';
      default:
        return 'Une erreur est survenue. Veuillez réessayer.';
    }
  }
}
