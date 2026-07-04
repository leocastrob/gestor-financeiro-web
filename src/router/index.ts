import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/:telefone',
      name: 'gastos',
      component: () => import('../views/GastosView.vue'),
    },
  ],
})

export default router
