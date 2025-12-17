$cssUrl = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800&display=swap'
try {
  $resp = Invoke-WebRequest -Uri $cssUrl -UseBasicParsing -Headers @{ 'User-Agent' = 'Mozilla/5.0' }
} catch {
  Write-Error "Failed to fetch CSS: $_"
  exit 1
}
$css = $resp.Content
Write-Host "Fetched CSS length: $($css.Length)"
Write-Host "--- CSS preview ---"
Write-Host ($css.Substring(0, [Math]::Min(800, $css.Length)))
Write-Host "--- end preview ---"
$dir = Join-Path (Get-Location) 'server/public/fonts'
if(-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
[regex]$blockRx = '@font-face\s*{[^}]*}'
$blocks = [regex]::Matches($css, $blockRx)
if($blocks.Count -eq 0) { Write-Host 'No @font-face blocks found in CSS'; exit 0 }
foreach($b in $blocks) {
  $block = $b.Value
  $w = [regex]::Match($block, 'font-weight:\s*(\d+)').Groups[1].Value
  $uMatch = [regex]::Match($block, "url\((https:[^)]+\.(woff2|ttf))\)")
  $u = $uMatch.Groups[1].Value
  $ext = $uMatch.Groups[2].Value
  if($u) {
    $fname = "Nunito-$w.$ext"
    $out = Join-Path $dir $fname
    Write-Host "Downloading weight $w ($ext) -> $out"
    Invoke-WebRequest -Uri $u -OutFile $out -UseBasicParsing
  }
}
Write-Host 'Done'
