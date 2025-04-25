# dc-table

该组件包导出2种表格组件
(引用于 作者：韩卿 https://github.com/hq229075284  )

## 安装

```bash
npm i @lhzmm/table --save
```

## 通用配置项

|配置属性|类型|描述
|-|-|-|
|data|Array|表格数据|
|tableConfigs|Array|表格配置项|
|loading|boolean|表格的加载状态 ~~**(目前仅经典表格支持)**~~|
|exactScrollBarWidth|Number \| String|滚动条的宽度/高度，需和实际实际出现的原生滚动条大小相同，仅支持滚动条宽高一致的情况|
|rowClick|Function|当表格内容的行被点击时触发，第一个参数为当前行的数据，第二个参数为当前行的行索引|
|getRowStyle|Function|获取表格`tr`上的内联样式。当第一个参数等于`TABLE_HEAD`**变量**时，表示获取的是表头的行样式；当第一个参数等于`TABLE_BODY`**变量**时，表示获取的是表内容的行样式；当第一个参数等于`TABLE_FOOT`**变量**时，表示获取的是表尾的行样式。第二个参数为当前行的行索引|

## tableConfigs详细配置项
|配置属性|类型|描述
|-|-|-|
|label|string \| Function|表格列标题，可接受一个函数，函数返回VNode节点|
|prop|string|表格列对应数据的属性名称，用于读取内容|
|width|number \| string|表格列的宽度，为number类型时，单位为px，为string类型时，直接应用到样式中。不指定时，会尝试获取cellStyle中的width属性|
|getRowSpan|Function|返回一个数字，表示跨几行。第一个参数表示类型，当参数值等于`TABLE_HEAD`**变量**时，表示渲染的是表头；当参数值等于`TABLE_BODY`**变量**时，表示渲染的是表格内容，此时会存在第二和第三个参数，第二个参数为该行的数据，第三个参数为该行在最终渲染出来的表格中的行索引；当参数值等于`TABLE_FOOT`**变量**时，表示渲染的是表尾，此时存在的第二和第三个参数同`TABLE_BODY`**变量**时。|
|getColSpan|Function|同getRowSpan，不过作用于列|
|cellStyle|Object|样式对象，作用于所有表格单元格（td > div），包括表头和表格内容|
|render|Function|渲染表格内容单元格的函数，如果提供该函数，将不直接使用`prop`属性配置的属性对应的值作为单元格内容展示，而使用该函数的返回值作为单元格内容展示，该函数可返回VNode。函数接受三个参数，第一个参数为`prop`属性配置的属性对应的值，第二个参数为该行数据，第三个参数为该行在最终渲染出来的表格中的行索引。|
|fixed|'left' \| 'right'|表格列固定 **(仅经典表格支持)**。某些特殊情况不支持，比如间隔列固定|
|children|**tableConfigs**|子表格列配置|


## 自动滚动表格

~~<font color="red">**暂不支持loading状态的展示和无数据的展示**</font>~~

### 引入
```javascript
// 引入方式
import {AutoScrollTable} from '@lhzmm/table'
```

### 特有配置项
|配置属性|类型|描述
|-|-|-|
|interval|number|表格一行过渡完成后停留的间隔，单位ms，默认1000ms|
|speed|number|表格行移动的速度，默认1s移动50px|

### 例子
```javascript
<template>
  <Table :table-configs="configs" :data="data" style="max-height:600px;">
  </Table>
</template>

<script>
import {AutoScrollTable, TABLE_HEAD} from '@lhzmm/table'
import '@lhzmm/table/module/index.es.css'

export default {
  name:'Example',
  components: { Table:AutoScrollTable },
  data() {
    return {
      configs: [
        // ie下要指定width
        { label: 'index', prop: '_', render: (val, row, ridx) => i + 1 },
        { label: 'a', prop: 'a',getColSpan(type){return type===TABLE_HEAD ? 1 : 1} },
        { label: 'b', prop: 'b' },
        { label: 'c', prop: 'c', render: (val) => <span>this is render c:{c}</span> },
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
}
</script>
```


## 经典表格

### 引入
```javascript
// 引入方式
import {ClassicTable} from '@lhzmm/table'
```

### 特有配置项
|配置属性|类型|描述
|-|-|-|
|needScrollBarResetToTopWhenDataChange|boolean|当数据改变时，滚动条是否要回到顶部，默认为true。在滚动加载的场景下需要设置成false|
|border|boolean|是否显示表格边框，默认为false。|
|fixedBottomRows|number|表格末尾固定行数|

### 例子
```javascript
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
      // loading状态
      this.loading=true
      setTimeout(()=>{
        this.loading=false
      // 无数据状态
        this.data=[]
        setTimeout(()=>{
          // 有数据展示状态
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
```

