import type { Student, StudentRequest } from '../../src/app/core/models/Student';

// Clé utilisée par AuthService pour stocker le JWT dans sessionStorage.
export const TOKEN_KEY = 'auth_token';
// Faux JWT : aucune valeur réelle, uniquement pour les tests.
export const FAKE_TOKEN = 'fake.jwt.token-for-e2e';

const FIXED_DATE = '2025-02-01T08:00:00Z';

/** Visite une page en simulant un utilisateur déjà connecté (JWT présent dans sessionStorage). */
export function visitAsLoggedIn(path: string): void {
  cy.visit(path, {
    onBeforeLoad: win => win.sessionStorage.setItem(TOKEN_KEY, FAKE_TOKEN),
  });
}

/**
 * Simule l'API /api/students avec une petite base en mémoire (vide à chaque test).
 * Alias créés : getStudents, getStudent, createStudent, updateStudent, deleteStudent.
 * Pour tester une erreur, déclarer un cy.intercept() plus tard dans le test : il est prioritaire.
 */
export function stubStudentsApi(initial: Student[]): void {
  let students: Student[] = initial.map(s => ({ ...s }));
  let nextId = Math.max(0, ...students.map(s => s.id)) + 1;
  const idOf = (url: string): number => Number(new URL(url).pathname.split('/').pop());

  cy.intercept({ method: 'GET', pathname: '/api/students' }, req => {
    req.reply({ statusCode: 200, body: students });
  }).as('getStudents');

  cy.intercept({ method: 'GET', pathname: '/api/students/*' }, req => {
    const found = students.find(s => s.id === idOf(req.url));
    req.reply(found ? { statusCode: 200, body: found } : { statusCode: 404, body: {} });
  }).as('getStudent');

  cy.intercept({ method: 'POST', pathname: '/api/students' }, req => {
    const body = req.body as StudentRequest;
    const created: Student = { id: nextId++, ...body, createdAt: FIXED_DATE, updatedAt: FIXED_DATE };
    students.push(created);
    req.reply({ statusCode: 201, body: created });
  }).as('createStudent');

  cy.intercept({ method: 'PUT', pathname: '/api/students/*' }, req => {
    const id = idOf(req.url);
    const body = req.body as StudentRequest;
    students = students.map(s => (s.id === id ? { ...s, ...body, updatedAt: FIXED_DATE } : s));
    req.reply({ statusCode: 200, body: students.find(s => s.id === id) });
  }).as('updateStudent');

  cy.intercept({ method: 'DELETE', pathname: '/api/students/*' }, req => {
    const id = idOf(req.url);
    students = students.filter(s => s.id !== id);
    req.reply({ statusCode: 204 });
  }).as('deleteStudent');
}
