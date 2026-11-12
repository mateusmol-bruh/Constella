/**
 * Impede que o estado de carregamento desapareça antes de a animação ser vista.
 * Em modo demonstração, leituras e gravações locais são quase instantâneas.
 * O tempo mínimo é aplicado somente quando a operação demora menos que ele;
 * não substitui a chamada real nem estende operações já demoradas.
 */
export const MIN_LOADING_MS = 900;

export async function withVisibleLoading(operation, minimumMs = MIN_LOADING_MS) {
  const startedAt = Date.now();
  try {
    return await operation();
  } finally {
    const remaining = minimumMs - (Date.now() - startedAt);
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
  }
}
