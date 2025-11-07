const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const stagingDir = path.join(distDir, 'analisis-cualitativo-app');
const zipFile = path.join(distDir, 'analisis-cualitativo-app.zip');
const tarFile = path.join(distDir, 'analisis-cualitativo-app.tar.gz');

const assets = [
  { source: 'analisis_cualitativo', target: 'analisis_cualitativo' },
  { source: 'Imagenes', target: 'Imagenes' },
  { source: 'README.md', target: 'README.md' }
];

function copyAssets() {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(stagingDir, { recursive: true });

  for (const asset of assets) {
    const sourcePath = path.join(projectRoot, asset.source);
    const targetPath = path.join(stagingDir, asset.target);

    if (!fs.existsSync(sourcePath)) {
      console.warn(`Aviso: el recurso "${asset.source}" no existe y no se incluirá en el paquete.`);
      continue;
    }

    const stats = fs.statSync(sourcePath);
    if (stats.isDirectory()) {
      fs.cpSync(sourcePath, targetPath, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function createArchive(command, args, successMessage) {
  const result = spawnSync(command, args, { stdio: 'inherit', cwd: stagingDir });
  if (result.status === 0) {
    console.log(successMessage);
    return true;
  }
  return false;
}

function packageApp() {
  copyAssets();

  fs.rmSync(zipFile, { force: true });
  fs.rmSync(tarFile, { force: true });

  const zipCreated = createArchive('zip', ['-r', zipFile, '.'], `Paquete ZIP creado en ${zipFile}`);

  if (zipCreated) {
    return;
  }

  console.warn('No se pudo crear el ZIP. Intentando generar un TAR.GZ…');
  const tarCreated = createArchive('tar', ['-czf', tarFile, '.'], `Paquete TAR.GZ creado en ${tarFile}`);

  if (!tarCreated) {
    throw new Error('No se pudo generar un paquete comprimido. Asegúrate de tener instaladas las utilidades zip o tar.');
  }
}

packageApp();
