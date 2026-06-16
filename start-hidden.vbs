' Inicia o PM2 Dashboard sem abrir nenhuma janela de terminal
Dim shell
Set shell = CreateObject("WScript.Shell")
shell.Run "cmd /c pm2 start ecosystem.config.js", 0, False
Set shell = Nothing
