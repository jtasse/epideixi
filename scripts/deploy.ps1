# Epideixi SAM deploy wrapper: reads Google OAuth from SSM SecureString, then sam build/deploy.
# Usage (from repo root): .\scripts\deploy.ps1
#   .\scripts\deploy.ps1 -SkipBuild
# See docs/deployment.md.

param(
    [switch]$SkipBuild,
    [Parameter()][string]$Region = '',
    [Parameter()][string]$GoogleClientIdSsmName = 'epideixi_google_client_id',
    [Parameter()][string]$GoogleClientSecretSsmName = 'epideixi_google_client_secret',
    [Parameter()][string]$CognitoSesSourceArnSsmName = 'epideixi_cognito_ses_source_arn',
    [Parameter()][string]$CognitoEmailFromSsmName = 'epideixi_cognito_email_from',
    [Parameter()][string]$ExtraParameterOverrides = '',
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$SamDeployArgs = @()
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $RepoRoot

function Enable-DotNet8OnPath {
    # global.json requires SDK 8.x; sam uses whatever `dotnet` is first on PATH (often only 6/7 under Program Files).
    $candidates = @(
        (Join-Path $env:USERPROFILE 'AppData\Local\Microsoft\dotnet'),
        (Join-Path $RepoRoot '.dotnet')
    )
    foreach ($dir in $candidates) {
        $dotnetExe = Join-Path $dir 'dotnet.exe'
        if (-not (Test-Path $dotnetExe)) { continue }
        $sdks = & $dotnetExe --list-sdks 2>$null
        if ($sdks -match '8\.') {
            $env:DOTNET_ROOT = $dir
            $env:PATH = "$dir;$dir\tools;$env:PATH"
            Write-Host "Using .NET 8 SDK from $dir"
            return
        }
    }
    Write-Warning @'
.NET 8 SDK not found on PATH. Install it, then rerun deploy:
  .\dotnet-install.ps1 -Channel 8.0 -Quality GA
  or: winget install Microsoft.DotNet.SDK.8
'@
}

Enable-DotNet8OnPath

if (-not $Region) {
    $Region = if ($env:AWS_REGION) { $env:AWS_REGION } elseif ($env:AWS_DEFAULT_REGION) { $env:AWS_DEFAULT_REGION } else { 'us-east-1' }
}

function Get-SsmSecureParameter {
    param([string]$Name)
    aws ssm get-parameter --name $Name --with-decryption --region $Region --query 'Parameter.Value' --output text
}

function Get-SsmParameterOptional {
    param([string]$Name)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        $value = aws ssm get-parameter --name $Name --with-decryption --region $Region --query 'Parameter.Value' --output text 2>$null
        if ($LASTEXITCODE -ne 0) { return $null }
        if ([string]::IsNullOrWhiteSpace($value)) { return $null }
        return $value.Trim()
    }
    finally {
        $ErrorActionPreference = $prev
    }
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

$sesSourceArn = Get-SsmParameterOptional -Name $CognitoSesSourceArnSsmName
$cognitoEmailFrom = Get-SsmParameterOptional -Name $CognitoEmailFromSsmName
if ($sesSourceArn -and $cognitoEmailFrom) {
    $parameters['CognitoSesSourceArn'] = $sesSourceArn
    $parameters['CognitoEmailFrom'] = $cognitoEmailFrom
    Write-Host "Cognito verification email: SES ($CognitoSesSourceArnSsmName)."
}
elseif ($sesSourceArn -or $cognitoEmailFrom) {
    Write-Warning "Both $CognitoSesSourceArnSsmName and $CognitoEmailFromSsmName must be set to enable SES; deploy will use Cognito default mail (higher spam risk)."
}
else {
    Write-Warning 'Cognito verification email: default sender (no-reply@verificationemail.com). For better deliverability, configure SES — see docs/deployment.md.'
}

$overridesFile = Join-Path $RepoRoot '.sam-deploy-overrides.yaml'
try {
    $yamlLines = foreach ($key in ($parameters.Keys | Sort-Object)) {
        '{0}: {1}' -f $key, (Escape-YamlDoubleQuoted -Value $parameters[$key])
    }
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($overridesFile, ($yamlLines -join "`n") + "`n", $utf8NoBom)
    $overridesUri = 'file://' + ($overridesFile -replace '\\', '/')

    $SamDeployArgs = @($SamDeployArgs | Where-Object { $_ -and $_ -ne '--' })

    if (-not $SkipBuild) {
        Write-Host 'Running sam build...'
        sam build
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }

    Write-Host 'Running sam deploy (parameter overrides from samconfig.toml + SSM Google creds)...'
    $samArgs = @('deploy') + $SamDeployArgs + @('--parameter-overrides', $overridesUri)
    & sam @samArgs
    $exitCode = $LASTEXITCODE
}
finally {
    if (Test-Path $overridesFile) {
        Remove-Item -Path $overridesFile -Force -ErrorAction SilentlyContinue
    }
}

exit $exitCode
