@echo off
TITLE CRM Top Brasil - Localhost
COLOR 0A
echo.
echo ==========================================
echo    INICIANDO CRM TOP BRASIL (LOCALHOST)
echo ==========================================
echo.
echo [1/2] Verificando dependencias...
if not exist node_modules (
    echo [!] node_modules nao encontrado. Instalando...
    call npm install
)
echo [2/2] Iniciando servidor Vite...
echo.
call npm run dev
pause
