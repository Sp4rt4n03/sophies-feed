# Genereert de feed lokaal, zonder iets naar Pinterest te sturen.
#   .\run-local.ps1                 -> alle actieve producten
#   .\run-local.ps1 -Tag bestseller -> alleen die tag
#   .\run-local.ps1 -Max 40         -> maximaal 40 producten
#   .\run-local.ps1                 -> alle actieve producten
#   .\run-local.ps1 -Max 50         -> maximaal 50 producten
#   .\run-local.ps1 -Tag bestseller -> alleen die tag
param(
  [string]$Tag = "",
  [int]$Max = 0
)

. "$PSScriptRoot\secrets.local.ps1"
$env:FEED_TAG = $Tag
$env:MAX_PRODUCTS = $Max
$env:OUT = "$PSScriptRoot\pinterest-feed.tsv"

node "$PSScriptRoot\pinterest-feed.mjs"
