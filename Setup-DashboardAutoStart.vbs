' Dashboard Auto-Start Setup Script (VBScript)
' Right-click this file and select "Run as Administrator"
' This will set up the Windows Task Scheduler task for dashboard auto-start

Dim objShell, objFSO, strScriptPath, strBatchPath, strCommand

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

strScriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
strBatchPath = strScriptPath & "\start-dashboard.bat"

' Check if batch file exists
If Not objFSO.FileExists(strBatchPath) Then
    MsgBox "Error: start-dashboard.bat not found at: " & strBatchPath, vbCritical, "Setup Failed"
    WScript.Quit(1)
End If

' Create the scheduled task using schtasks command
strCommand = "cmd.exe /c schtasks /create /tn ""E2E Dashboard Auto-Start"" /tr """ & strBatchPath & """ /sc onstart /delay 0000:30 /rl highest /f"

' Execute the command
On Error Resume Next
objShell.Run strCommand, 0, True
If Err.Number <> 0 Then
    MsgBox "Error creating task: " & Err.Description, vbCritical, "Setup Failed"
    WScript.Quit(1)
End If
On Error GoTo 0

MsgBox "✓ Dashboard auto-start task created successfully!" & vbCrLf & vbCrLf & _
    "The dashboard will automatically start when your system boots up." & vbCrLf & vbCrLf & _
    "Access the dashboard at: http://localhost:3000" & vbCrLf & vbCrLf & _
    "To view the task:" & vbCrLf & _
    "- Press Win+R and type: taskmgr" & vbCrLf & _
    "- Look for: E2E Dashboard Auto-Start", vbInformation, "Setup Complete"

WScript.Quit(0)
