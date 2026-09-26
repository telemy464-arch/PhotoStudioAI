' PhotoStudio AI - Silent Launcher (No Black Console Window)
Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)

ExePath = ScriptDir & "\PhotoStudioAI.exe"
If Not FSO.FileExists(ExePath) Then
    ExePath = ScriptDir & "\dist\PhotoStudioAI\PhotoStudioAI.exe"
End If

If FSO.FileExists(ExePath) Then
    WshShell.CurrentDirectory = FSO.GetParentFolderName(ExePath)
    WshShell.Run """" & ExePath & """", 0, False
Else
    MsgBox "Could not find PhotoStudioAI.exe!", vbCritical, "PhotoStudio AI Error"
End If
