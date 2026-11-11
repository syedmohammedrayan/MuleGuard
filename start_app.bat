@echo off
setlocal enabledelayedexpansion

:: Resolve root directory of the script
set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

echo ===================================================
echo   MuleGuard - Financial Forensics Platform
echo ===================================================
echo.

:: Detect Python virtual environment
set "PYTHON_EXE="
if exist "%ROOT_DIR%.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%ROOT_DIR%.venv\Scripts\python.exe"
    echo [OK] Using virtual environment at .venv
) else if exist "%ROOT_DIR%backend\venv\Scripts\python.exe" (
    set "PYTHON_EXE=%ROOT_DIR%backend\venv\Scripts\python.exe"
    echo [OK] Using virtual environment at backend\venv
) else (
    where python >nul 2>&1
    if !errorlevel! equ 0 (
        set "PYTHON_EXE=python"
        echo [WARN] Virtual environment not found; using system Python.
    ) else (
        echo [ERROR] Python is not installed or not in PATH.
        echo Please create a virtual environment (.venv) or install Python.
        pause
        exit /b 1
    )
)

:: Check for frontend node_modules
if not exist "%ROOT_DIR%frontend\node_modules" (
    echo [ERROR] Frontend dependencies are missing.
    echo Run 'npm install' inside the 'frontend' directory first.
    pause
    exit /b 1
)

:: Check npm availability
where npm >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] npm is not installed or not in PATH.
    pause
    exit /b 1
)

echo Starting backend on http://127.0.0.1:8001...
start "MuleGuard Backend (FastAPI)" cmd /k "cd /d "%ROOT_DIR%" && "!PYTHON_EXE!" -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8001 --reload"

echo Starting frontend on http://127.0.0.1:8080...
start "MuleGuard Frontend (Vite)" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

echo.
echo ===================================================
echo   MuleGuard services launched:
echo   - Backend:  http://127.0.0.1:8001
echo   - API Docs: http://127.0.0.1:8001/docs
echo   - Frontend: http://127.0.0.1:8080
echo ===================================================
echo.
pause
