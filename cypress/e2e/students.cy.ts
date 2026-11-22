import students from '../fixtures/students.json';
import { TOKEN_KEY, stubStudentsApi, visitAsLoggedIn } from '../support/helpers';

const API_STUDENTS = { pathname: '/api/students' };
const API_STUDENT = { pathname: '/api/students/*' };

describe('Liste des étudiants (/students)', () => {
  it('affiche les étudiants renvoyés par l\'API', () => {
    stubStudentsApi(students);

    visitAsLoggedIn('/students');

    cy.get('tbody tr').should('have.length', 3);
    cy.get('tbody tr').eq(0).should('contain.text', 'Camille').and('contain.text', 'Dupont')
      .and('contain.text', 'camille.dupont@example.test');
    cy.get('tbody tr').eq(2).should('contain.text', 'Inès');
  });

  it('affiche un message quand la liste est vide', () => {
    stubStudentsApi([]);

    visitAsLoggedIn('/students');

    cy.contains('Aucun étudiant pour le moment.');
    cy.get('table').should('not.exist');
  });

  it('affiche l\'indicateur de chargement pendant la requête', () => {
    cy.intercept({ method: 'GET', ...API_STUDENTS }, { statusCode: 200, body: students, delay: 500 }).as('getStudents');

    visitAsLoggedIn('/students');

    cy.contains('Chargement...').should('be.visible');
    cy.get('tbody tr').should('have.length', 3);
    cy.contains('Chargement...').should('not.exist');
  });

  it('affiche une erreur quand le chargement échoue (500)', () => {
    cy.intercept({ method: 'GET', ...API_STUDENTS }, { statusCode: 500, body: {} }).as('getStudents');

    visitAsLoggedIn('/students');

    cy.get('.alert-danger').should('contain.text', 'Impossible de charger les étudiants. Veuillez réessayer.');
    cy.get('table').should('not.exist');
  });

  it('affiche une erreur quand le serveur est injoignable', () => {
    cy.intercept({ method: 'GET', ...API_STUDENTS }, { forceNetworkError: true }).as('getStudents');

    visitAsLoggedIn('/students');

    cy.get('.alert-danger').should('contain.text', 'Impossible de charger les étudiants.');
  });
});

describe('Création d\'un étudiant (/students/new)', () => {
  beforeEach(() => {
    stubStudentsApi(students);
    visitAsLoggedIn('/students');
    cy.contains('a', 'Ajouter un étudiant').click();
  });

  const fill = (firstName: string, lastName: string, email: string): void => {
    cy.get('input[formControlName="firstName"]').type(firstName);
    cy.get('input[formControlName="lastName"]').type(lastName);
    cy.get('input[formControlName="email"]').type(email);
  };

  it('ouvre le formulaire de création depuis la liste', () => {
    cy.location('pathname').should('eq', '/students/new');
    cy.contains('.card-header', 'Ajouter un étudiant');
  });

  it('affiche les messages obligatoires et n\'appelle pas l\'API si le formulaire est vide', () => {
    cy.contains('button', 'Enregistrer').click();

    cy.contains('Le prénom est obligatoire');
    cy.contains('Le nom est obligatoire');
    cy.contains("L'e-mail est obligatoire");
    cy.get('@createStudent.all').should('have.length', 0);
  });

  it('refuse un e-mail au format invalide', () => {
    fill('Jeanne', 'Durand', 'pas-un-email');

    cy.contains('button', 'Enregistrer').click();

    cy.contains("Le format de l'e-mail est invalide");
    cy.get('@createStudent.all').should('have.length', 0);
    cy.location('pathname').should('eq', '/students/new');
  });

  it('crée l\'étudiant, redirige vers la liste et l\'y affiche', () => {
    fill('Jeanne', 'Durand', 'jeanne.durand@example.test');

    cy.contains('button', 'Enregistrer').click();

    cy.wait('@createStudent').its('request.body').should('deep.equal', {
      firstName: 'Jeanne', lastName: 'Durand', email: 'jeanne.durand@example.test',
    });
    cy.location('pathname').should('eq', '/students');
    cy.get('tbody tr').should('have.length', 4);
    cy.contains('tbody tr', 'jeanne.durand@example.test');
  });

  const errors: [number, string][] = [
    [409, 'Un étudiant avec cet e-mail existe déjà.'],
    [400, 'Données invalides. Vérifiez les champs saisis.'],
    [500, 'Une erreur est survenue. Veuillez réessayer.'],
  ];
  errors.forEach(([status, message]) => {
    it(`affiche « ${message} » pour une réponse ${status} et reste sur le formulaire`, () => {
      cy.intercept({ method: 'POST', ...API_STUDENTS }, { statusCode: status, body: {} }).as('createStudent');
      fill('Jeanne', 'Durand', 'jeanne.durand@example.test');

      cy.contains('button', 'Enregistrer').click();

      cy.wait('@createStudent');
      cy.get('.alert-danger').should('contain.text', message);
      cy.location('pathname').should('eq', '/students/new');
      cy.contains('button', 'Enregistrer').should('not.be.disabled');
    });
  });

  it('signale un serveur injoignable', () => {
    cy.intercept({ method: 'POST', ...API_STUDENTS }, { forceNetworkError: true }).as('createStudent');
    fill('Jeanne', 'Durand', 'jeanne.durand@example.test');

    cy.contains('button', 'Enregistrer').click();

    cy.get('.alert-danger').should('contain.text', 'Serveur injoignable. Veuillez réessayer plus tard.');
  });

  it('le bouton Annuler revient à la liste sans appeler l\'API', () => {
    cy.contains('button', 'Annuler').click();

    cy.location('pathname').should('eq', '/students');
    cy.get('@createStudent.all').should('have.length', 0);
  });
});

