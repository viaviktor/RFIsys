export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only initialize services on the server side
    const { initializeServices } = await import('@/lib/init')
    initializeServices()
  }
}