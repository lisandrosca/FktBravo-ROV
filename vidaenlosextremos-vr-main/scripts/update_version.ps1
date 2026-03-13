$msg = git log -1 --pretty=format:"%s"
$hash = git log -1 --pretty=format:"%h"
$date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

$json = @{
    timestamp = $date
    message = $msg
    hash = $hash
} | ConvertTo-Json

$json | Out-File -FilePath "./data/version.json" -Encoding utf8
Write-Host "Build Base Hash set to: $hash ($msg)"
