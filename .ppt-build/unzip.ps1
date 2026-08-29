param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
$mode = $Args[0]
$archive = $Args[1]
if ($mode -eq '-Z1') {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($archive)
  try {
    $zip.Entries | ForEach-Object { [Console]::Out.WriteLine($_.FullName) }
  } finally {
    $zip.Dispose()
  }
  exit 0
}
if ($mode -eq '-p') {
  $entryName = $Args[2]
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($archive)
  try {
    $entry = $zip.GetEntry($entryName)
    if ($null -eq $entry) { exit 1 }
    $stream = $entry.Open()
    try { $stream.CopyTo([Console]::OpenStandardOutput()) } finally { $stream.Dispose() }
  } finally { $zip.Dispose() }
  exit 0
}
exit 1
