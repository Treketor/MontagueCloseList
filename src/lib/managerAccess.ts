export type ManagerCodeVerificationResult = 'valid' | 'invalid' | 'unavailable'

export async function verifyManagerCodeStatus(
  code: string,
): Promise<ManagerCodeVerificationResult> {
  const trimmedCode = code.trim()

  if (!trimmedCode) {
    return 'invalid'
  }

  try {
    const response = await fetch('/api/verify-manager-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: trimmedCode }),
    })
    const contentType = response.headers.get('content-type') ?? ''

    if (!contentType.includes('application/json')) {
      return 'unavailable'
    }

    const data = (await response.json()) as { ok?: unknown }

    if (data.ok === true) {
      return 'valid'
    }

    return response.status === 401 ? 'invalid' : 'unavailable'
  } catch {
    return 'unavailable'
  }
}

export async function verifyManagerCode(code: string) {
  return (await verifyManagerCodeStatus(code)) === 'valid'
}
