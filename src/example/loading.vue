<template>
  <div>
    <button @click="showTable = !showTable">toggle</button>
    <div style="height: 500px">
      <keep-alive>
        <Table border v-show="showTable" :loading="loading" :table-configs="configs" :data="data" style="height: 100%">
        </Table>
      </keep-alive>
    </div>
  </div>
</template>
  
<script>
import NormalTable from "../ClassicTable";
import { TABLE_HEAD } from "../render";
import "../style.less";

export default {
  name: "Example",
  components: { Table: NormalTable },
  data() {
    return {
      showTable: true,
      loading: true,
      configs: [
        // ie下要指定width
        {
          label: "index",
          prop: "_",
          render: (t, r, i) => i + 1 /* , fixed: 'left' */,
        },
        {
          label: "b",
          prop: "b",
        },
        {
          label: "c",
          prop: "c",
        },
      ],
      // data: new Array(10).fill("").map(() => ({
      //   a: Math.floor(Math.random() * 100),
      //   a2: Math.floor(Math.random() * 100),
      //   b: Math.floor(Math.random() * 100),
      //   b2: Math.floor(Math.random() * 100),
      //   c: Math.floor(Math.random() * 100),
      //   d: Math.floor(Math.random() * 100),
      // })),
      data: []
    };
  },
  mounted() {
    setTimeout(() => {
      Promise.resolve().then(() => {
        this.data = new Array(10).fill("").map(() => ({
          a: Math.floor(Math.random() * 100),
          a2: Math.floor(Math.random() * 100),
          b: Math.floor(Math.random() * 100),
          b2: Math.floor(Math.random() * 100),
          c: Math.floor(Math.random() * 100),
          d: Math.floor(Math.random() * 100),
        }))
        console.log('change data')
      }).finally(() => {
        console.log('finally')
        this.loading = false
      })
    },2000)
  },
};
</script>
  
<style lang="less">
// html,body{
//   margin:0;
// }
</style>
  