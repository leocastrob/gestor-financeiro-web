import { createRouter, createWebHistory } from 'vue-router'
import { useGastosStore } from '../stores/gastos'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/gastos',
      name: 'gastos',
      component: () => import('../views/GastosView.vue'),
    },
  ],
})

// Guard: se não tem telefone na store, volta pro login
router.beforeEach((to) => {
  if (to.name === 'gastos') {
    const store = useGastosStore()
    if (!store.telefone) {
      return { name: 'login' }
    }
  }
})

export default router
