$api='https://google-webfonts-helper.herokuapp.com/api/fonts/nunito?subsets=latin'
$json = Invoke-RestMethod -Uri $api
$dir = Join-Path (Get-Location) 'server/public/fonts'
if(-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
foreach($prop in $json.variants.PSObject.Properties) {
  $name = $prop.Name
  $files = $prop.Value.files
  if ($files.woff2) {
    if ($name -eq 'regular') { $weight = 400 } else { $weight = [int]$name }
    $fname = "Nunito-$weight.woff2"
    $out = Join-Path $dir $fname
    Write-Host "Downloading $($files.woff2) -> $out"
    Invoke-WebRequest -Uri $files.woff2 -OutFile $out -UseBasicParsing
  }
}
Write-Host "Done"
