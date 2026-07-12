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
      path: '/painel',
      name: 'painel',
      component: () => import('../views/DashboardView.vue'),
    },
    {
      path: '/lancamentos',
      name: 'lancamentos',
      component: () => import('../views/LancamentosView.vue'),
    },
    {
      path: '/importar',
      name: 'importar',
      component: () => import('../views/ImportarExtratoView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
    },
  ],
})

const ROTAS_AUTENTICADAS = ['painel', 'lancamentos', 'importar']

// Guard: se não tem telefone na store, volta pro login
router.beforeEach((to) => {
  if (typeof to.name === 'string' && ROTAS_AUTENTICADAS.includes(to.name)) {
    const store = useGastosStore()
    if (!store.telefone) {
      return { name: 'login' }
    }
  }
})

export default router
