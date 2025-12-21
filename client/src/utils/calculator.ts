
export function evaluateExpression(expression: string): number {
  // Remove any whitespace
  const cleanExpr = expression.replace(/\s+/g, '');

  // Validate characters: only digits, dots, and operators
  if (!/^[\d.+\-*/]+$/.test(cleanExpr)) {
    return NaN;
  }

  // Prevent double operators (except maybe negative numbers, but for this simple numpad we might avoid negative start)
  if (/[\+\-\*\/]{2,}/.test(cleanExpr)) {
    // If we want to be robust, we might handle it, but for a simple UI, we usually prevent entering it.
    // If it comes here, it's an error.
    return NaN;
  }

  try {
    // Use Function constructor for evaluation, which is safer than direct eval()
    // because it executes in global scope and we've already validated the charset.
    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${cleanExpr}`)();

    if (!isFinite(result) || isNaN(result)) {
      return NaN;
    }

    return result;
  } catch (e) {
    return NaN;
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
}
