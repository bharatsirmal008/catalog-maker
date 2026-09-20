$ErrorActionPreference = 'Stop'
$env:ADMIN_SETUP_EMAIL = Read-Host 'Administrator email'
$adminPassword = Read-Host 'New password (at least 14 characters)' -AsSecureString
$adminPasswordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPassword)
try {
    $env:ADMIN_SETUP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($adminPasswordPointer)
    npm run admin:create
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($adminPasswordPointer)
    Remove-Item Env:ADMIN_SETUP_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:ADMIN_SETUP_EMAIL -ErrorAction SilentlyContinue
}
