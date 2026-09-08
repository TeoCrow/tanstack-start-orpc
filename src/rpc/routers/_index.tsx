import { os } from '@orpc/server'

export const router = {
  health: os.handler(async () => {
    return { status: 'ok' }
  }),
  system: {
    getServerTime: os.handler(async () => {
      return {
        serverTime: new Date(),
        timeZone: 'Asia/Makassar',
      }
    }),
  },
}
