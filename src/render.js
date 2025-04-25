import { isVue3 } from './utils'
export const TABLE_HEAD = "tableHead";
export const TABLE_BODY = "tableBody";
export const TABLE_FOOT = "tableFoot";
export const FAKE_KEY='__fake'
// export class BufferRunner{
//   constructor(cb){
//     this.query=[]
//     const fn=(resolve)=>{
//       this.resolve=()=>{
//         new Promise(fn).then(cb)
//         resolve()
//       }
//     }

//     new Promise(fn).then(cb)
//   }
//   add(offsetBuffer){
//     this.query.push(offsetBuffer)
//     offsetBuffer.run().then(()=>{
//       const fidx=this.query.indexOf(offsetBuffer)
//       this.query.splice(fidx,1)
//       if(!this.query.length){
//         this.resolve()
//       }
//     }).catch((e)=>{
//       if(e==='cancel') return
//       throw e
//     })
//   }
//   cancel(){
//     this.query.forEach(offsetBuffer=>offsetBuffer.cancel())
//     this.query=[]
//   }
// }

export function getScrollBarWidth() {
  if(typeof this.exactScrollBarWidth === 'number'){
    return this.exactScrollBarWidth+'px'
  }
  if(this.exactScrollBarWidth){
    return this.exactScrollBarWidth;
  }
  // if (this.exactScrollBarWidth || this.exactScrollBarWidth === 0) {
  //   return this.exactScrollBarWidth+'px';
  // }
  if (/Chrome/.test(window.navigator.userAgent)) {
    const div = document.createElement("div");
    div.height = 0;
    div.style.overflowY = "scroll";
    document.body.appendChild(div);
    const _scrollBarWidth = div.offsetWidth - div.clientWidth;
    document.body.removeChild(div);
    return _scrollBarWidth+'px';
  }
  return '17px';
}

function getFlatTableConfigs(tableConfigs){
  const flatTableConfigs=[]
  const query=[...tableConfigs]
  while(query.length){
    const current=query.shift()
    if(current.children?.length){
      query.unshift(...current.children)
    }else{
      flatTableConfigs.push(current)
    }
  }
  return flatTableConfigs
}

export function renderTableHead({ tableData, tableConfigs, overflowX, overflowY, refName }) {
  const h = this.$createElement;
  
  let maxDeep = 0;
  const flatTableConfigs = getFlatTableConfigs(tableConfigs)
  const trConfigsMap = new Map();
  const tdColSpanMap = new Map();
  
  function analyzeTableConfigs() {
    function travel(configs = tableConfigs, prevLevel = 0) {
      const currentLevel = prevLevel + 1;
      if (currentLevel > maxDeep) maxDeep = currentLevel;
      let offsetConfigIndex = 0
      if (trConfigsMap.has(currentLevel)) {
        const existing = trConfigsMap.get(currentLevel)
        offsetConfigIndex = existing.length
        trConfigsMap.set(currentLevel, existing.concat(configs));
      } else {
        trConfigsMap.set(currentLevel, [...configs]);
      }
      configs.forEach((config, index) => {
        const configIndex = offsetConfigIndex + index
        const rowSpan = config.getRowSpan?.(TABLE_HEAD) || 1;
        let colSpan
        if (config.children?.length) {
          const nextLevel = currentLevel + rowSpan
          travel(config.children, nextLevel - 1);
          const offsetChildIndex = trConfigsMap.get(nextLevel).length - config.children.length
          colSpan = config.children.reduce((prev, child, childIndex) => prev + tdColSpanMap.get(`${nextLevel}_${offsetChildIndex + childIndex}`), 0)
        } else {
          colSpan = config.getColSpan?.(TABLE_HEAD) || 1;
        }
        tdColSpanMap.set(`${currentLevel}_${configIndex}`, colSpan)
      });
    }
    travel();
  }

  function getThNodes(level) {
    // 可能存在有一层全是上下合并的单元格
    const configs = trConfigsMap.get(level) || [];
    return configs.map((config,configIndex) => {
      const rowSpan = config.getRowSpan?.(TABLE_HEAD) || 1;
      const colSpan = tdColSpanMap.get(`${level}_${configIndex}`);

      const attrs={
        colspan:colSpan,
        rowspan:rowSpan
      }
      return h('th',
        isVue3 ? attrs : { attrs },
        [
          <div style={config.cellStyle}>{typeof config.label === 'function' ? config.label() : config.label}</div>
        ]
      )
    });
  }

  function getTrNodes() {
    const trNodes = [];
    for (let i = 1; i <= maxDeep; i++) {
      const trNode = <tr style={this.getRowStyle?.(TABLE_HEAD, i - 1)}>{getThNodes(i)}</tr>;
      trNodes.push(trNode);
    }
    return trNodes;
  }

  analyzeTableConfigs();

  const scrollBarWidth = getScrollBarWidth.call(this);

  const colgroup=<colgroup>
  {
    flatTableConfigs.map((config) => {
      let width = config.width || config.cellStyle?.width 
      width = typeof width === 'number' ? `${width}px` : width
      return <col style={{ width }}/>
    })
  }
  </colgroup>

  return (
    <div class="table-header__padding" style={`padding-right:${overflowY === 'scroll' ? scrollBarWidth : 0};`}>
      <div
        class="table-header__wrapper"
        ref={refName||"tableHeadWrapper"}
        style={{"overflow-x": overflowX || 'auto','margin-bottom':overflowX==='scroll' ? `-${scrollBarWidth}` : 0}}
      >
        <table>
          {colgroup}
          <thead>{getTrNodes.call(this)}</thead>
        </table>
      </div>
    </div>
  );
}

