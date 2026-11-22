import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MaterialModule } from '../../../shared/material.module';
import { StudentService } from '../../../core/service/student.service';
import { Student } from '../../../core/models/Student';

@Component({
  selector: 'app-student-list',
  imports: [CommonModule, MaterialModule, RouterLink],
  templateUrl: './student-list.component.html',
  standalone: true,
  styleUrl: './student-list.component.css'
})
export class StudentListComponent implements OnInit {
  private studentService = inject(StudentService);
  private destroyRef = inject(DestroyRef);
  students: Student[] = [];
  loading: boolean = false;
  errorMessage: string = '';

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
    this.loading = true;
    this.errorMessage = '';
    this.studentService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: students => {
          this.students = students;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Impossible de charger les étudiants. Veuillez réessayer.';
        }
      });
  }

  onDelete(student: Student): void {
    if (!window.confirm(`Supprimer ${student.firstName} ${student.lastName} ?`)) {
      return;
    }
    this.errorMessage = '';
    this.studentService.delete(student.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadStudents(),
        error: () => {
          this.errorMessage = 'La suppression a échoué. Veuillez réessayer.';
        }
      });
  }
}
