// Serveur de développement Angular qui instrumente le code de `src/` avec Istanbul.
//
// ATTENTION : ce fichier s'appuie sur `instrumentForCoverage`, une option INTERNE de
// @angular/build (celle qu'Angular utilise pour la couverture Karma). Elle n'est pas garantie
// d'une version à l'autre : après une montée de version d'Angular, relancer `npm run e2e:coverage`
// et vérifier que le rapport est toujours produit. Testé avec @angular/build 19.2.16.
const path = require('node:path');
const { createBuilder } = require('@angular-devkit/architect');
const { executeDevServerBuilder } = require('@angular/build');

/** Retourne true pour les fichiers de l'application : dans `src/`, hors tests unitaires. */
function isApplicationSource(sourceRoot, file) {
  const relative = path.relative(sourceRoot, file);
  const insideSources = !relative.startsWith('..') && !path.isAbsolute(relative);
  return insideSources && !file.endsWith('.spec.ts');
}

async function* serveWithCoverage(options, context) {
  const project = await context.getProjectMetadata(context.target.project);
  const sourceRoot = path.join(context.workspaceRoot, project.sourceRoot ?? 'src');
  const instrumentedFiles = new Set();

  // Angular appelle ce filtre pour chaque fichier TypeScript compilé.
  const instrumentForCoverage = file => {
    const instrument = isApplicationSource(sourceRoot, file);
    if (instrument) {
      instrumentedFiles.add(file);
    }
    return instrument;
  };

  // Une fonction ne peut pas s'écrire dans angular.json : on l'ajoute aux options de build
  // au moment où le serveur de développement les valide.
  const coverageContext = {
    ...context,
    async validateOptions(rawOptions, builderName) {
      const buildOptions = await context.validateOptions(rawOptions, builderName);
      // Sans source maps, Angular n'instrumente pas le TypeScript (isolatedModules).
      if (buildOptions.sourceMap !== true && !buildOptions.sourceMap?.scripts) {
        throw new Error('La couverture exige `sourceMap: true` dans la cible de build.');
      }
      return { ...buildOptions, instrumentForCoverage };
    },
  };

  // `prebundle: false` : le cache Vite de `.angular/` reste réservé à `npm start`,
  // qui peut tourner en même temps sur le port 4200.
  const serverOptions = { ...options, prebundle: false };

  for await (const result of executeDevServerBuilder(serverOptions, coverageContext)) {
    // Échec explicite plutôt qu'un serveur qui fonctionne sans mesurer quoi que ce soit.
    if (result.success && instrumentedFiles.size === 0) {
      throw new Error('Aucun fichier instrumenté : vérifier la compatibilité avec @angular/build.');
    }
    if (result.success) {
      context.logger.info(`Couverture : ${instrumentedFiles.size} fichiers TypeScript instrumentés.`);
    }
    yield result;
  }
}

module.exports = createBuilder(serveWithCoverage);
