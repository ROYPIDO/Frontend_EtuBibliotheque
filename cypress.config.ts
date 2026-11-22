import { defineConfig } from 'cypress';

// Les tests E2E pilotent l'application Angular lancée par `ng serve` (port 4200).
// Toutes les requêtes /api/** sont simulées avec cy.intercept() : le vrai back-end n'est jamais appelé.
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: 'cypress/fixtures',
    video: false,
    defaultCommandTimeout: 6000,
  },
});
