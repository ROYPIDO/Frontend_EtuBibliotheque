// Collecte de la couverture de code (inactive sauf avec --expose coverage=true).
import '@cypress/code-coverage/support';

// Filet de sécurité : toute requête /api/** non simulée par un test reçoit un 501
// et n'atteint jamais le vrai back-end (aucune donnée réelle ne peut être modifiée).
// Les cy.intercept() déclarés ensuite dans les tests sont prioritaires sur celui-ci.
beforeEach(() => {
  cy.intercept({ pathname: '/api/**' }, { statusCode: 501, body: 'Appel API non simulé dans ce test' })
    .as('unstubbedApi');
});
