/// <reference types="vite/client" />

// DDS texture imports with ?url suffix
declare module '*.dds?url' {
  const url: string
  export default url
}
