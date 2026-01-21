@echo off
echo Iniciando servidores do sistema financeiro...
pm2 resurrect
echo.
echo Servidores iniciados! Acesse http://localhost:3000
echo.
echo Para ver os logs: pm2 logs
echo Para parar: pm2 stop all
pause