export function renderTableBody({ tableData, tableConfigs, simulateScroll, overflowX, overflowY, refName } = {}) {
  const h = this.$createElement;
  const flatTableConfigs=getFlatTableConfigs(tableConfigs)

  const restRowSpanMap = {}

  function getTdNodes(row,rowIndex){
    let restColSpan=0
    return flatTableConfigs.map((config,configIndex)=>{
      if (restRowSpanMap[config.prop] > 0) {
        restRowSpanMap[config.prop] -= 1
        return null
      }
      if (restColSpan>0) {
        restColSpan -= 1
        return null
      }
      
      const colSpan = config.getColSpan?.(TABLE_BODY,row,rowIndex) || 1
      restColSpan = colSpan - 1

      const rowSpan = config.getRowSpan?.(TABLE_BODY,row,rowIndex) || 1
      restRowSpanMap[config.prop] = (rowSpan - 1)
      
      // 处理同时跨行跨列的合并单元格
      for(let i=1;i<=restColSpan;i++){
        restRowSpanMap[flatTableConfigs[configIndex+i].prop] = (rowSpan - 1)
      }

      const attrs={
        colspan:colSpan,
        rowspan:rowSpan
      }
      return h('td',
        isVue3 ? attrs : { attrs },
        [
          <div class={'cell'} style={config.cellStyle}>
            {
              typeof config.render === 'function'
                ? config.render(row[config.prop],row,rowIndex)
                : (row[config.prop] ?? '--')
            }
          </div>
        ])
    })
  }

  function getTrNodes(){
    return tableData.map((row,rowIndex)=>{
      const listener={}
      if(typeof this.rowClick === 'function'){
        const onClickRow = () => this.rowClick(row,rowIndex)
        if(isVue3){
          listener.onClick = onClickRow
        }else{
          listener.on = {}
          listener.on.click = onClickRow
        }
      }
      return h('tr', {
        class:{ fake: !!row.__fake, 'cursor-pointer': typeof this.rowClick === 'function' },
        style:this.getRowStyle?.(TABLE_BODY, rowIndex),
        ...listener,
      }, getTdNodes(row,rowIndex))
      // return <tr class={[row.__fake?'fake':'']}>
      //   {getTdNodes(row,rowIndex)}
      // </tr>
    })
  }

  const scrollBarWidth = getScrollBarWidth.call(this);

  const colgroup=<colgroup>
  {
    flatTableConfigs.map((config) => {
      let width = config.width || config.cellStyle?.width 
      width = typeof width === 'number' ? `${width}px` : width
      return <col style={{ width }}/>
    })
  }
  </colgroup>

  const tableBodyWrapperStyle={
    overflowX:overflowX||'auto',
    overflowY:overflowY||'auto'
  }
  if(overflowX==='scroll'){
    if(simulateScroll) tableBodyWrapperStyle.marginBottom=`-${scrollBarWidth}`
  }
  if(overflowY==='scroll'){
    if(simulateScroll) tableBodyWrapperStyle.marginRight=`-${scrollBarWidth}`
  }
  
  const trackWidth = 8

  const needBorder=this.border && !this.loading && tableData.length

  return (
    <div class={{"table-body__overflow":true}}>{/* 模拟进度条定位的参照节点 */}
      {/* tableBodyWrapper为滚动容器 */}
      <div
        class={{'table-body__wrapper':true,"need-border": needBorder}}
        ref={refName||"tableBodyWrapper"}
        style={tableBodyWrapperStyle}
      >
        {
          this.loading
            ? <div ref="loading" class="loading" key="loading">加载中...</div>
            : !tableData.length
              ? <div ref="noData" class="no-data" key="no-data"><i class="no-data-icon"></i></div>
              : <table>
                  {colgroup}
                  <tbody>{getTrNodes.call(this)}</tbody>
                </table>
        }

        {
          // 表格内容容器的右侧边线
          !this.loading && tableData.length && this.border && overflowY === 'scroll'
            ? <div class="table-body--border-right" style={{right: (!simulateScroll ? scrollBarWidth : 0)}}></div>
            : null
        }

        {
          // 表格内容容器的底部边线
          !this.loading && tableData.length && this.border
            ? <div class="table-body--border-bottom" key="table-bottom-line" style={{right: (overflowY==='scroll' && !simulateScroll ? scrollBarWidth : 0)}}></div>
            : null
        }
        
        {
          simulateScroll
            ? <div class="track" ref="track" style={{width: trackWidth + 'px',borderRadius:trackWidth/2 + 'px'}}>
                <div class="slider" ref="slider" style={{borderRadius:trackWidth/2 + 'px'}}></div>
              </div>
            : null
        }
      </div>

    </div>
  );
}

