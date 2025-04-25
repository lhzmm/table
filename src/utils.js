import { h, version } from 'vue'

export const isVue3 = version?.startsWith('3')

export function inject$createElement(CompOpt) {
  if (isVue3) {
    CompOpt.methods.$createElement = h
  }
  return CompOpt
}

export function createId(){
  return Math.random().toString(36).split('.')[1]
}