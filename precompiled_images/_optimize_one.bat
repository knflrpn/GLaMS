@echo off
setlocal enabledelayedexpansion

set "gifFilename=%~1"

gif2mm2.exe !gifFilename! 2 5 1.0
gif2mm2.exe !gifFilename! 2 5 1.1
gif2mm2.exe !gifFilename! 2 5 1.2
gif2mm2.exe !gifFilename! 2 5 1.3
gif2mm2.exe !gifFilename! 2 5 1.4
gif2mm2.exe !gifFilename! 2 5 1.5
gif2mm2.exe !gifFilename! 2 5 1.6
gif2mm2.exe !gifFilename! 2 5 1.7
gif2mm2.exe !gifFilename! 2 5 1.8
gif2mm2.exe !gifFilename! 2 5 1.9
gif2mm2.exe !gifFilename! 2 5 2.0

endlocal
