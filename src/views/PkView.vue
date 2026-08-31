<script setup>
import { computed, onMounted, ref } from "vue";
import PageHeader from "../layouts/components/PageHeader.vue";
import { API, authHeaders } from '../data/store'
const matches = ref([]);
const filter = ref("全部");
const active = ref(null);
const error = ref("");
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const filters = ["全部", "已预约", "待确认", "待结算", "已完成", "已取消"];
const totalPages = () => Math.max(Math.ceil(total.value / pageSize.value), 1);
const today = new Date().toISOString().slice(0, 10);
const todayStake = computed(() =>
  matches.value
    .filter((m) => m.date === today)
    .reduce((sum, match) => sum + match.stake * 2, 0)
);
async function loadMatches() {
  try {
    const params = new URLSearchParams({ page: page.value, pageSize: pageSize.value });
    if (filter.value !== "全部") params.set("status", filter.value);
    const response = await fetch(`${API}/pk?${params}`, { headers: authHeaders() });
    if (!response.ok) throw new Error("PK 数据加载失败");
    const data = await response.json();
    matches.value = data.items.map((match) => ({
      ...match,
      challenger: match.challenger?.name || "未知用户",
      opponent: match.opponent?.name || "未知用户",
      winner: match.winner?.name || "",
    }));
    total.value = data.total;
    page.value = data.page;
    error.value = "";
  } catch (e) {
    error.value = e.message;
  }
}
function changeFilter(value) {
  filter.value = value;
  page.value = 1;
  loadMatches();
}
async function settle(winnerId) {
  const match = active.value;
  const response = await fetch(`${API}/pk/${match.id}/settle`, {
    method: "PATCH",
    headers: authHeaders('admin', true),
    body: JSON.stringify({ winnerId }),
  });
  if (!response.ok) {
    error.value = await response.text();
    return;
  }
  active.value = null;
  await loadMatches();
}
async function cancel() {
  const response = await fetch(`${API}/pk/${active.value.id}/cancel`, {
    method: "PATCH", headers: authHeaders(),
  });
  if (!response.ok) {
    error.value = "PK 取消失败";
    return;
  }
  active.value = null;
  await loadMatches();
}
onMounted(loadMatches);
</script>
<template>
  <PageHeader title="PK 对战" />
  <main class="main-area admin-page admin-table-page">
    <div v-if="error" class="api-error">{{ error }}</div>
    <div class="pk-stats">
      <div class="pk-stat">
        <span>全部预约</span><strong>{{ total }}</strong
        ><em>场</em>
      </div>
      <div class="pk-stat">
        <span>当前页待处理</span
        ><strong>{{
          matches.filter((m) => ["待确认", "待结算"].includes(m.status)).length
        }}</strong
        ><em>场</em>
      </div>
      <div class="pk-stat">
        <span>当前页今日赌注</span><strong>{{ todayStake }}</strong
        ><em>PTS</em>
      </div>
    </div>
    <section class="panel table-panel full-table pk-panel">
      <div class="panel-head">
        <div>
          <h2>PK 预约记录</h2>
          <p>共 {{ total }} 场预约，后台确认结果并结算积分</p>
        </div>
        <div class="segmented">
          <button
            v-for="item in filters"
            :key="item"
            :class="{ selected: filter === item }"
            @click="changeFilter(item)"
          >
            {{ item }}
          </button>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>对战双方</th>
            <th>预约时间</th>
            <th>单方赌注</th>
            <th>总赌注</th>
            <th>状态</th>
            <th>胜者</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="match in matches" :key="match.id">
            <td>
              <b>{{ match.challenger }}</b
              ><span class="versus">VS</span><b>{{ match.opponent }}</b
              ><small class="match-note">{{ match.note || "未填写规则" }}</small>
            </td>
            <td>
              {{ match.date }}<small class="match-note">{{ match.time }}</small>
            </td>
            <td>
              <strong class="points">{{ match.stake }} PTS</strong>
            </td>
            <td>
              <strong class="points">{{ match.stake * 2 }} PTS</strong>
            </td>
            <td>
              <span :class="['pk-status', match.status]">{{ match.status }}</span>
            </td>
            <td>{{ match.winner || "—" }}</td>
            <td>
              <button
                v-if="!['已完成', '已取消'].includes(match.status)"
                class="link-btn"
                @click="active = match"
              >
                处理</button
              ><span v-else class="muted">已归档</span>
            </td>
          </tr>
          <tr v-if="!matches.length">
            <td colspan="7" class="empty-state">暂无 PK 预约记录</td>
          </tr>
        </tbody>
      </table>
      <div class="pagination">
        <span>第 {{ page }} / {{ totalPages() }} 页</span
        ><label
          >每页<select
            v-model.number="pageSize"
            @change="
              page = 1;
              loadMatches();
            "
          >
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option></select
          >条</label
        ><button
          class="outline-btn"
          :disabled="page === 1"
          @click="
            page--;
            loadMatches();
          "
        >
          上一页</button
        ><button
          class="outline-btn"
          :disabled="page === totalPages()"
          @click="
            page++;
            loadMatches();
          "
        >
          下一页
        </button>
      </div>
    </section>
  </main>
  <div v-if="active" class="modal-backdrop" @click.self="active = null">
    <div class="modal pk-modal">
      <button class="close" @click="active = null">×</button>
      <p class="eyebrow">MATCH #{{ active.id }}</p>
      <h2>确认 PK 结果</h2>
      <div class="match-card">
        <strong>{{ active.challenger }}</strong
        ><span>VS</span><strong>{{ active.opponent }}</strong
        ><small>双方赌注 {{ active.stake * 2 }} PTS</small>
      </div>
      <p class="modal-hint">请选择获胜用户，系统会将失败方的赌注积分转给胜者。</p>
      <button class="winner-btn" @click="settle(active.challengerId)">
        {{ active.challenger }} 获胜</button
      ><button class="winner-btn" @click="settle(active.opponentId)">
        {{ active.opponent }} 获胜</button
      ><button class="cancel-btn" @click="cancel">取消本场 PK</button>
    </div>
  </div>
</template>
<style scoped>
.full-table{min-height:calc(100vh - 296px)}
</style>