describe('Modification d\'un étudiant (/students/:id/edit)', () => {
  beforeEach(() => {
    stubStudentsApi(students);
  });

  it('préremplit le formulaire depuis la liste', () => {
    visitAsLoggedIn('/students');

    cy.contains('tbody tr', 'Louis').contains('a', 'Modifier').click();

    cy.location('pathname').should('eq', '/students/2/edit');
    cy.contains('.card-header', 'Modifier un étudiant');
    cy.get('input[formControlName="firstName"]').should('have.value', 'Louis');
    cy.get('input[formControlName="lastName"]').should('have.value', 'Martin');
    cy.get('input[formControlName="email"]').should('have.value', 'louis.martin@example.test');
  });

  it('enregistre les modifications (PUT), redirige et met la liste à jour', () => {
    visitAsLoggedIn('/students/2/edit');
    cy.get('input[formControlName="lastName"]').should('have.value', 'Martin');

    cy.get('input[formControlName="lastName"]').clear().type('Martin-Durand');
    cy.contains('button', 'Enregistrer').click();

    cy.wait('@updateStudent').then(({ request }) => {
      expect(request.url).to.match(/\/api\/students\/2$/);
      expect(request.body).to.deep.equal({
        firstName: 'Louis', lastName: 'Martin-Durand', email: 'louis.martin@example.test',
      });
    });
    cy.location('pathname').should('eq', '/students');
    cy.contains('tbody tr', 'Martin-Durand');
    cy.get('tbody tr').should('have.length', 3);
  });

  it('refuse un formulaire invalide sans appeler l\'API', () => {
    visitAsLoggedIn('/students/2/edit');
    cy.get('input[formControlName="firstName"]').should('have.value', 'Louis');

    cy.get('input[formControlName="firstName"]').clear();
    cy.get('input[formControlName="email"]').clear().type('invalide');
    cy.contains('button', 'Enregistrer').click();

    cy.contains('Le prénom est obligatoire');
    cy.contains("Le format de l'e-mail est invalide");
    cy.get('@updateStudent.all').should('have.length', 0);
  });

  it('affiche « Étudiant introuvable. » quand l\'étudiant n\'existe pas (404)', () => {
    visitAsLoggedIn('/students/999/edit');

    cy.get('.alert-danger').should('contain.text', 'Étudiant introuvable.');
  });

  it('affiche une erreur pour un identifiant non numérique', () => {
    visitAsLoggedIn('/students/abc/edit');

    cy.get('.alert-danger').should('contain.text', "Identifiant d'étudiant invalide.");
    cy.get('@getStudent.all').should('have.length', 0);
  });

  it('affiche une erreur de conflit (409) à l\'enregistrement et reste sur la page', () => {
    visitAsLoggedIn('/students/2/edit');
    cy.get('input[formControlName="firstName"]').should('have.value', 'Louis');
    cy.intercept({ method: 'PUT', ...API_STUDENT }, { statusCode: 409, body: {} }).as('updateStudent');

    cy.contains('button', 'Enregistrer').click();

    cy.wait('@updateStudent');
    cy.get('.alert-danger').should('contain.text', 'Un étudiant avec cet e-mail existe déjà.');
    cy.location('pathname').should('eq', '/students/2/edit');
  });
});

describe('Suppression d\'un étudiant', () => {
  beforeEach(() => {
    stubStudentsApi(students);
    visitAsLoggedIn('/students');
    cy.get('tbody tr').should('have.length', 3);
  });

  it('demande confirmation, supprime l\'étudiant (DELETE) et recharge la liste', () => {
    const confirmStub = cy.stub().as('confirm').returns(true);
    cy.on('window:confirm', confirmStub);

    cy.contains('tbody tr', 'Louis').contains('button', 'Supprimer').click();

    cy.get('@confirm').should('have.been.calledWith', 'Supprimer Louis Martin ?');
    cy.wait('@deleteStudent').its('request.url').should('match', /\/api\/students\/2$/);
    cy.get('tbody tr').should('have.length', 2);
    cy.contains('tbody tr', 'Louis').should('not.exist');
  });

  it('ne supprime rien quand l\'utilisateur annule la confirmation', () => {
    cy.on('window:confirm', () => false);

    cy.contains('tbody tr', 'Louis').contains('button', 'Supprimer').click();

    cy.get('@deleteStudent.all').should('have.length', 0);
    cy.get('tbody tr').should('have.length', 3);
  });

  it('affiche une erreur et conserve la ligne quand la suppression échoue', () => {
    cy.on('window:confirm', () => true);
    cy.intercept({ method: 'DELETE', ...API_STUDENT }, { statusCode: 500, body: {} }).as('deleteStudent');

    cy.contains('tbody tr', 'Louis').contains('button', 'Supprimer').click();

    cy.wait('@deleteStudent');
    cy.get('.alert-danger').should('contain.text', 'La suppression a échoué. Veuillez réessayer.');
    cy.get('tbody tr').should('have.length', 3);
  });
});

describe('Déconnexion', () => {
  it('supprime le JWT, redirige vers /login et protège de nouveau /students', () => {
    stubStudentsApi(students);
    visitAsLoggedIn('/students');
    cy.get('tbody tr').should('have.length', 3);

    cy.contains('button', 'Déconnexion').click();

    cy.location('pathname').should('eq', '/login');
    cy.window().its('sessionStorage').invoke('getItem', TOKEN_KEY).should('be.null');

    cy.visit('/students');
    cy.location('pathname').should('eq', '/login');
  });
});
