type VercelRequest = {
  method?: string
  body?: unknown
}

type VercelResponse = {
  status: (statusCode: number) => VercelResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

async function readLocalEnvValue(key: string) {
  if (process.env.NODE_ENV === 'production') {
    return undefined
  }

  try {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const envPath = path.join(process.cwd(), '.env.local')

    if (!fs.existsSync(envPath)) {
      return undefined
    }

    const envFile = fs.readFileSync(envPath, 'utf8')
    const line = envFile
      .split(/\r?\n/)
      .find((entry) => entry.trim().startsWith(`${key}=`))

    if (!line) {
      return undefined
    }

    return line.slice(line.indexOf('=') + 1).trim()
  } catch {
    return undefined
  }
}

function getSubmittedCode(body: unknown) {
  if (!body) {
    return ''
  }

  if (typeof body === 'string') {
    try {
      const parsedBody = JSON.parse(body) as { code?: unknown }
      return typeof parsedBody.code === 'string' ? parsedBody.code : ''
    } catch {
      return ''
    }
  }

  if (typeof body === 'object' && 'code' in body) {
    const code = (body as { code?: unknown }).code
    return typeof code === 'string' ? code : ''
  }

  return ''
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    response.status(405).json({ ok: false })
    return
  }

  const managerCode =
    process.env.MANAGER_CODE ?? (await readLocalEnvValue('MANAGER_CODE'))

  if (!managerCode) {
    response
      .status(500)
      .json({ ok: false, error: 'Manager code is not configured.' })
    return
  }

  const submittedCode = getSubmittedCode(request.body).trim()

  if (submittedCode && submittedCode === managerCode) {
    response.status(200).json({ ok: true })
    return
  }

  response.status(401).json({ ok: false })
}
