<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { loadAllRankings } from "../data/store";

const ranking = ref([]);
const perColumn = 12;
const rowsPerStep = 5;
const scrollDuration = 1200;
const leftScroll = ref(null);
const rightScroll = ref(null);
const rankedUsers = computed(() => ranking.value.map((user, index) => ({ ...user, rank: index + 1 })));
const leftUsers = computed(() => rankedUsers.value.filter((user) => (user.rank - 1) % (perColumn * 2) < perColumn));
const rightUsers = computed(() => rankedUsers.value.filter((user) => (user.rank - 1) % (perColumn * 2) >= perColumn));
let pollTimer;
let scrollTimer;
let resetTimer;
let animationFrame;
let pendingRanking = null;
let stopped = false;
const requestController = new AbortController();

function trophyFor(rank) {
  return rank === 1
    ? "/rank-gold.png"
    : rank === 2
      ? "/rank-silver.png"
      : rank === 3
        ? "/rank-bronze.png"
        : "";
}

function durationFor(points) {
  const minutes = Math.max(0, Math.round(Number(points) || 0));
  return `${Math.floor(minutes / 60)}时${String(minutes % 60).padStart(2, "0")}分`;
}

async function refresh(applyImmediately = false) {
  try {
    const data = await loadAllRankings(48, requestController.signal);
    if (applyImmediately || ranking.value.length === 0) ranking.value = data;
    else pendingRanking = data;
  } catch {}
}

function animateScroll(containers, targets) {
  const starts = containers.map((container) => container.scrollTop);
  const startTime = performance.now();
  function frame(now) {
    const progress = Math.min((now - startTime) / scrollDuration, 1);
    const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
    containers.forEach((container, index) => { container.scrollTop = starts[index] + (targets[index] - starts[index]) * eased; });
    if (progress < 1) animationFrame = requestAnimationFrame(frame);
  }
  animationFrame = requestAnimationFrame(frame);
}

function scheduleScroll() {
  scrollTimer = window.setTimeout(() => {
    const containers = [leftScroll.value, rightScroll.value].filter(Boolean);
    const shouldReset = containers.length > 0 && containers.every((container) => {
      const maxTop = container.scrollHeight - container.clientHeight;
      return maxTop > 0 && container.scrollTop >= maxTop - 1;
    });
    if (shouldReset) {
      containers.forEach((container) => container.classList.add("is-resetting"));
      resetTimer = window.setTimeout(async () => {
        if (pendingRanking) { ranking.value = pendingRanking; pendingRanking = null; await nextTick(); }
        containers.forEach((container) => { container.scrollTop = 0; container.classList.remove("is-resetting"); });
      }, 240);
      scheduleScroll();
      return;
    }
    const targets = containers.map((container) => {
      const row = container.querySelector(".screen-row");
      if (!row || container.scrollHeight <= container.clientHeight) return container.scrollTop;
      const maxTop = container.scrollHeight - container.clientHeight;
      if (container.scrollTop >= maxTop - 1) return 0;
      return Math.min(container.scrollTop + row.getBoundingClientRect().height * rowsPerStep, maxTop);
    });
    animateScroll(containers, targets);
    scheduleScroll();
  }, 7000 + Math.random() * 2000);
}

function scheduleRefresh() {
  if (stopped) return;
  pollTimer = window.setTimeout(async () => {
    await refresh();
    scheduleRefresh();
  }, 10000);
}

onMounted(() => {
  refresh(true).then(async () => { await nextTick(); scheduleScroll(); scheduleRefresh(); });
});

onUnmounted(() => {
  stopped = true;
  window.clearTimeout(scrollTimer);
  window.clearTimeout(resetTimer);
  window.clearTimeout(pollTimer);
  cancelAnimationFrame(animationFrame);
  requestController.abort();
});
</script>

