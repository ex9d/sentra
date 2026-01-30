

type ThumbnailCallback = (url: string | null) => void

class ThumbnailBatchLoader {
  private cache = new Map<number, string>()
  private pending = new Map<number, ThumbnailCallback[]>()
  private queue = new Set<number>()
  private isProcessing = false
  private batchTimeout: ReturnType<typeof setTimeout> | null = null


  private readonly BATCH_SIZE = 100
  private readonly BATCH_DELAY = 100




  getCached(assetId: number): string | null {
    return this.cache.get(assetId) || null
  }




  isCached(assetId: number): boolean {
    return this.cache.has(assetId)
  }





  request(assetId: number, callback: ThumbnailCallback): () => void {

    if (this.cache.has(assetId)) {

      setTimeout(() => callback(this.cache.get(assetId)!), 0)
      return () => {}
    }


    if (!this.pending.has(assetId)) {
      this.pending.set(assetId, [])
    }
    this.pending.get(assetId)!.push(callback)
    this.queue.add(assetId)


    this.scheduleBatch()


    return () => {
      const callbacks = this.pending.get(assetId)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
          if (callbacks.length === 0) {
            this.pending.delete(assetId)
            this.queue.delete(assetId)
          }
        }
      }
    }
  }

  private scheduleBatch() {
    if (this.batchTimeout) return

    this.batchTimeout = setTimeout(() => {
      this.batchTimeout = null
      this.processBatch()
    }, this.BATCH_DELAY)
  }

  private async processBatch() {
    if (this.isProcessing || this.queue.size === 0) return

    this.isProcessing = true

    try {

      const batchIds = Array.from(this.queue).slice(0, this.BATCH_SIZE)


      batchIds.forEach((id) => this.queue.delete(id))


      try {
        const response = await window.api.getBatchThumbnails(batchIds, 'Asset')

        if (response.data) {

          const resultMap = new Map<number, string | null>()
          response.data.forEach((thumb) => {
            resultMap.set(thumb.targetId, thumb.imageUrl || null)
          })


          batchIds.forEach((id) => {
            const url = resultMap.get(id) || null
            if (url) {
              this.cache.set(id, url)
            }


            const callbacks = this.pending.get(id)
            if (callbacks) {
              callbacks.forEach((cb) => cb(url))
              this.pending.delete(id)
            }
          })
        } else {

          batchIds.forEach((id) => {
            const callbacks = this.pending.get(id)
            if (callbacks) {
              callbacks.forEach((cb) => cb(null))
              this.pending.delete(id)
            }
          })
        }
      } catch (error) {
        console.error('Batch thumbnail fetch failed:', error)

        batchIds.forEach((id) => {
          const callbacks = this.pending.get(id)
          if (callbacks) {
            callbacks.forEach((cb) => cb(null))
            this.pending.delete(id)
          }
        })
      }


      if (this.queue.size > 0) {
        this.scheduleBatch()
      }
    } finally {
      this.isProcessing = false
    }
  }
}


export const thumbnailLoader = new ThumbnailBatchLoader()