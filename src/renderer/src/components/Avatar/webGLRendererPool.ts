import * as THREE from 'three'

interface RendererEntry {
  renderer: THREE.WebGLRenderer
  container: HTMLElement | null
  lastUsed: number
  inUse: boolean
}

class WebGLRendererPool {
  private pool: RendererEntry[] = []
  private readonly maxRenderers = 6 // Limit to 6 to stay well below browser limits

  /**
   * Get an available renderer from the pool or create a new one if under the limit
   */
  acquire(container: HTMLElement): THREE.WebGLRenderer {
    // First, try to find an unused renderer
    const availableEntry = this.pool.find((entry) => !entry.inUse)

    if (availableEntry) {
      availableEntry.inUse = true
      availableEntry.lastUsed = Date.now()
      availableEntry.container = container

      // Reattach to new container
      if (!container.contains(availableEntry.renderer.domElement)) {
        container.appendChild(availableEntry.renderer.domElement)
      }

      return availableEntry.renderer
    }

    // If we're under the limit, create a new renderer
    if (this.pool.length < this.maxRenderers) {
      const renderer = this.createRenderer()
      container.appendChild(renderer.domElement)

      const entry: RendererEntry = {
        renderer,
        container,
        lastUsed: Date.now(),
        inUse: true
      }

      this.pool.push(entry)
      return renderer
    }

    // If we're at the limit, forcibly reclaim the least recently used renderer
    console.warn('WebGL renderer pool exhausted, reclaiming oldest renderer')
    const oldestEntry = this.pool.reduce((oldest, current) =>
      current.lastUsed < oldest.lastUsed ? current : oldest
    )

    // Remove from old container
    if (oldestEntry.container && oldestEntry.container.contains(oldestEntry.renderer.domElement)) {
      oldestEntry.container.removeChild(oldestEntry.renderer.domElement)
    }

    // Reattach to new container
    container.appendChild(oldestEntry.renderer.domElement)
    oldestEntry.container = container
    oldestEntry.lastUsed = Date.now()
    oldestEntry.inUse = true

    return oldestEntry.renderer
  }

  /**
   * Release a renderer back to the pool
   */
  release(renderer: THREE.WebGLRenderer): void {
    const entry = this.pool.find((e) => e.renderer === renderer)
    if (entry) {
      entry.inUse = false
      entry.lastUsed = Date.now()

      // Remove from container but don't dispose
      if (entry.container && entry.container.contains(renderer.domElement)) {
        entry.container.removeChild(renderer.domElement)
      }
      entry.container = null
    }
  }

  /**
   * Create a new WebGL renderer with standard settings
   */
  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)) // Cap at 2x for performance
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.setClearColor(0x000000, 0)

    // Standard styles
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    renderer.domElement.style.pointerEvents = 'none'
    renderer.domElement.style.backgroundColor = 'transparent'

    return renderer
  }

  /**
   * Dispose of all renderers in the pool (cleanup on app exit)
   */
  disposeAll(): void {
    this.pool.forEach((entry) => {
      if (entry.container && entry.container.contains(entry.renderer.domElement)) {
        entry.container.removeChild(entry.renderer.domElement)
      }
      entry.renderer.dispose()
    })
    this.pool = []
  }

  /**
   * Get pool statistics for debugging
   */
  getStats() {
    return {
      total: this.pool.length,
      inUse: this.pool.filter((e) => e.inUse).length,
      available: this.pool.filter((e) => !e.inUse).length,
      maxRenderers: this.maxRenderers
    }
  }
}

// Export a singleton instance
export const rendererPool = new WebGLRendererPool()

// For debugging in console
if (typeof window !== 'undefined') {
  ;(window as any).rendererPoolStats = () => {}
}
