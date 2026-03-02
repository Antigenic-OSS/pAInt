export interface GradientStop {
  color: string
  position: number
  opacity: number
}

export interface GradientData {
  type: 'linear' | 'radial' | 'conic'
  angle: number
  stops: GradientStop[]
  repeat?: boolean
}
