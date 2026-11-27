import codeCoverageTask from '@cypress/code-coverage/task';
import { defineConfig } from 'cypress';

// Les tests E2E pilotent l'application Angular lancée par `ng serve` (port 4200).
// Toutes les requêtes /api/** sont simulées avec cy.intercept() : le vrai back-end n'est jamais appelé.
export default defineConfig({
  // Couverture désactivée par défaut ; `npm run e2e:coverage` l'active avec --expose coverage=true.
  expose: {
    coverage: false,
    // Seul le front-end est mesuré : le plugin n'interroge aucun back-end.
    codeCoverage: { expectFrontendCoverageOnly: true },
  },
  e2e: {
    setupNodeEvents(on, config) {
      if (config.expose['coverage'] === true) {
        codeCoverageTask(on, config);
      }
      return config;
    },
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: 'cypress/fixtures',
    video: false,
    defaultCommandTimeout: 6000,
  },
});
