import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
import { createRouterClient } from '@orpc/server'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { router } from './routers/_index'
import { BatchLinkPlugin, RetryLinkPlugin } from '@orpc/client/plugins'

async function createHeaders() {
  const timestamp = Math.floor(Date.now() / 1000).toString()

  const encoder = new TextEncoder()

  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(timestamp),
  )

  const signature = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return {
    timestamp,
    signature,
  }
}

const getORPCClient = createIsomorphicFn()
  .server(() =>
    createRouterClient(router, {
      context: async () => {
        const requestHeaders = getRequestHeaders()
        const signatureHeaders = await createHeaders()
        const headers = new Headers(requestHeaders)
        headers.set('timestamp', signatureHeaders.timestamp)
        headers.set('signature', signatureHeaders.signature)

        return { headers }
      },
    }),
  )
  .client((): RouterClient<typeof router> => {
    const link = new RPCLink({
      origin: () => {
        if (typeof window === 'undefined') {
          throw new Error('This link is not allowed on the server side.')
        }
        return window.location.origin
      },
      url: '/api/rpc',
      headers: createHeaders,
      plugins: [
        new BatchLinkPlugin({
          groups: [
            {
              condition: () => true,
              context: {},
            },
          ],
        }),
        new RetryLinkPlugin({
          default: {
            retry: 3,
            retryDelay: (o) => o.lastEventRetry ?? 2000,
            shouldRetry: () => true,
          },
        }),
      ],
    })
    return createORPCClient(link)
  })

export const client: RouterClient<typeof router> = getORPCClient()

export const rpc = createTanstackQueryUtils(client)
