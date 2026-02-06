# Script de Limpeza Completa - AmaPlay
# Execute este script para limpar todo o cache do projeto

Write-Host "🧹 Iniciando limpeza completa do cache..." -ForegroundColor Cyan
Write-Host ""

# 1. Limpar cache do NPM
Write-Host "📦 Limpando cache do NPM..." -ForegroundColor Yellow
npm cache clean --force
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Cache do NPM limpo com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao limpar cache do NPM" -ForegroundColor Red
}
Write-Host ""

# 2. Remover pasta dist
Write-Host "🗑️  Removendo pasta dist..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force dist
    Write-Host "✅ Pasta dist removida com sucesso!" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Pasta dist não encontrada (já estava limpa)" -ForegroundColor Gray
}
Write-Host ""

# 3. Remover pasta .vite (cache do Vite)
Write-Host "🗑️  Removendo cache do Vite..." -ForegroundColor Yellow
if (Test-Path "node_modules/.vite") {
    Remove-Item -Recurse -Force "node_modules/.vite"
    Write-Host "✅ Cache do Vite removido com sucesso!" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Cache do Vite não encontrado (já estava limpo)" -ForegroundColor Gray
}
Write-Host ""

# 4. Limpar cache do TypeScript
Write-Host "🗑️  Removendo cache do TypeScript..." -ForegroundColor Yellow
if (Test-Path "tsconfig.tsbuildinfo") {
    Remove-Item -Force "tsconfig.tsbuildinfo"
    Write-Host "✅ Cache do TypeScript removido!" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Cache do TypeScript não encontrado" -ForegroundColor Gray
}
Write-Host ""

# Resumo
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎉 Limpeza do projeto concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Yellow
Write-Host "  1. Limpe o cache do navegador (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "  2. Execute: npm run dev" -ForegroundColor White
Write-Host "  3. Recarregue a página com Ctrl+Shift+R" -ForegroundColor White
Write-Host ""
Write-Host "💡 Dica: Use o arquivo clear-browser-cache.js no console" -ForegroundColor Cyan
Write-Host "   do navegador para limpar localStorage e cookies" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
