# Epideixi SAM deploy wrapper: reads Google OAuth from SSM SecureString, then sam build/deploy.
# Usage (from repo root): .\scripts\deploy.ps1
#   .\scripts\deploy.ps1 -SkipBuild
#   .\scripts\deploy.ps1 -- --no-confirm-changeset
# See docs/deployment.md.

param(
    [switch]$SkipBuild,
    [string]$Region = '',
    [string]$GoogleClientIdSsmName = 'epideixi_google_client_id',
    [string]$GoogleClientSecretSsmName = 'epideixi_google_client_secret',
    [string]$ExtraParameterOverrides = '',
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$SamDeployArgs
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $RepoRoot

if (-not $Region) {
    $Region = if ($env:AWS_REGION) { $env:AWS_REGION } elseif ($env:AWS_DEFAULT_REGION) { $env:AWS_DEFAULT_REGION } else { 'us-east-1' }
}

function Get-SsmSecureParameter {
    param([string]$Name)
    aws ssm get-parameter `
        --name $Name `
        --with-decryption `
        --region $Region `
        --query 'Parameter.Value' `
        --output text
}

function Escape-SamParameterValue {
    param([string]$Value)
    # SAM parameter-overrides: wrap values that contain spaces in quotes.
    if ($Value -match '[\s"]') {
        return '"' + ($Value -replace '"', '\"') + '"'
    }
    return $Value
}

Write-Host "Reading Google OAuth from SSM ($Region): $GoogleClientIdSsmName, $GoogleClientSecretSsmName"
$googleClientId = Get-SsmSecureParameter -Name $GoogleClientIdSsmName
$googleClientSecret = Get-SsmSecureParameter -Name $GoogleClientSecretSsmName

if ([string]::IsNullOrWhiteSpace($googleClientId) -or [string]::IsNullOrWhiteSpace($googleClientSecret)) {
    throw "Both SSM parameters must exist (SecureString or String) and be non-empty. See docs/deployment.md."
}

$parameterOverrides = @(
    "GoogleClientId=$(Escape-SamParameterValue $googleClientId)",
    "GoogleClientSecret=$(Escape-SamParameterValue $googleClientSecret)"
) -join ' '

if ($ExtraParameterOverrides) {
    $parameterOverrides = "$parameterOverrides $ExtraParameterOverrides"
}

$SamDeployArgs = @($SamDeployArgs | Where-Object { $_ -and $_ -ne '--' })

if (-not $SkipBuild) {
    Write-Host 'Running sam build...'
    sam build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host 'Running sam deploy (Google credentials passed as deploy-time parameters, not stored in git)...'
sam deploy @SamDeployArgs --parameter-overrides $parameterOverrides
exit $LASTEXITCODE
