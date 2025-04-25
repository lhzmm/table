<template>
  <Table :loading="loading" :table-configs="configs" :data="data" style="max-height:600px;">
  </Table>
</template>

<script>
import {ClassicTable, TABLE_HEAD} from '@lhzmm/table'
import '@lhzmm/table/module/index.es.css'

export default {
  name:'Example',
  components: { Table:ClassicTable },
  data() {
    return {
      loading: false,
      configs: [
        // ie下要指定width
        { label: 'index', prop: '_', render: (t, r, i) => i + 1 },
        { label: 'a', prop: 'a',getColSpan(type){return type===TABLE_HEAD ? 1 : 1} },
        { label: 'b', prop: 'b' },
        { label: 'c', prop: 'c', render: (c) => <span>this is render c:{c}</span> },
      ],
      data: new Array(20).fill('').map(() => ({
        a: Math.floor(Math.random() * 100),
        a2: Math.floor(Math.random() * 100),
        b: Math.floor(Math.random() * 100),
        b2: Math.floor(Math.random() * 100),
        c: Math.floor(Math.random() * 100),
        d: Math.floor(Math.random() * 100),
      })),
    }
  },
  mounted() {
    setTimeout(() => {
      this.loading=true
      setTimeout(()=>{
        this.loading=false
        this.data=[]
        setTimeout(()=>{
          this.data = new Array(20).fill('').map(() => ({
            a: Math.floor(Math.random() * 100),
            b: Math.floor(Math.random() * 100),
            c: Math.floor(Math.random() * 100),
            d: Math.floor(Math.random() * 100),
          }))
        },2000)
      },2000)
    }, 2000)
  },
}
</script>
