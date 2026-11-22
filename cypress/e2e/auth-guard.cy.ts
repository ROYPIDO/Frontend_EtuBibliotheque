import { FAKE_TOKEN, TOKEN_KEY, stubStudentsApi, visitAsLoggedIn } from '../support/helpers';

describe('Accès protégé (guard + interceptor)', () => {
  it('redirige la racine « / » vers /login', () => {
    cy.visit('/');
    cy.location('pathname').should('eq', '/login');
  });

  ['/students', '/students/new', '/students/1/edit'].forEach(route => {
    it(`redirige ${route} vers /login quand l'utilisateur n'est pas connecté`, () => {
      stubStudentsApi([]);

      cy.visit(route);

      cy.location('pathname').should('eq', '/login');
      cy.contains('.card-header', 'Login Form');
      // Le guard bloque la navigation avant tout appel API.
      cy.get('@getStudents.all').should('have.length', 0);
    });
  });

  it('autorise /students quand un JWT est présent', () => {
    stubStudentsApi([]);

    visitAsLoggedIn('/students');

    cy.location('pathname').should('eq', '/students');
    cy.contains('.card-header', 'Étudiants');
  });

  it('déconnecte et redirige vers /login quand l\'API répond 401 (token expiré)', () => {
    cy.intercept({ method: 'GET', pathname: '/api/students' }, { statusCode: 401, body: {} }).as('getStudents');

    visitAsLoggedIn('/students');

    cy.wait('@getStudents');
    cy.location('pathname').should('eq', '/login');
    cy.window().its('sessionStorage').invoke('getItem', TOKEN_KEY).should('be.null');
  });

  it('envoie le JWT dans l\'en-tête Authorization: Bearer', () => {
    stubStudentsApi([]);

    visitAsLoggedIn('/students');

    cy.wait('@getStudents').its('request.headers.authorization').should('eq', `Bearer ${FAKE_TOKEN}`);
  });
});
