<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { loadAllRankings } from '../data/store'

const ranking = ref([])

// per-instance lifecycle values (created on mount)
let _controller = null
let _stopped = false
let _refreshTimer = null

const rankedUsers = computed(() => ranking.value.map((user, index) => ({ ...user, rank: index + 1 })))
const topFour = computed(() => rankedUsers.value.slice(0, 4))
const remaining = computed(() => rankedUsers.value.slice(4, 16))
const leftRows = computed(() => remaining.value.slice(0, 6))
const rightRows = computed(() => remaining.value.slice(6, 12))

function durationFor(points) {
  const minutes = Math.max(0, Math.round(Number(points) || 0))
  return `${Math.floor(minutes / 60)}小时${String(minutes % 60).padStart(2, '0')}分`
}
function trophyFor(rank) {
  return rank === 1 ? '/rank-gold.png' : rank === 2 ? '/rank-silver.png' : rank === 3 ? '/rank-bronze.png' : '/rank-gold.png'
}

async function doRefresh(signal) {
  try {
    const data = await loadAllRankings(16, signal)
    // coerce points to number defensively
    ranking.value = data.map(u => ({ ...u, points: Number(u.points) || 0 }))
  } catch (err) {
    // log but don't throw — ensure schedule continues
    // eslint-disable-next-line no-console
    console.error('ランキング刷新失败', err)
  }
}

function scheduleRefresh(signal) {
  if (_stopped) return
  _refreshTimer = window.setTimeout(async () => {
    try {
      await doRefresh(signal)
    } catch (e) {
      // swallow — already logged in doRefresh
    } finally {
      if (!_stopped) scheduleRefresh(signal)
    }
  }, 10000)
}

onMounted(async () => {
  _controller = new AbortController()
  _stopped = false
  await doRefresh(_controller.signal)
  scheduleRefresh(_controller.signal)
})

onUnmounted(() => {
  _stopped = true
  if (_refreshTimer) window.clearTimeout(_refreshTimer)
  if (_controller) _controller.abort()
})
</script>

<template>
  <div class="public-screen top-four-screen">
    <header class="public-header"><h1>会员积分排行榜</h1></header>
    <main class="leaderboard">
      <div class="screen-title">
        <h2>会员积分排行榜</h2>
        <p>玩球一分钟，累计一个积分</p>
      </div>
      <section class="screen-board top-four-board">
        <div class="screen-live-badge"><span></span>实时更新</div>
      <div class="top-four-cards">
        <article v-for="user in topFour" :key="user.id" :class="['top-four-card', `rank-card-${user.rank}`]">
          <img :src="trophyFor(user.rank)" :alt="`第 ${user.rank} 名`" />
          <div class="rank-card-copy"><b>{{ user.rank }}</b></div>
          <strong class="rank-card-name">{{ user.name }}</strong>
          <div class="rank-card-metric"><span class="jifen">积分</span><em>{{ (Number(user.points) || 0).toLocaleString() }} <span class="points-unit">分</span></em></div>
          <div class="rank-card-metric"><span class="huoyueshichang">活跃时长</span><em>{{ durationFor(user.points) }}</em></div>
          <div class="activity-chart" aria-hidden="true"><i v-for="n in 12" :key="n" :style="{ height: `${25 + ((n * 17 + user.rank * 9) % 65)}%` }"></i></div>
        </article>
      </div>

      <div class="rank-table-grid">
        <section class="rank-list">
          <div class="rank-list-head"><span>排名</span><span>会员姓名</span><span>积分</span><span>活跃时长</span></div>
          <div v-for="user in leftRows" :key="user.id" class="rank-list-row"><b><span>{{ user.rank }}</span></b><span>{{ user.name }}</span><strong>{{ (Number(user.points) || 0).toLocaleString() }}</strong><em>{{ durationFor(user.points) }}</em></div>
        </section>
        <section class="rank-list">
          <div class="rank-list-head"><span>排名</span><span>会员姓名</span><span>积分</span><span>活跃时长</span></div>
          <div v-for="user in rightRows" :key="user.id" class="rank-list-row"><b><span>{{ user.rank }}</span></b><span>{{ user.name }}</span><strong>{{ (Number(user.points) || 0).toLocaleString() }}</strong><em>{{ durationFor(user.points) }}</em></div>
        </section>
      </div>
      </section>
    </main>
    <footer class="public-footer screen-footer-note"><span>积分可兑换时长、饮品、球杆保养及专属赛事名额</span></footer>
  </div>
</template>

<style lang="scss" scoped>
// SCSS refactor: variables, nesting and reuse to reduce duplication
$max-width: 1350px;
$highlight-default: rgba(244, 202, 99, .18);
$edge-default: #e9bf5c;
$gold-stop-1: rgba(255,253,220,0.30);
$gold-stop-2: rgba(249,236,183,0.30);
$gold-stop-3: rgba(242,194,99,0.30);
$gold-stop-4: rgba(219,144,41,0.30);
$points-unit-color: #E8C978;

