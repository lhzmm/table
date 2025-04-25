<template>
  <div>
    <button @click="showTable = !showTable">toggle</button>
    <div style="height: 500px">
      <keep-alive>
        <Table
          border
          v-if="showTable"
          :loading="loading"
          :table-configs="configs"
          :data="data"
          style="height: 100%"
          :fixedBottomRows="1"
        >
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
  // components: { Table:AutoScrollTable },
  data() {
    return {
      showTable: true,
      loading: false,
      configs: [
        { width:200, label: "index", prop: "_", render: (t, r, i) => i + 1 , fixed: 'left' },
        { width:200, label: 'b', prop: 'b', fixed: 'left' },
        { width:700, label: 'c', prop: 'c', render: (c) => <span>this is render c:{c}</span> },
        { width:700, label: 'd', prop: 'd'/* , fixed:'right' */},
        {
          label: 'e',
          prop: 'e',
          // children: [
          //   { label: 'f', prop: 'f', width: 100 },
          //   { label: 'g', prop: 'g', width: 100 },
          // ],
          width:200,
          fixed: 'right',
        },
      ],
      data: new Array(20).fill("").map(() => ({
        a: Math.floor(Math.random() * 100),
        b: Math.floor(Math.random() * 100),
        c: Math.floor(Math.random() * 100),
        d: Math.floor(Math.random() * 100),
        e: Math.floor(Math.random() * 100),
        f: Math.floor(Math.random() * 100),
        g: Math.floor(Math.random() * 100),
      })),
    };
  },
  mounted() {
    // setTimeout(() => {
    //   this.loading=true
    //   // this.data = new Array(20).fill('').map(() => ({
    //   //   a: Math.floor(Math.random() * 100),
    //   //   b: Math.floor(Math.random() * 100),
    //   //   c: Math.floor(Math.random() * 100),
    //   //   d: Math.floor(Math.random() * 100),
    //   // }))
    //   setTimeout(()=>{
    //     this.loading=false
    //     this.data=[]
    //   },2000)
    // }, 2000)
  },
};
</script>

<style lang="less">
// html,body{
//   margin:0;
// }
</style>
