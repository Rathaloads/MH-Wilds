<script setup lang="ts">
import { useDataSourceStore } from '@/stores/data-source'
import { DATA_SOURCE_META, type DataSource } from '@/types/data-source'

const dataSource = useDataSourceStore()

const options = (Object.keys(DATA_SOURCE_META) as DataSource[]).map((value) => ({
  value,
  label: DATA_SOURCE_META[value].label,
  title: DATA_SOURCE_META[value].description,
}))
</script>

<template>
  <el-radio-group v-model="dataSource.source" size="small" class="data-source-switch">
    <el-radio-button v-for="option in options" :key="option.value" :value="option.value">
      <span :title="option.title">{{ option.label }}</span>
    </el-radio-button>
  </el-radio-group>
</template>
