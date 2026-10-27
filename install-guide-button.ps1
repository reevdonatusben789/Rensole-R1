# Run once: starts the Xbox-button listener at every login and starts it now.
$arg = "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$PSScriptRoot\guide-listener.ps1`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg
Register-ScheduledTask -TaskName 'DeckGuideListener' -Action $action -Trigger (New-ScheduledTaskTrigger -AtLogOn) -Force | Out-Null
Start-ScheduledTask -TaskName 'DeckGuideListener'
Write-Host 'Done. Press the Xbox button to open Deck.'
