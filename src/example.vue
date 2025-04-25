<template>
  <div>
    <button @click="showTable = !showTable">toggle</button>
    <div style="height: 500px">
      <keep-alive>
        <Table
          border
          v-show="showTable"
          :loading="loading"
          :table-configs="configs"
          :data="data"
          style="height: 100%"
          :rowClick="rowClick"
          :fixedBottomRows="1"
        >
        </Table>
      </keep-alive>
    </div>
  </div>
</template>

<script>
// import Table, { CHANGE_STATUS_OF_TABLE_DATA } from './index'
// import AutoScrollTable from "./AutoScrollTable";
import NormalTable from "./ClassicTable";
import { TABLE_HEAD } from "./render";
import "./style.less";
// import {AutoScrollTable} from '../module/index.es.js'
// import '../module/index.es.css'

export default {
  name: "Example",
  components: { Table: NormalTable },
  // components: { Table: AutoScrollTable },
  data() {
    return {
      showTable: true,
      loading: false,
      configs: [
        // ie下要指定width
        {
          label: "index",
          prop: "_",
          getRowSpan: (type) => {
            return type === TABLE_HEAD ? 3 : 1;
          },
          render: (t, r, i) => i + 1 /* , fixed: 'left' */,
        },
        // { label: 'a', prop: 'a',getColSpan(type){return type===TABLE_HEAD ? 1 : 2} },
        // { label: 'b', prop: 'b' },
        // { label: 'c', prop: 'c', render: (c) => <span>this is render c:{c}</span> },
        // { label: 'd', prop: 'd'/* , fixed:'right' */},
        {
          label: "b",
          prop: "b",
          getRowSpan: (type) => (type === TABLE_HEAD ? 2 : 1),
          // width: 300,
          children: [
            { width: 150, label: "a1", prop: "a1" },
            { width: 150, label: "a2", prop: "a2" },
          ],
        },
        {
          label: "c",
          prop: "c",
          children: [
            {
              label: "c1",
              prop: "c1",
              children: [
                { label: "c11", prop: "c11" },
                { label: "c12", prop: "c12" },
                { label: "c13", prop: "c13" },
              ],
            },
            {
              label: "c2",
              prop: "c2",
              children: [
                { label: "c21", prop: "c21" },
                { label: "c22", prop: "c22" },
                { label: "c23", prop: "c23" },
                { label: "c24", prop: "c24" },
              ],
            },
          ],
        },
        // { width: 300, label: 'd', prop: 'd', headRowspan: 2 },
        // { width: 300, label: 'c', prop: 'c', headRowspan: 2 },
        // {
        //   label: 'b',
        //   prop: 'b',
        //   headColspan: 2,
        //   width: 200,
        //   subHeads: [
        //     { label: 'b1', prop: 'b1', width: 100 },
        //     { label: 'b2', prop: 'b2', width: 100 },
        //   ],
        //   fixed: true,
        // },
      ],
      data: new Array(20).fill("").map(() => ({
        a: Math.floor(Math.random() * 100),
        a2: Math.floor(Math.random() * 100),
        b: Math.floor(Math.random() * 100),
        b2: Math.floor(Math.random() * 100),
        c: Math.floor(Math.random() * 100),
        d: Math.floor(Math.random() * 100),
      })),
      // data: [],
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
  methods: {
    rowClick(row, ridx) {
      console.log(row, ridx);
      // this.showTable=!this.showTable
    },
  },
};
</script>

<style lang="less">
// html,body{
//   margin:0;
// }
</style>
