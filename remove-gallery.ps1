# Remove lines 458-470 from the property page
$file = "src\app\student\properties\[id]\page.tsx"
$lines = Get-Content $file
$newLines = $lines[0..456] + $lines[471..($lines.Length-1)]
$newLines | Set-Content $file -Encoding UTF8
Write-Host "Removed standalone gallery section (lines 458-470)"