.top-four-screen { overflow: hidden; }
.top-four-board { position: relative; z-index: 1; width: min(100%, $max-width); margin-inline: auto; }
:global(body .public-screen.top-four-screen .screen-board.top-four-board) {
  inline-size: min(100%, $max-width) !important;
  max-inline-size: $max-width !important;
  transform: none !important;
}

:global(body .public-screen.top-four-screen .screen-title h2),
:global(body .public-screen.top-four-screen .public-header h1) {
  background: linear-gradient(
    to right,
    #FFF8DC 0%,
    #FFE9A3 35%,
    #F5D477 70%,
    #C99632 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-weight: 700;
  text-shadow: 0 0 16px rgba(214, 168, 63, 0.30);
}

.top-four-cards { display: grid; gap: clamp(.38rem, .65vw, .65rem); margin-bottom: clamp(.7rem, 1.1vw, 1rem); }

.top-four-card {
  --edge-light: #e9bf5c;
  --edge-dark: #704918;
  --highlight: $highlight-default;
  min-height: clamp(4.2rem, 7.3vh, 5.8rem);
  position: relative;
  display: grid;
  grid-template-columns: clamp(4.5rem, 7vw, 6.3rem) clamp(2.3rem, 3.5vw, 3.2rem) minmax(7rem, 1.25fr) minmax(8rem, 1fr) minmax(9rem, 1.1fr) minmax(8rem, .9fr);
  align-items: center;
  padding: .42rem clamp(.8rem, 1.35vw, 1.3rem);
  border: 1px solid var(--edge-light);
  border-radius: .55rem;
  background: linear-gradient(112deg, rgba(27, 34, 23, .95), rgba(13, 18, 14, .9));
  box-shadow: inset 0 0 1.4rem var(--highlight), 0 0 .35rem color-mix(in srgb, var(--edge-light) 55%, transparent);
  overflow: hidden;

  &::before { content: ''; position: absolute; z-index: 0; inset: .22rem; border: 1px solid color-mix(in srgb, var(--edge-light) 48%, transparent); border-radius: .35rem; pointer-events: none; }
  &::after { content: ''; position: absolute; z-index: 0; inset: 0 auto 0 0; width: 32%; background: linear-gradient(125deg, var(--highlight), transparent 68%); filter: blur(.25rem); pointer-events: none; }

  img { position: relative; z-index: 1; width: 78%; max-height: 4rem; object-fit: contain; justify-self: center; filter: drop-shadow(0 .2rem .3rem rgba(0,0,0,.75)) drop-shadow(0 -.1rem .25rem rgba(255, 224, 125, .42)); }

  .rank-card-copy, > strong, .rank-card-metric { position: relative; z-index: 1; }
  .rank-card-copy { display: grid; place-items: center;
    b { width: clamp(2.25rem, 3.25vw, 3.25rem); height: clamp(2.25rem, 3.25vw, 3.25rem); display: grid; place-items: center; border: 1px solid currentColor; border-radius: 50%; background: rgba(9, 20, 14, .7); font: 700 clamp(1.15rem, 1.8vw, 1.75rem) 'Space Grotesk', sans-serif; line-height: 1; }
  }

  > strong { padding-inline: clamp(.4rem, 1vw, 1.1rem); font-size: clamp(1rem, 1.55vw, 1.75rem); background: linear-gradient(to bottom, var(--text-bright) 0 20%, var(--text-main) 20% 100%); -webkit-background-clip: text; background-clip: text; color: transparent; opacity: .92; text-shadow: 0 0 .7rem var(--text-glow); }

  .rank-card-metric { display: grid; gap: .28rem; padding-inline: clamp(.6rem, 1.2vw, 1.25rem); border-left: 1px solid rgba(221, 180, 90, .28);
    span { font-size: clamp(.8rem, 1.1vw, 1.1rem); font-weight: 700; background: linear-gradient(to bottom, var(--text-bright) 0 20%, var(--text-main) 20% 100%); -webkit-background-clip: text; background-clip: text; color: transparent; opacity: .9; }
    em { font-size: clamp(1.2rem, 1.8vw, 2rem); font-style: normal; font-weight: 800; white-space: nowrap; background: linear-gradient(to bottom, var(--text-bright) 0 20%, var(--text-main) 20% 100%); -webkit-background-clip: text; background-clip: text; color: transparent; opacity: .98; text-shadow: 0 0 .7rem var(--text-glow); }
  }

  .activity-chart { align-self: end; height: 58%; display: flex; align-items: end; gap: clamp(.12rem, .25vw, .25rem); padding: 0 .5rem .2rem; border-bottom: 1px solid color-mix(in srgb, var(--bar-top) 42%, transparent); opacity: .82;
    i { flex: 1; min-width: .18rem; background: linear-gradient(to top, color-mix(in srgb, var(--bar-bottom) 72%, transparent) 0 80%, color-mix(in srgb, var(--bar-top) 64%, transparent) 80% 100%); border: 1px solid color-mix(in srgb, var(--bar-top) 48%, transparent); border-bottom: 0; box-shadow: 0 0 .45rem color-mix(in srgb, var(--bar-top) 28%, transparent); }
  }

  // default bar/text variables for rank cards 1-4
  &.rank-card-1, &.rank-card-2, &.rank-card-3, &.rank-card-4 { --bar-top: #ffe7a0; --bar-bottom: #b8791b; --text-bright: #fff3c4; --text-main: #e5aa3f; --text-glow: rgba(255, 204, 91, .35); }

  &.rank-card-1 { --edge-light: #ffe08a; --edge-dark: #b8791f; --highlight: rgba(255, 205, 78, .18); background-color: #1a170d; background-image: url('/rank-first-bg.png'); background-position: center; background-size: calc(100% - 4px) calc(100% - 4px); background-repeat: no-repeat; }
  &.rank-card-2 { --edge-light: #e5f2ee; --edge-dark: #78979a; --highlight: rgba(194, 226, 220, .3); background-color: #1a170d; background-image: url('/2.png'); background-position: center; background-size: calc(100% - 4px) calc(100% - 4px); background-repeat: no-repeat; }
  &.rank-card-3 { --edge-light: #ffc18c; --edge-dark: #b45e28; --highlight: rgba(238, 147, 82, .34); background-color: #1a170d; background-image: url('/3.png'); background-position: center; background-size: calc(100% - 4px) calc(100% - 4px); background-repeat: no-repeat; }
  &.rank-card-4 { --edge-light: #f5d77b; --edge-dark: #9a762b; --highlight: rgba(225, 194, 95, .28); background-color: #1a170d; background-image: url('/4.png'); background-position: center; background-size: calc(100% - 4px) calc(100% - 4px); background-repeat: no-repeat; }

  // For top 1-4: hide trophy/number and activity chart, enlarge points and set gold gradient
  &.rank-card-1, &.rank-card-2, &.rank-card-3, &.rank-card-4 {
    > img, .rank-card-copy { visibility: hidden; }
    .activity-chart { display: none; }

    > strong { transform: translateX(80px); background: none; color: rgba(255,255,255,.3); opacity: 1; text-shadow: none; }

    .rank-card-metric {
      em {
        font-size: clamp(1.4rem, 2.2vw, 2.4rem);
        font-weight: 800;
        background: linear-gradient(to bottom, $gold-stop-1 0%, $gold-stop-2 45%, $gold-stop-3 75%, $gold-stop-4 100%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 0 16px rgba(214, 168, 63, 0.30);
      }

      .points-unit {
        font-size: 0.75em;
        font-weight: 800;
        opacity: 0.95;
        vertical-align: baseline;
        display: inline-block;
      }
    }
  }
}

// Per-rank name gradients (higher specificity to avoid being overridden)
.top-four-card.rank-card-1 > strong {
  background: linear-gradient(
    to bottom,
     #FFF8DC 0%,
    #FFE9A3 35%,
    #F5D477 70%,
    #C99632 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 0 .7rem rgba(219,144,41,0.12);
}
.top-four-card.rank-card-2 > strong { background: linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, rgba(240,245,242,0.95) 45%, rgba(189,205,202,0.95) 100%); -webkit-background-clip: text; background-clip: text; color: transparent; opacity: 0.95; }
.top-four-card.rank-card-3 > strong { background: linear-gradient(to bottom, rgba(255,209,160,0.98) 0%, rgba(255,193,140,0.98) 50%, rgba(167,84,37,0.98) 100%); -webkit-background-clip: text; background-clip: text; color: transparent; opacity: 0.98; text-shadow: 0 0 .7rem rgba(167,84,37,0.2); }
.top-four-card.rank-card-4 > strong { background: linear-gradient(to bottom, rgba(248,232,172,0.96) 0%, rgba(245,215,123,0.96) 50%, rgba(157,124,45,0.96) 100%); -webkit-background-clip: text; background-clip: text; color: transparent; opacity: 0.96; text-shadow: 0 0 .6rem rgba(157,124,45,0.18); }

// Apply matching per-rank gradients to the points numbers for ranks 1-4
.top-four-card.rank-card-1 .rank-card-metric em {
  font-size: clamp(1.8rem, 3.2vw, 2.5rem);
  font-weight: 900;
 background: linear-gradient(
    to bottom,
    #FFF8DC 0%,
    #FFE9A3 35%,
    #F5D477 70%,
    #C99632 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 0 .8rem rgba(219,144,41,0.14);
}
.top-four-card.rank-card-2 .rank-card-metric em { font-size: clamp(1.6rem, 2.8vw, 2.5rem); background: linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, rgba(240,245,242,0.95) 45%, rgba(189,205,202,0.95) 100%); -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: 900; text-shadow: 0 0 .6rem rgba(189,205,202,0.10); }
.top-four-card.rank-card-3 .rank-card-metric em { font-size: clamp(1.6rem, 2.8vw, 2.5rem); background: linear-gradient(to bottom, rgba(255,209,160,0.98) 0%, rgba(255,193,140,0.98) 50%, rgba(167,84,37,0.98) 100%); -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: 900; text-shadow: 0 0 .6rem rgba(167,84,37,0.12); }
.top-four-card.rank-card-4 .rank-card-metric em { font-size: clamp(1.6rem, 2.8vw, 2.5rem); background: linear-gradient(to bottom, rgba(248,232,172,0.96) 0%, rgba(245,215,123,0.96) 50%, rgba(157,124,45,0.96) 100%); -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: 900; text-shadow: 0 0 .6rem rgba(157,124,45,0.10); }

// per-rank points-unit gradients matching the names
.top-four-card.rank-card-1 .rank-card-metric .points-unit {
  background: linear-gradient(
    to bottom,
    #FFF8DC 0%,
    #FFE9A3 35%,
    #F5D477 70%,
    #C99632 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}
.top-four-card.rank-card-2 .rank-card-metric .points-unit {
  background: linear-gradient(
    to bottom,
    rgba(255,255,255,0.95) 0%,
    rgba(240,245,242,0.95) 45%,
    rgba(189,205,202,0.95) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}
.top-four-card.rank-card-3 .rank-card-metric .points-unit {
  background: linear-gradient(
    to bottom,
    rgba(255,209,160,0.98) 0%,
    rgba(255,193,140,0.98) 50%,
    rgba(167,84,37,0.98) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}
.top-four-card.rank-card-4 .rank-card-metric .points-unit {
  background: linear-gradient(
    to bottom,
    rgba(248,232,172,0.96) 0%,
    rgba(245,215,123,0.96) 50%,
    rgba(157,124,45,0.96) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}
.top-four-cards .rank-card-metric .jifen{
 background: linear-gradient(
    to bottom,
    #FFF8DC 0%,
    #FFE9A3 35%,
    #F5D477 70%,
    #C99632 100%
  );
  font-size: 16px;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}
.top-four-cards .rank-card-metric .huoyueshichang{
 background: linear-gradient(
    to bottom,
    #FFF8DC 0%,
    #FFE9A3 35%,
    #F5D477 70%,
    #C99632 100%
  );
  font-size: 16px;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.rank-table-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: clamp(.65rem, 1.25vw, 1.4rem); }
.rank-list { overflow: hidden; border: 1px solid #b98d34; border-radius: .4rem; background: rgba(2, 20, 12, .54); }
.rank-list-head, .rank-list-row { display: grid; grid-template-columns: .8fr 1.55fr 1.05fr 1.25fr; align-items: center; min-height: clamp(3.2rem, 6vh, 4.6rem); text-align: center; }
.rank-list-head { color: #f5d886; font-size: clamp(1rem, 1.3vw, 1.4rem); font-weight: 700; border-bottom: 1px solid #b98d34; background: rgba(0, 20, 12, .86); }
.rank-list-row { color: #fff0bd; border-bottom: 1px solid rgba(187, 145, 54, .52); font-size: clamp(1.05rem, 1.35vw, 1.5rem); }
.rank-list-row:last-child { border-bottom: 0; }
.rank-list-row:nth-child(odd) { background: rgba(24, 67, 41, .28); }
.rank-list-row b { justify-self: center; width: clamp(2rem, 2.7vw, 2.9rem); height: clamp(2rem, 2.7vw, 2.9rem); display: grid; place-items: center; transform: rotate(45deg); border: 1px solid #e6bf63; background: #193d2a; font-family: 'Space Grotesk', sans-serif; }
.rank-list-row b span { transform: rotate(-45deg); display: block; }
.rank-list-row strong { color: #f9d57b; font-size: 1.25em; font-weight: 800; }
.rank-list-row em { font-style: normal; color: #f5e1a4; font-size: 1.05em; }

@media (max-width: 760px) {
  .top-four-screen { overflow: auto; }
  .rank-table-grid { grid-template-columns: 1fr; }
  .top-four-card { grid-template-columns: 4rem 2.6rem 1fr; }
  .rank-card-metric, .activity-chart { display: none; }
  :global(body .public-screen.top-four-screen .screen-board.top-four-board) { inline-size: 100% !important; max-inline-size: none !important; transform: none; }
}
</style>
