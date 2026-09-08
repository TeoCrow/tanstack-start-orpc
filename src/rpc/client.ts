import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
import { createRouterClient } from '@orpc/server'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { router } from './routers/_index'
import { BatchLinkPlugin, RetryLinkPlugin } from '@orpc/client/plugins'

const getORPCClient = createIsomorphicFn()
  .server(() =>
    createRouterClient(router, {
      context: async () => ({
        headers: getRequestHeaders(),
      }),
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
