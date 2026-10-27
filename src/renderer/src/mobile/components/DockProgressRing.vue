<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '../../stores/playerStore'

/**
 * 首页底栏中央圆形封面的外圈播放进度
 *
 * 独立组件：positionMs 每 250ms 更新，放在 PlayerDock 里会让整个面板跟着重渲染，
 * 拆出来后只有这个 SVG 会刷新。
 */
const player = usePlayerStore()

const RADIUS = 22.5
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const progress = computed(() => {
  const duration = player.currentSong?.durationMs ?? 0
  if (!duration) return 0
  const p = player.positionMs / duration
  return p < 0 ? 0 : p > 1 ? 1 : p
})

const dashArray = computed(() => {
  const filled = CIRCUMFERENCE * progress.value
  return `${filled.toFixed(2)} ${CIRCUMFERENCE.toFixed(2)}`
})
</script>

<template>
  <svg class="dock-ring" viewBox="0 0 48 48" aria-hidden="true">
    <!-- 未播放部分：淡灰色轨道 -->
    <circle class="ring-track" cx="24" cy="24" :r="RADIUS" />
    <!-- 已播放部分：主题色圆弧，从 12 点方向开始 -->
    <circle
      class="ring-progress"
      cx="24"
      cy="24"
      :r="RADIUS"
      :stroke-dasharray="dashArray"
      transform="rotate(-90 24 24)"
    />
  </svg>
</template>

<style scoped>
.dock-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  /* 略大于 44px 的封面，描边落在圆形封面外侧 */
  width: 54px;
  height: 54px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  overflow: visible;
}

.ring-track {
  fill: none;
  stroke: rgba(255, 255, 255, 0.26);
  stroke-width: 2.5;
}

.ring-progress {
  fill: none;
  stroke: var(--mp-primary, #3b9bff);
  stroke-width: 2.5;
  stroke-linecap: round;
  transition: stroke-dasharray 0.25s linear;
}
</style>
