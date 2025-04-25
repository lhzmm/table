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
          // ie下要指定width
          {
            label: "index",
            prop: "_",
            width:300,
            getRowSpan: (type) => {
              return type === TABLE_HEAD ? 3 : 1;
            },
            render: (t, r, i) => i + 1 /* , fixed: 'left' */,
          },
          {
            label: "b",
            prop: "b",
            getRowSpan: (type) => (type === TABLE_HEAD ? 2 : 1),
            // 
            children: [
              {  width:300,label: "a1", prop: "a1" },
              {  width:300,label: "a2", prop: "a2" },
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
                  {width:300, label: "c11", prop: "c11" },
                  {width:300, label: "c12", prop: "c12" },
                  {width:300, label: "c13", prop: "c13" },
                ],
              },
              {
                label: "c2",
                prop: "c2",
                children: [
                  {width:300, label: "c21", prop: "c21" },
                  {width:300, label: "c22", prop: "c22" },
                  {width:300, label: "c23", prop: "c23" },
                  {width:300, label: "c24", prop: "c24" },
                ],
              },
            ],
          },
        ],
        data: new Array(10).fill("").map(() => ({
          a: Math.floor(Math.random() * 100),
          a2: Math.floor(Math.random() * 100),
          b: Math.floor(Math.random() * 100),
          b2: Math.floor(Math.random() * 100),
          c: Math.floor(Math.random() * 100),
          d: Math.floor(Math.random() * 100),
        })),
      };
    },
    mounted() {},
  };
  </script>
  
  <style lang="less">
  // html,body{
  //   margin:0;
  // }
  </style>
  