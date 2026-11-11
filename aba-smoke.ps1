$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:8000/api/v1'
$login = Invoke-RestMethod "$base/auth/login" -Method Post -ContentType 'application/json' -Body '{"email":"admin@ministore.local","password":"Admin123!"}' -SessionVariable sess
Write-Output "login OK role=$($login.user.role)"

$sales = Invoke-RestMethod "$base/sales?page_size=3" -WebSession $sess
Write-Output "sales list OK count=$($sales.total)"
$first = $sales.items[0]
Write-Output "sale sample: ref=$($first.reference) total=$($first.total) hasPaymentField=$($null -ne ($first.PSObject.Properties['payment_method']))"

$checkout = Invoke-RestMethod "$base/sales" -Method Post -ContentType 'application/json' -Headers @{ 'Idempotency-Key' = 'aba-smoke-001' } -WebSession $sess -Body (@{
    items = @(@{ product_id = (Invoke-RestMethod "$base/products?page_size=5&in_stock=true" -WebSession $sess).items[0].id; quantity = 1 })
    discount = 0
  } | ConvertTo-Json -Depth 5)
Write-Output "checkout OK ref=$($checkout.reference) total=$($checkout.total) hasPaymentField=$($null -ne ($checkout.PSObject.Properties['payment_method']))"

$today = Invoke-RestMethod "$base/daily-closes/today" -WebSession $sess
Write-Output "close preview: aba_sales=$($today.aba_sales) expenses=$($today.expenses) existing=$($null -ne $today.existing_close)"
$bd = $today.business_date
$close = Invoke-RestMethod "$base/daily-closes" -Method Post -ContentType 'application/json' -WebSession $sess -Body (@{ business_date = $bd; aba_balance = $today.aba_sales - 200; expenses = 200; notes = 'ABA smoke close' } | ConvertTo-Json)
Write-Output "close saved: variance=$($close.variance) aba_balance=$($close.aba_balance) hasCashFields=$($null -ne ($close.PSObject.Properties['cash_sales']))"

$dash = Invoke-RestMethod "$base/dashboard/summary" -WebSession $sess
Write-Output "dashboard: aba_total=$($dash.aba_total) hasCashTotal=$($null -ne ($dash.PSObject.Properties['cash_total']))"

try {
  Invoke-RestMethod "$base/reports/payment-mix" -WebSession $sess | Out-Null
  Write-Output "payment-mix: STILL EXISTS (bad)"
} catch {
  Write-Output "payment-mix removed: HTTP $($_.Exception.Response.StatusCode.value__)"
}

$rep = Invoke-RestMethod "$base/reports/sales?granularity=day" -WebSession $sess
Write-Output "reports/sales OK points=$($rep.Count)"
