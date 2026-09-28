# Teste direto SyncPay (sem navegador/CORS) - gera 1 Pix real de R$29,90
# Uso: .\test-cashin.ps1 -Nome "Maria Silva" -Cpf "12345678900" -Email "maria@email.com" -Phone "11999999999"
param([string]$Nome = "Teste Silva", [string]$Cpf = "12345678900", [string]$Email = "", [string]$Phone = "")
$cpf11 = ($Cpf -replace '\D','')
if ([string]::IsNullOrWhiteSpace($Email)) { $Email = "$cpf11@pay.local" }
$ph = ($Phone -replace '\D','')
if ($ph.Length -lt 10) { $ph = '11999999999' }
$authBody = @{client_id='d39a5306-9c01-49b3-9072-10ed7e24cf9d'; client_secret='25c30f44-c04d-400a-9f8f-8292cf15b99e'; '01K1259MAXE0TNRXV2C2WQN2MV'='teste'} | ConvertTo-Json
$tok = Invoke-RestMethod -Uri 'https://api.syncpayments.com.br/api/partner/v1/auth-token' -Method Post -ContentType 'application/json' -Body $authBody -TimeoutSec 20
$headers = @{'Accept'='application/json'; 'Authorization'='Bearer '+$tok.access_token}
$cashBody = @{amount=29.90; description='Liberacao de saque'; webhook_url='https://seu-site.com/webhook'; client=@{name=$Nome; cpf=$cpf11; email=$Email; phone=$ph}} | ConvertTo-Json -Depth 5
$out = Invoke-RestMethod -Uri 'https://api.syncpayments.com.br/api/partner/v1/cash-in' -Method Post -ContentType 'application/json' -Headers $headers -Body $cashBody -TimeoutSec 20
$out | ConvertTo-Json -Depth 5
if ($out.pix_code) { Write-Output ""; Write-Output "PIX_CODE:"; Write-Output $out.pix_code }
