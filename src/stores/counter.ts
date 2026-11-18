import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * 计数器示例：采用 setup store（组合式）写法
 * 需要响应式解构时配合 storeToRefs 使用
 */
export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const step = ref(1)

  const doubleCount = computed(() => count.value * 2)
  const isPositive = computed(() => count.value > 0)

  function increment(amount: number = step.value) {
    count.value += amount
  }

  function decrement(amount: number = step.value) {
    count.value -= amount
  }

  function reset() {
    count.value = 0
  }

  return { count, step, doubleCount, isPositive, increment, decrement, reset }
})
