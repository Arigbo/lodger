# Firebase App Hosting Secrets Setup Script
# This script reads your .env file and creates secrets in Firebase

Write-Host "Setting up Firebase App Hosting Secrets..." -ForegroundColor Green
Write-Host ""

# Read .env file
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
        Write-Host "Setting $secretName..." -ForegroundColor Cyan
        
        # Create a temporary file with the secret value
        $tempFile = New-TemporaryFile
        $secrets[$secretName] | Out-File -FilePath $tempFile.FullName -NoNewline -Encoding utf8
        
        # Set the secret using Firebase CLI
        $output = firebase apphosting:secrets:set $secretName --data-file=$($tempFile.FullName) 2>&1
        
        # Clean up temp file
        Remove-Item $tempFile.FullName
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ $secretName set successfully" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Failed to set $secretName" -ForegroundColor Red
            Write-Host "  Error: $output" -ForegroundColor Red
        }
    } else {
        Write-Host "  ⚠ $secretName not found in .env file" -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host "Done! All secrets have been configured." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Commit and push your changes:"
Write-Host "   git add apphosting.yaml src/ai/genkit.ts"
Write-Host "   git commit -m 'fix: configure environment variables for deployment'"
Write-Host "   git push"
Write-Host ""
Write-Host "2. Firebase will automatically redeploy with the new configuration"
