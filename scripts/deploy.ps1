# Epideixi SAM deploy wrapper: reads Google OAuth from SSM SecureString, then sam build/deploy.
# Usage (from repo root): .\scripts\deploy.ps1
#   .\scripts\deploy.ps1 -SkipBuild
# See docs/deployment.md.

param(
    [switch]$SkipBuild,
    [Parameter()][string]$Region = '',
    [Parameter()][string]$GoogleClientIdSsmName = 'epideixi_google_client_id',
    [Parameter()][string]$GoogleClientSecretSsmName = 'epideixi_google_client_secret',
    [Parameter()][string]$ExtraParameterOverrides = '',
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$SamDeployArgs = @()
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $RepoRoot

if (-not $Region) {
    $Region = if ($env:AWS_REGION) { $env:AWS_REGION } elseif ($env:AWS_DEFAULT_REGION) { $env:AWS_DEFAULT_REGION } else { 'us-east-1' }
}

function Get-SsmSecureParameter {
    param([string]$Name)
    aws ssm get-parameter --name $Name --with-decryption --region $Region --query 'Parameter.Value' --output text
}

function Get-SamConfigParameterOverridesString {
    $path = Join-Path $RepoRoot 'samconfig.toml'
    if (-not (Test-Path $path)) { return '' }
    $content = Get-Content $path -Raw
    if ($content -match '(?ms)\[default\.deploy\.parameters\][\s\S]*?parameter_overrides\s*=\s*"([^"]*)"') {
        return ($Matches[1] -replace '\\"', '"')
    }
    return ''
}

function Add-ParameterOverridesFromString {
    param([hashtable]$Target, [string]$Overrides)
    if ([string]::IsNullOrWhiteSpace($Overrides)) { return }
    $pattern = '(\w+)=("([^"]*)"|(\S+))'
    foreach ($match in [regex]::Matches($Overrides, $pattern)) {
        $name = $match.Groups[1].Value
        $value = if ($match.Groups[3].Success) { $match.Groups[3].Value } else { $match.Groups[4].Value }
        $Target[$name] = $value
    }
}

function Escape-YamlDoubleQuoted {
    param([string]$Value)
    '"' + ($Value -replace '\\', '\\\\' -replace '"', '\"') + '"'
}

Write-Host "Reading Google OAuth from SSM ($Region): $GoogleClientIdSsmName, $GoogleClientSecretSsmName"
$googleClientId = Get-SsmSecureParameter -Name $GoogleClientIdSsmName
$googleClientSecret = Get-SsmSecureParameter -Name $GoogleClientSecretSsmName

if ([string]::IsNullOrWhiteSpace($googleClientId) -or [string]::IsNullOrWhiteSpace($googleClientSecret)) {
    throw "Both SSM parameters must exist (SecureString or String) and be non-empty. See docs/deployment.md."
}

$parameters = @{}
Add-ParameterOverridesFromString -Target $parameters -Overrides (Get-SamConfigParameterOverridesString)
Add-ParameterOverridesFromString -Target $parameters -Overrides $ExtraParameterOverrides
$parameters['GoogleClientId'] = $googleClientId
$parameters['GoogleClientSecret'] = $googleClientSecret

$overridesFile = Join-Path $RepoRoot '.sam-deploy-overrides.yaml'
try {
    $yamlLines = foreach ($key in ($parameters.Keys | Sort-Object)) {
        '{0}: {1}' -f $key, (Escape-YamlDoubleQuoted -Value $parameters[$key])
    }
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($overridesFile, ($yamlLines -join "`n") + "`n", $utf8NoBom)
    $overridesUri = 'file:///' + ($overridesFile -replace '\\', '/')

    $SamDeployArgs = @($SamDeployArgs | Where-Object { $_ -and $_ -ne '--' })

    if (-not $SkipBuild) {
        Write-Host 'Running sam build...'
        sam build
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }

    Write-Host 'Running sam deploy (parameter overrides from samconfig.toml + SSM Google creds)...'
    $samArgs = @('deploy') + $SamDeployArgs + @('--parameter-overrides', $overridesUri)
    & sam @samArgs
    exit $LASTEXITCODE
}
finally {
    if (Test-Path $overridesFile) {
        Remove-Item -Path $overridesFile -Force
    }
}
