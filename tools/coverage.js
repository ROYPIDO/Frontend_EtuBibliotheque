// Outils de couverture E2E.
//   node tools/coverage.js clean   -> efface les données et les rapports du lancement précédent
//   node tools/coverage.js report  -> génère les rapports à partir de .nyc_output/out.json
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const rawData = path.join(root, '.nyc_output');
const outputDir = path.join(root, 'coverage-e2e');

// Les trois périmètres sont toujours produits : rien n'est masqué.
const scopes = [
  { folder: 'typescript', title: 'TypeScript', include: ['src/**/*.ts'] },
  { folder: 'templates', title: 'Templates Angular (.html)', include: ['src/**/*.html'] },
  { folder: 'complet', title: 'Ensemble (TypeScript + templates)', include: ['src/**/*.ts', 'src/**/*.html'] },
];

function clean() {
  // Sans ce nettoyage, les compteurs d'un ancien lancement s'ajouteraient aux nouveaux.
  fs.rmSync(rawData, { recursive: true, force: true });
  fs.rmSync(outputDir, { recursive: true, force: true });
}

function report() {
  const rawFile = path.join(rawData, 'out.json');
  if (!fs.existsSync(rawFile) || Object.keys(JSON.parse(fs.readFileSync(rawFile, 'utf8'))).length === 0) {
    throw new Error('Aucune donnée de couverture : l\'application testée n\'était pas instrumentée.');
  }

  const nyc = require.resolve('nyc/bin/nyc.js');
  for (const { folder, title, include } of scopes) {
    const reportDir = path.join(outputDir, folder);
    const text = execFileSync(process.execPath, [
      nyc,
      'report',
      `--report-dir=${reportDir}`,
      ...include.map(pattern => `--include=${pattern}`),
      '--reporter=html',
      '--reporter=lcovonly',
      '--reporter=text',
      '--reporter=text-summary',
    ], { cwd: root, encoding: 'utf8' });

    fs.writeFileSync(path.join(reportDir, 'coverage.txt'), text);
    console.log(`\n===== Couverture E2E : ${title} =====\n${text}`);
  }
  console.log('Rapports HTML : coverage-e2e/<typescript|templates|complet>/index.html');
}

const commands = { clean, report };
const command = commands[process.argv[2]];
if (!command) {
  console.error('Usage : node tools/coverage.js <clean|report>');
  process.exit(1);
}
command();
