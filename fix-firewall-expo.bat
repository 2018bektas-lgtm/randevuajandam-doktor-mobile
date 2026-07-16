@echo off
:: Run as Administrator: right-click -> Run as administrator
echo Allowing Expo / Node.js inbound for phone testing...
netsh advfirewall firewall delete rule name="Expo Metro 8081" >nul 2>&1
netsh advfirewall firewall add rule name="Expo Metro 8081" dir=in action=allow protocol=TCP localport=8081 profile=any
netsh advfirewall firewall delete rule name="Expo Metro 19000" >nul 2>&1
netsh advfirewall firewall add rule name="Expo Metro 19000" dir=in action=allow protocol=TCP localport=19000 profile=any

:: Change existing Node.js Block rules to Allow
powershell -NoProfile -Command "Get-NetFirewallRule -DisplayName 'Node.js JavaScript Runtime' -ErrorAction SilentlyContinue | Where-Object { $_.Direction -eq 'Inbound' } | Set-NetFirewallRule -Action Allow -Profile Any"

echo.
echo Done. Now start Expo with:
echo   cd C:\xampp\htdocs\randevuajandam\randevuajandam-doktor-mobile
echo   npx expo start --lan
echo.
pause
