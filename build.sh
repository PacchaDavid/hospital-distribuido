#!/usr/bin/env bash
set -euo pipefail

echo "=== Instalando dependencias del servidor ==="
npm install

echo "=== Instalando dependencias del cliente ==="
cd client
npm install
cd ..

echo "=== Compilando frontend ==="
cd client
npm run build
cd ..

echo ""
echo "=== Build completo ==="
echo "Para iniciar el servidor: npm run start"
echo "Para desarrollo:        npm run dev"
