@echo off
for %%f in (*.txt) do python _convert_format.py "%%f" "./converted/%%f"
