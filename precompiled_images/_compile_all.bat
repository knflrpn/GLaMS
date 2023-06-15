@echo off
for %%i in (*.gif) do (
	echo "%%i"
    gif2mm2.exe "%%i" 2 6 1.5
    gif2mm2.exe "%%i" 2 6 1.8
    gif2mm2.exe "%%i" 2 6 2.0
)
