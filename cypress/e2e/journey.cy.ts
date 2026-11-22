import users from '../fixtures/users.json';
import { FAKE_TOKEN, stubStudentsApi } from '../support/helpers';

const user = users.newUser;

// Parcours complet de bout en bout, sur une API entièrement simulée :
// inscription → connexion → liste → création → modification → suppression → déconnexion.
describe('Parcours complet utilisateur', () => {
  it('permet de s\'inscrire, se connecter, gérer un étudiant puis se déconnecter', () => {
    stubStudentsApi([]);
    cy.intercept('POST', '/api/register', { statusCode: 201, body: {} }).as('register');
    cy.intercept('POST', '/api/login', req => {
      const { login, password } = req.body as { login: string; password: string };
      const valid = login === user.login && password === user.password;
      req.reply(valid
        ? { statusCode: 200, body: FAKE_TOKEN, headers: { 'content-type': 'text/plain' } }
        : { statusCode: 401, body: {} });
    }).as('login');
    const alertStub = cy.stub().as('alert');
    cy.on('window:alert', alertStub);
    cy.on('window:confirm', () => true);

    // 1. Inscription
    cy.visit('/register');
    cy.get('input[formControlName="firstName"]').type(user.firstName);
    cy.get('input[formControlName="lastName"]').type(user.lastName);
    cy.get('input[formControlName="login"]').type(user.login);
    cy.get('input[formControlName="password"]').type(user.password, { log: false });
    cy.contains('button', 'Register').click();
    cy.wait('@register');
    cy.get('@alert').should('have.been.calledWith', 'Inscription réussie !');
    cy.location('pathname').should('eq', '/login');

    // 2. Connexion
    cy.get('input[formControlName="login"]').type(user.login);
    cy.get('input[formControlName="password"]').type(user.password, { log: false });
    cy.contains('button', /^\s*Login\s*$/).click();
    cy.wait('@login');
    cy.location('pathname').should('eq', '/students');
    cy.contains('Aucun étudiant pour le moment.');

    // 3. Création
    cy.contains('a', 'Ajouter un étudiant').click();
    cy.get('input[formControlName="firstName"]').type('Jeanne');
    cy.get('input[formControlName="lastName"]').type('Durand');
    cy.get('input[formControlName="email"]').type('jeanne.durand@example.test');
    cy.contains('button', 'Enregistrer').click();
    cy.wait('@createStudent').its('request.headers.authorization').should('eq', `Bearer ${FAKE_TOKEN}`);
    cy.location('pathname').should('eq', '/students');
    cy.get('tbody tr').should('have.length', 1).and('contain.text', 'Jeanne');

    // 4. Modification
    cy.contains('a', 'Modifier').click();
    cy.get('input[formControlName="firstName"]').should('have.value', 'Jeanne');
    cy.get('input[formControlName="lastName"]').clear().type('Durand-Petit');
    cy.contains('button', 'Enregistrer').click();
    cy.wait('@updateStudent');
    cy.contains('tbody tr', 'Durand-Petit');

    // 5. Suppression
    cy.contains('button', 'Supprimer').click();
    cy.wait('@deleteStudent');
    cy.contains('Aucun étudiant pour le moment.');

    // 6. Déconnexion
    cy.contains('button', 'Déconnexion').click();
    cy.location('pathname').should('eq', '/login');
    cy.visit('/students');
    cy.location('pathname').should('eq', '/login');
  });
});
