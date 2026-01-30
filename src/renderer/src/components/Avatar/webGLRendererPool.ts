import * as THREE from 'three'

interface RendererEntry {
  renderer: THREE.WebGLRenderer
  container: HTMLElement | null
  lastUsed: number
  inUse: boolean
}

class WebGLRendererPool {
  private pool: RendererEntry[] = []
  private readonly maxRenderers = 6




  acquire(container: HTMLElement): THREE.WebGLRenderer {

    const availableEntry = this.pool.find((entry) => !entry.inUse)

    if (availableEntry) {
      availableEntry.inUse = true
      availableEntry.lastUsed = Date.now()
      availableEntry.container = container


      if (!container.contains(availableEntry.renderer.domElement)) {
        container.appendChild(availableEntry.renderer.domElement)
      }

      return availableEntry.renderer
    }


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


    console.warn('WebGL renderer pool exhausted, reclaiming oldest renderer')
    const oldestEntry = this.pool.reduce((oldest, current) =>
      current.lastUsed < oldest.lastUsed ? current : oldest
    )


    if (oldestEntry.container && oldestEntry.container.contains(oldestEntry.renderer.domElement)) {
      oldestEntry.container.removeChild(oldestEntry.renderer.domElement)
    }


    container.appendChild(oldestEntry.renderer.domElement)
    oldestEntry.container = container
    oldestEntry.lastUsed = Date.now()
    oldestEntry.inUse = true

    return oldestEntry.renderer
  }




  release(renderer: THREE.WebGLRenderer): void {
    const entry = this.pool.find((e) => e.renderer === renderer)
    if (entry) {
      entry.inUse = false
      entry.lastUsed = Date.now()


      if (entry.container && entry.container.contains(renderer.domElement)) {
        entry.container.removeChild(renderer.domElement)
      }
      entry.container = null
    }
  }




  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.setClearColor(0x000000, 0)


    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    renderer.domElement.style.pointerEvents = 'none'
    renderer.domElement.style.backgroundColor = 'transparent'

    return renderer
  }




  disposeAll(): void {
    this.pool.forEach((entry) => {
      if (entry.container && entry.container.contains(entry.renderer.domElement)) {
        entry.container.removeChild(entry.renderer.domElement)
      }
      entry.renderer.dispose()
    })
    this.pool = []
  }




  getStats() {
    return {
      total: this.pool.length,
      inUse: this.pool.filter((e) => e.inUse).length,
      available: this.pool.filter((e) => !e.inUse).length,
      maxRenderers: this.maxRenderers
    }
  }
}


export const rendererPool = new WebGLRendererPool()


if (typeof window !== 'undefined') {
  ;(window as any).rendererPoolStats = () => {}
}