import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

const routes=[
  {
    path:'/',
    component:()=>import('../example.vue')
  },
  {
    path:'/scroll',
    component:()=>import('../example/scroll')
  },
  {
    path:'/fixedLR',
    component:()=>import('../example/fixedLR')
  },
  {
    path:'/fixedBottom',
    component:()=>import('../example/fixedBottom')
  },
  {
    path:'/loading',
    component:()=>import('../example/loading')
  }
]

export default new Router({routes})