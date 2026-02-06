# Firebase App Hosting Secrets Setup Script
# This script reads your .env file and creates secrets in Firebase

Write-Host "Setting up Firebase App Hosting Secrets..." -ForegroundColor Green
Write-Host ""

# Check if Firebase CLI is installed
if (-not (Get-Command "firebase" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Firebase CLI is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install it with: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Read .env file
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found in current directory." -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

$envFile = Get-Content ".env"
$secrets = @{}

foreach ($line in $envFile) {
    if ($line -match "^([^=]+)=(.+)$") {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        $secrets[$key] = $value
    }
}

# List of secrets to create
$secretNames = @(
    "GOOGLE_GENAI_API_KEY",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "FIREBASE_PRIVATE_KEY",
    "FIREBASE_CLIENT_EMAIL"
)

Write-Host "Creating secrets in Firebase App Hosting..." -ForegroundColor Yellow
Write-Host ""

foreach ($secretName in $secretNames) {
    if ($secrets.ContainsKey($secretName)) {
        Write-Host "Working on $secretName..." -ForegroundColor Cyan
        
        # Create a temporary file with the secret value
        $tempFile = New-TemporaryFile
        $secrets[$secretName] | Out-File -FilePath $tempFile.FullName -NoNewline -Encoding utf8
        
        # Set the secret using Firebase CLI
        Write-Host "  Setting secret value..." -ForegroundColor Gray
        $setResult = firebase apphosting:secrets:set $secretName --data-file=$($tempFile.FullName) --force 2>&1
        
        # Clean up temp file
        if (Test-Path $tempFile.FullName) {
            Remove-Item $tempFile.FullName
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Secret set successfully" -ForegroundColor Green
            
            # Grant access to the secret for the 'studio' backend
            Write-Host "  Granting access to 'studio' backend..." -ForegroundColor Gray
            $grantResult = firebase apphosting:secrets:grantaccess $secretName --backend studio 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ Access granted successfully" -ForegroundColor Green
            }
            else {
                Write-Host "  ⚠ Warning: Could not grant access automatically." -ForegroundColor Yellow
                Write-Host "  $grantResult"
            }
        }
        else {
            Write-Host "  ✗ Failed to set $secretName" -ForegroundColor Red
            Write-Host "  $setResult" -ForegroundColor Red
        }
    }
    else {
        Write-Host "  ⚠ $secretName not found in .env file" -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host "Done! All secrets have been configured and access granted." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Commit and push your changes:"
Write-Host "   git add setup-firebase-secrets.ps1 src/firebase/server.ts apphosting.yaml"
Write-Host "   git commit -m 'fix: configure secrets and robust parsing'"
Write-Host "   git push"
Write-Host ""
Write-Host "2. Firebase will automatically redeploy with the new secrets and code."
