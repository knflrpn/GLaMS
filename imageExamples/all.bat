@echo off
for %%i in (*.gif) do (
	echo "%%i"
    gif2mm2_2.exe "%%i" 2 11
)
