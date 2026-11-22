import users from '../fixtures/users.json';
import { FAKE_TOKEN, TOKEN_KEY, stubStudentsApi } from '../support/helpers';

const user = users.newUser;

function fillForm(): void {
  cy.get('input[formControlName="login"]').type(user.login);
  cy.get('input[formControlName="password"]').type(user.password, { log: false });
}

function submit(): void {
  cy.contains('button', /^\s*Login\s*$/).click();
}

describe('Connexion (/login)', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('affiche le formulaire de connexion avec un mot de passe masqué', () => {
    cy.contains('.card-header', 'Login Form');
    cy.get('input[formControlName="password"]').should('have.attr', 'type', 'password');
  });

  describe('validation du formulaire', () => {
    it('affiche les messages « required » et n\'appelle pas l\'API si les champs sont vides', () => {
      cy.intercept('POST', '/api/login', { statusCode: 200, body: FAKE_TOKEN }).as('login');

      submit();

      cy.contains('Login is required');
      cy.contains('Password is required');
      cy.get('.is-invalid').should('have.length', 2);
      cy.get('@login.all').should('have.length', 0);
    });

    it('le bouton Cancel vide le formulaire et les messages', () => {
      submit();
      cy.get('.is-invalid').should('have.length', 2);

      cy.contains('button', 'Cancel').click();

      cy.get('.is-invalid').should('not.exist');
      cy.get('input[formControlName="login"]').should('have.value', '');
    });
  });

  describe('connexion réussie', () => {
    it('envoie les identifiants, affiche le chargement, stocke le JWT et redirige vers /students', () => {
      stubStudentsApi([]);
      // Le back-end renvoie le JWT en texte brut (pas en JSON).
      cy.intercept('POST', '/api/login', {
        statusCode: 200,
        body: FAKE_TOKEN,
        headers: { 'content-type': 'text/plain' },
        delay: 400,
      }).as('login');

      fillForm();
      submit();

      cy.contains('button', 'Connexion...').should('be.disabled');
      cy.wait('@login').its('request.body').should('deep.equal', { login: user.login, password: user.password });
      cy.location('pathname').should('eq', '/students');
      cy.window().then(win => {
        expect(win.sessionStorage.getItem(TOKEN_KEY)).to.eq(FAKE_TOKEN);
        // Le mot de passe ne doit jamais être conservé côté navigateur.
        expect(JSON.stringify(win.sessionStorage)).not.to.contain(user.password);
        expect(JSON.stringify(win.localStorage)).not.to.contain(user.password);
      });
    });
  });

  describe('erreurs du serveur', () => {
    it('affiche « Identifiants incorrects. » pour un 401 et ne stocke aucun token', () => {
      cy.intercept('POST', '/api/login', { statusCode: 401, body: {} }).as('login');

      fillForm();
      submit();

      cy.wait('@login');
      cy.get('.alert-danger').should('contain.text', 'Identifiants incorrects.');
      cy.location('pathname').should('eq', '/login');
      cy.window().its('sessionStorage').invoke('getItem', TOKEN_KEY).should('be.null');
      cy.contains('button', /^\s*Login\s*$/).should('not.be.disabled');
    });

    it('signale un serveur injoignable en cas d\'erreur réseau', () => {
      cy.intercept('POST', '/api/login', { forceNetworkError: true }).as('login');

      fillForm();
      submit();

      cy.get('.alert-danger').should('contain.text', 'Serveur injoignable. Veuillez réessayer plus tard.');
      cy.location('pathname').should('eq', '/login');
    });

    it('affiche un message générique pour une erreur 500', () => {
      cy.intercept('POST', '/api/login', { statusCode: 500, body: {} }).as('login');

      fillForm();
      submit();

      cy.get('.alert-danger').should('contain.text', 'Une erreur est survenue. Veuillez réessayer.');
      cy.location('pathname').should('eq', '/login');
    });
  });
});