<template>
  <div class="public-screen">
    <header class="public-header"><h1>会员积分排行榜</h1></header>
    <main class="leaderboard">
      <div class="screen-title">
        <h2>会员积分排行榜</h2>
        <p>玩球一分钟，累计一个积分</p>
      </div>
      <div class="screen-board">
        <div class="screen-live-badge"><span></span>实时更新</div>
        <div class="board-columns">
          <section class="screen-table">
            <div class="board-head">
              <span>排名</span><span>会员名称</span><span>积分</span><span>玩球时长</span>
            </div>
            <div ref="leftScroll" class="screen-table-body">
              <div v-for="user in leftUsers" :key="`l-${user.id}`" class="screen-row">
                <span class="screen-rank"><img v-if="trophyFor(user.rank)" class="rank-trophy" :src="trophyFor(user.rank)" :alt="`${user.rank}`" /><span v-else class="rank-number"><span>{{ user.rank }}</span></span></span><span class="screen-member"><span class="screen-avatar"><img v-if="user.avatarUrl" :src="user.avatarUrl" alt="" /><template v-else>{{ user.name.slice(0, 1) }}</template></span><span>{{ user.name }}</span></span><strong>{{ user.points.toLocaleString() }}</strong><strong class="screen-duration">{{ durationFor(user.points) }}</strong>
              </div>
            </div>
          </section>
          <section v-if="rightUsers.length" class="screen-table">
            <div class="board-head">
              <span>排名</span><span>会员名称</span><span>积分</span><span class="screen-duration">玩球时长</span>
            </div>
            <div ref="rightScroll" class="screen-table-body">
              <div v-for="user in rightUsers" :key="`r-${user.id}`" class="screen-row">
                <span class="screen-rank"><img v-if="trophyFor(user.rank)" class="rank-trophy" :src="trophyFor(user.rank)" :alt="`${user.rank}`" /><span v-else class="rank-number"><span>{{ user.rank }}</span></span></span><span class="screen-member"><span class="screen-avatar"><img v-if="user.avatarUrl" :src="user.avatarUrl" alt="" /><template v-else>{{ user.name.slice(0, 1) }}</template></span><span>{{ user.name }}</span></span><strong>{{ user.points.toLocaleString() }}</strong><strong class="screen-duration">{{ durationFor(user.points) }}</strong>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
    <footer class="public-footer screen-footer-note"><span>积分可兑换时长、饮品、球杆保养及专属赛事名额</span></footer>
  </div>
</template>

<style scoped>
.rank-trophy {
  display: block;
  width: 91px;
  height: 61px;
  object-fit: contain;
  object-position: center;
  margin: -16px auto;
  mix-blend-mode: screen;
  filter: drop-shadow(0 3px 6px #071e16d0);
}
.screen-table {
  border: 1px solid #bd8c2f;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(2, 30, 18, 0.62);
  box-shadow: inset 0 0 24px #02140bb8, 0 0 14px #d9a33520;
}
.screen-table .screen-row .screen-duration { font-size: 24px; }
.screen-table .board-head,
.screen-table .screen-row { grid-template-columns: 0.82fr 1.7fr 1.22fr 1.45fr; }
.screen-table .board-head {
  height: 58px;
  padding: 0;
  color: #f6db8e;
  font-size: clamp(19px, 1.45vw, 25px);
  text-align: center;
  text-shadow: 0 1px 5px #000;
}
.screen-table .screen-row {
  height: 76px;
  background: rgba(1, 36, 20, 0.75);
  border-bottom: 1px solid #9b7429;
  font-size: clamp(18px, 1.35vw, 23px);
}
.screen-table .screen-row:nth-child(odd) { background: rgba(4, 47, 27, 0.79); }
.screen-table .screen-row:last-child { border-bottom: 0; }
.screen-table .board-head > span,
.screen-table .screen-row > span,
.screen-table .screen-row > strong {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  border-right: 1px solid #9b7429;
}
.screen-table .board-head > span:last-child,
.screen-table .screen-row > strong:last-child { border-right: 0; }
.screen-table .screen-row strong {
  font-size: clamp(23px, 2vw, 32px);
  color: #f5cc72;
  text-shadow: 0 2px 7px #000;
}
.screen-table .screen-duration { font-size: clamp(17px, 1.35vw, 18px); white-space: nowrap; }
.screen-table .screen-rank { color: #f5d782; }
.rank-number {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border: 2px solid #e3b84f;
  background: #173a26;
  transform: rotate(45deg);
  box-shadow: 0 0 0 2px #674817, inset 0 0 10px #efc65b55;
}
.rank-number > span {
  font: 700 25px "Space Grotesk";
  transform: rotate(-45deg);
  text-shadow: 0 1px 4px #000;
}
.screen-table .screen-member {
  justify-content: flex-start;
  gap: 14px;
  padding-left: 28px !important;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
}
.screen-member > span:last-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.screen-avatar {
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 2px solid #dfb957;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #587a64, #12382a);
  color: #fff0c0;
  font: 700 20px "Space Grotesk";
  box-shadow: 0 0 0 2px #082518, 0 0 10px #e9bc5366;
}
.screen-avatar img { width: 100%; height: 100%; object-fit: cover; }
.screen-table,
.screen-table .screen-row,
.screen-table .screen-row:nth-child(odd) { background: transparent; }
.screen-table .screen-duration { font-size: 18px; }
@media (min-width: 901px) {
  .public-screen { padding: 18px 0 16px; }
  .public-screen .leaderboard { max-width: 1720px; }
  .public-screen .screen-board { max-width: 1680px; padding: clamp(0.7rem, 1.35vw, 1.5rem) clamp(0.75rem, 1.2vw, 1.75rem); }
  .public-screen .board-columns { gap: clamp(0.55rem, 0.8vw, 1rem); }
  .public-screen .screen-table .screen-row { height: 72px; }
}
</style>
