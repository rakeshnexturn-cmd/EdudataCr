# Setup Dashboard Auto-Start Task
# Run this with Administrator privileges to create the scheduled task

$taskName = "E2E Dashboard Auto-Start"
$taskDescription = "Automatically starts the Salesforce E2E Test Dashboard on system startup"
$scriptPath = "C:\Users\Admin\Desktop\quick\start-dashboard.bat"

# Check if task already exists and remove it
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Removing existing task: $taskName" -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Start-Sleep -Seconds 1
}

# Create the task action (run the batch file)
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$scriptPath`"" -WorkingDirectory "C:\Users\Admin\Desktop\quick"

# Create the task trigger (run at system startup, 30 seconds after logon)
$trigger = New-ScheduledTaskTrigger -AtStartup
$trigger.Delay = "PT30S"  # 30 second delay to ensure system is fully ready

# Create task settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Create task principal (run with highest privileges)
$principal = New-ScheduledTaskPrincipal -UserID "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Register the scheduled task
try {
    $task = Register-ScheduledTask -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description $taskDescription `
        -Force
    
    Write-Host "✓ Scheduled task created successfully!" -ForegroundColor Green
    Write-Host "  Task Name: $taskName" -ForegroundColor Green
    Write-Host "  Trigger: At System Startup (30s delay)" -ForegroundColor Green
    Write-Host "  Run Level: Highest Privileges" -ForegroundColor Green
    Write-Host ""
    Write-Host "The dashboard will now auto-start on system restart and wake-up." -ForegroundColor Green
    Write-Host ""
    Write-Host "To view the task in Task Scheduler:" -ForegroundColor Cyan
    Write-Host "  1. Press Win+R and type: taskmgr" -ForegroundColor Cyan
    Write-Host "  2. Go to Services tab" -ForegroundColor Cyan
    Write-Host "  3. Look for: E2E Dashboard Auto-Start" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Dashboard will be available at: http://localhost:3000" -ForegroundColor Cyan
}
catch {
    Write-Host "✗ Error creating scheduled task: $_" -ForegroundColor Red
    Write-Host "Make sure you're running PowerShell as Administrator!" -ForegroundColor Yellow
}
