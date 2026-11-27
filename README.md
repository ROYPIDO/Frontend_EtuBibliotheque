# EtudiantFrontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.16.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Jest](https://jestjs.io/) test runner, use the following command:

```bash
jest
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Couverture de code des tests E2E (Cypress)

### Lancer la mesure

```bash
npm install
npm run e2e:coverage
```

La commande efface les anciens résultats, démarre un serveur Angular instrumenté sur le port **4300** (qui doit être libre), exécute les specs Cypress, puis génère les rapports :

| Dossier | Périmètre |
|---|---|
| `coverage-e2e/typescript/` | Fichiers `.ts` de `src/` |
| `coverage-e2e/templates/` | Templates Angular `.html` de `src/` |
| `coverage-e2e/complet/` | Les deux réunis |

Chaque dossier contient `index.html` (rapport HTML), `coverage.txt` (texte) et `lcov.info` (LCOV).
Les rapports Jest restent dans `coverage/`. `npm start` et `npm run e2e` ne sont pas instrumentés.

Si un test échoue, les rapports texte et LCOV ne sont pas générés.

### Fonctionnement

1. La cible `serve-coverage` d'`angular.json` utilise le builder local `tools/coverage-builder`, qui instrumente avec Istanbul les fichiers TypeScript de `src/` (hors `*.spec.ts`). Le serveur n'a pas de proxy : aucune requête n'atteint le back-end.
2. L'application instrumentée expose ses compteurs dans `window.__coverage__`.
3. `@cypress/code-coverage` les collecte après chaque test dans `.nyc_output/`. Il n'est actif qu'avec `--expose coverage=true`.
4. `tools/coverage.js` relie les compteurs aux sources avec `nyc` et produit les rapports.

### Risque : API interne d'Angular

L'instrumentation repose sur `instrumentForCoverage`, une option **interne et non documentée** de `@angular/build` (utilisée par Angular pour la couverture Karma). La documentation de `@cypress/code-coverage` propose à la place de passer à Webpack (`custom-webpack` + `babel-plugin-istanbul`) ; nous gardons ici le builder esbuild du projet.

- `@angular/build` et `@angular-devkit/architect` sont figés sur des versions exactes.
- Après une mise à jour d'Angular, mettre à jour ces versions en même temps que `@angular-devkit/build-angular`, puis relancer `npm run e2e:coverage`.
- Le serveur s'arrête avec une erreur si aucun fichier n'est instrumenté, et le rapport échoue si aucune donnée n'est collectée.

### Limites de la mesure

- La couverture indique le code **exécuté**, pas la qualité des assertions.
- Les API sont simulées avec `cy.intercept()` : le back-end n'est pas testé.
- Les chiffres des templates portent sur le code compilé par Angular puis relié au `.html` : un pourcentage d'instructions ou de branches ne correspond pas directement à des lignes de HTML.
- Le compilateur Angular ajoute des branches et des fonctions (décorateurs, fabriques) dont certaines ne peuvent pas être couvertes.
- Les fichiers que l'application n'importe pas (`user-mock.service.ts`) et les fichiers ne contenant que des types (`core/models`) sont absents du rapport.
- Les résultats Jest et E2E ne sont pas fusionnés et leurs totaux ne sont pas directement comparables (compilations différentes).

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