export function renderTableFoot({ tableData, tableConfigs, simulateScroll, overflowX, overflowY, refName } = {}) {
  const h = this.$createElement;
  const flatTableConfigs=getFlatTableConfigs(tableConfigs)

  const restRowSpanMap = {}

  function getTdNodes(row,rowIndex){
    let restColSpan=0
    return flatTableConfigs.map((config,configIndex)=>{
      if (restRowSpanMap[config.prop] > 0) {
        restRowSpanMap[config.prop] -= 1
        return null
      }
      if (restColSpan>0) {
        restColSpan -= 1
        return null
      }
      
      const colSpan = config.getColSpan?.(TABLE_FOOT,row,rowIndex) || 1
      restColSpan = colSpan - 1

      const rowSpan = config.getRowSpan?.(TABLE_FOOT,row,rowIndex) || 1
      restRowSpanMap[config.prop] = (rowSpan - 1)
      
      // 处理同时跨行跨列的合并单元格
      for(let i=1;i<=restColSpan;i++){
        restRowSpanMap[flatTableConfigs[configIndex+i].prop] = (rowSpan - 1)
      }

      const attrs={
        colspan:colSpan,
        rowspan:rowSpan
      }
      return h('td',
        isVue3 ? attrs : { attrs },
        [
          <div class={'cell'} style={config.cellStyle}>
            {
              typeof config.render === 'function'
                ? config.render(row[config.prop],row,rowIndex)
                : (row[config.prop] ?? '--')
            }
          </div>
        ])
    })
  }

  function getTrNodes(){
    return tableData.map((row,rowIndex)=>{
      const listener={}
      // if(typeof this.rowClick === 'function'){
      //   const onClickRow = () => this.rowClick(row,rowIndex)
      //   if(isVue3){
      //     listener.onClick = onClickRow
      //   }else{
      //     listener.on = {}
      //     listener.on.click = onClickRow
      //   }
      // }
      return h('tr', {
        class:{ fake: !!row.__fake, /* 'cursor-pointer': typeof this.rowClick === 'function' */ },
        style:this.getRowStyle?.(TABLE_FOOT, rowIndex),
        ...listener,
      }, getTdNodes(row,rowIndex))
    })
  }

  const colgroup=<colgroup>
  {
    flatTableConfigs.map((config) => {
      let width = config.width || config.cellStyle?.width 
      width = typeof width === 'number' ? `${width}px` : width
      return <col style={{ width }}/>
    })
  }
  </colgroup>

  const scrollBarXWidth = overflowX === 'scroll' ? getScrollBarWidth.call(this) : 0;
  const scrollBarYWidth = overflowY === 'scroll' ? getScrollBarWidth.call(this) : 0;

  return (
    <div class="table-footer__padding" style={`padding-right:${scrollBarYWidth};`}>
      <div
        class="table-footer__wrapper"
        ref={refName||"tableFootWrapper"}
        style={{"overflow-x": overflowX || 'auto','margin-bottom':overflowX==='scroll'?`-${scrollBarXWidth}`:0}}
      >
        <table>
          {colgroup}
          <tbody>{getTrNodes.call(this)}</tbody>
        </table>
      </div>
    </div>
  );
}
