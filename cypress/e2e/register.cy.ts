import users from '../fixtures/users.json';

const user = users.newUser;

function fillForm(): void {
  cy.get('input[formControlName="firstName"]').type(user.firstName);
  cy.get('input[formControlName="lastName"]').type(user.lastName);
  cy.get('input[formControlName="login"]').type(user.login);
  cy.get('input[formControlName="password"]').type(user.password, { log: false });
}

describe('Inscription (/register)', () => {
  beforeEach(() => {
    cy.visit('/register');
  });

  it('affiche le formulaire et masque le mot de passe', () => {
    cy.contains('.card-header', 'Registration Form');
    cy.get('input[formControlName="password"]').should('have.attr', 'type', 'password');
  });

  describe('validation du formulaire', () => {
    it('affiche 4 messages en français et n\'appelle pas l\'API si le formulaire est vide', () => {
      cy.intercept('POST', '/api/register', { statusCode: 201, body: {} }).as('register');

      cy.contains('button', 'Register').click();

      cy.contains('Le prénom est obligatoire');
      cy.contains('Le nom est obligatoire');
      cy.contains("L'identifiant est obligatoire");
      cy.contains('Le mot de passe est obligatoire');
      cy.get('.is-invalid').should('have.length', 4);
      cy.get('@register.all').should('have.length', 0);
    });

    it('refuse l\'envoi quand un seul champ est manquant', () => {
      cy.intercept('POST', '/api/register', { statusCode: 201, body: {} }).as('register');
      cy.get('input[formControlName="firstName"]').type(user.firstName);
      cy.get('input[formControlName="lastName"]').type(user.lastName);
      cy.get('input[formControlName="login"]').type(user.login);

      cy.contains('button', 'Register').click();

      cy.contains('Le mot de passe est obligatoire');
      cy.get('.is-invalid').should('have.length', 1);
      cy.get('@register.all').should('have.length', 0);
    });

    it('le bouton Cancel vide le formulaire et les messages', () => {
      cy.contains('button', 'Register').click();
      cy.get('.is-invalid').should('have.length', 4);

      cy.contains('button', 'Cancel').click();

      cy.get('.is-invalid').should('not.exist');
      cy.get('input[formControlName="firstName"]').should('have.value', '');
    });
  });

  describe('inscription réussie', () => {
    it('envoie les données saisies, affiche l\'alerte de succès et redirige vers /login', () => {
      cy.intercept('POST', '/api/register', { statusCode: 201, body: {} }).as('register');
      const alertStub = cy.stub().as('alert');
      cy.on('window:alert', alertStub);

      fillForm();
      cy.contains('button', 'Register').click();

      cy.wait('@register').its('request.body').should('deep.equal', user);
      cy.get('@alert').should('have.been.calledWith', 'Inscription réussie !');
      cy.location('pathname').should('eq', '/login');
    });
  });

  describe('erreurs du serveur', () => {
    const cases: [number, string][] = [
      [409, 'Cet utilisateur existe déjà.'],
      [400, 'Données invalides. Veuillez vérifier le formulaire.'],
      [500, 'Une erreur est survenue. Veuillez réessayer.'],
    ];

    cases.forEach(([status, message]) => {
      it(`affiche « ${message} » pour une réponse ${status}, sans redirection`, () => {
        cy.intercept('POST', '/api/register', { statusCode: status, body: {} }).as('register');
        const alertStub = cy.stub().as('alert');
        cy.on('window:alert', alertStub);

        fillForm();
        cy.contains('button', 'Register').click();

        cy.wait('@register');
        cy.get('.alert-danger').should('contain.text', message);
        cy.location('pathname').should('eq', '/register');
        cy.get('@alert').should('not.have.been.called');
      });
    });

    it('signale un serveur injoignable en cas d\'erreur réseau', () => {
      cy.intercept('POST', '/api/register', { forceNetworkError: true }).as('register');

      fillForm();
      cy.contains('button', 'Register').click();

      cy.get('.alert-danger').should('contain.text', 'Serveur injoignable. Veuillez réessayer plus tard.');
      cy.location('pathname').should('eq', '/register');
    });

    it('permet de réessayer après une erreur 409 et aboutit à la redirection', () => {
      cy.intercept('POST', '/api/register', { statusCode: 409, body: {} }).as('registerConflict');
      cy.on('window:alert', () => {});

      fillForm();
      cy.contains('button', 'Register').click();
      cy.get('.alert-danger').should('exist');

      cy.intercept('POST', '/api/register', { statusCode: 201, body: {} }).as('registerOk');
      cy.contains('button', 'Register').click();

      cy.location('pathname').should('eq', '/login');
    });
  });
});
