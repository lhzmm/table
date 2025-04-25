<script>
/* eslint-disable camelcase */
/* eslint-disable no-underscore-dangle */
import debounce from 'lodash/debounce'
import throttle from 'lodash/throttle'

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

export const CHANGE_STATUS_OF_LOADING = 'CHANGE_STATUS_OF_LOADING'
export const CHANGE_STATUS_OF_TABLE_DATA = 'CHANGE_STATUS_OF_TABLE_DATA'
export const FIXED_LEFT = 'left'
export const FIXED_RIGHT = 'right'

// css transform实现方式

export default {
  /* eslint-disable vue/name-property-casing */
  name: 'DcTable',
  props: {
    loading: {
      type: Boolean,
      default: false,
    },
    interval: {
      type: Number,
      default: 800,
    },
    tableConfigs: {
      type: Array,
      default: () => [],
    },
    data: {
      type: Array,
      default: () => [],
    },
    isShow: {
      type: Boolean,
      default: true,
    },
    needAutoScroll: {
      type: Boolean,
      default: false,
    },
    needListenResize: {
      type: Boolean,
      default: true,
    },
    rowClick: { type: Function, default: undefined },
    emptyContent: { type: [Object, String], default: '' },
    exactScrollBarWidth: {
      type: Number,
      default: undefined,
    },
    whenRefreshTableView: {
      type: String,
      default: CHANGE_STATUS_OF_LOADING,
    },
    speed: {
      type: Number,
      default: 0.05, // 0.05px/ms
    },
  },
  data() {
    return {
      scrollX: false,
      scrollY: false,
      fixedLeftLayerWidth: 0,
      fixedLeftTableWidth: 0,
      fixedRightLayerWidth: 0,
      fixedRightTableWidth: 0,
      reachLeftSideOfTable: false,
      reachRightSideOfTable: false,
      refNameForScroll: '',

      innerTableData: [],

      index: 0,
      extraIndex: -1,

      scrollTop: 0,
      transitionDuration: 0,
      // transitionDuration: this.interval,

      scrollTimer: null,
      toTopTimer: null,
      stopDoScroll: false,
      inited: false,
      initing: false,
    }
  },
  computed: {
    tableData() {
      return this.data
    },
    innerTableConfigs() {
      // 归类排序
      const left = []
      const normal = []
      const right = []
      this.tableConfigs.forEach((config) => {
        switch (config.fixed) {
          case FIXED_LEFT:
            left.push(config)
            return
          case FIXED_RIGHT:
            right.push(config)
            return
          default:
            normal.push(config)
        }
      })

      // 生成排序后的表格配置项
      const tableConfigs = left.concat(normal, right)

      // 注入`列索引`
      this.flatTableConfigs(tableConfigs).forEach((config, index) => {
        // eslint-disable-next-line no-param-reassign
        config.colIndex = index
      })

      return tableConfigs
    },
    fixedLeftConfigs() {
      return this.innerTableConfigs.filter((config) => config.fixed === FIXED_LEFT)
    },
    fixedRightConfigs() {
      return this.innerTableConfigs.filter((config) => config.fixed === FIXED_RIGHT)
    },
    scrollBarWidth() {
      if (this.exactScrollBarWidth || this.exactScrollBarWidth === 0) {
        return this.exactScrollBarWidth
      }
      if (/Chrome/.test(window.navigator.userAgent)) {
        const div = document.createElement('div')
        div.height = 0
        div.style.overflowY = 'scroll'
        document.body.appendChild(div)
        const _scrollBarWidth = div.offsetWidth - div.clientWidth
        document.body.removeChild(div)
        return _scrollBarWidth
      }
      return 17
    },
  },
  watch: {
    loading: {
      handler() {
        if (this.whenRefreshTableView !== CHANGE_STATUS_OF_LOADING) return
        if (this.needAutoScroll) {
          if (!this.loading) {
            if (this.isShow && !this.initing) {
              this.doScrollStrategy()
            }
          } else {
            this.resetPropertyValue()
            this.clearTimer()
          }
        } else if (!this.loading) {
          this.innerTableData = [...this.tableData]
          this.$nextTick(() => {
            if (this.$refs.$table_body_wrapper) this.$refs.$table_body_wrapper.scrollTop = 0
            this.assertIfScroll()
          })
        }
      },
      immediate: true,
    },
    tableData: {
      handler() {
        if (this.whenRefreshTableView !== CHANGE_STATUS_OF_TABLE_DATA) return
        if (this.needAutoScroll) {
          this.resetPropertyValue()
          this.clearTimer()
          if (this.isShow && !this.initing) {
            this.doScrollStrategy()
          }
        } else {
          this.innerTableData = [...this.tableData]
          this.$nextTick(() => {
            if (this.$refs.$table_body_wrapper) this.$refs.$table_body_wrapper.scrollTop = 0
            this.assertIfScroll()
          })
        }
      },
      immediate: true,
    },
    // tableData: {
    //   handler() {
    //     this.innerTableData = this.getInnerTableData()
    //     if (!this.needAutoScroll) {
    //       this.$nextTick(() => {
    //         if (this.$refs.$table_body_wrapper) this.$refs.$table_body_wrapper.scrollTop = 0
    //       })
    //     }
    //   },
    //   immediate: true
    // },
    isShow() {
      if (!this.loading) {
        if (this.needAutoScroll) {
          if (this.isShow) {
            if (!this.initing) {
              this.doScrollStrategy()
            }
          } else {
            this.resetPropertyValue()
            this.clearTimer()
          }
        }
      }
    },
  },
  mounted() {
    // console.log(this.rowClick)
    if (this.needListenResize) {
      this.resizeHandler = this.getResizeHandler()
      window.addEventListener('resize', this.resizeHandler)
    }
  },
  beforeDestroy() {
    if (this.needAutoScroll) {
      this.resetPropertyValue()
      this.clearTimer()
    }
    window.removeEventListener('resize', this.resizeHandler)
  },
  methods: {
    getResizeHandler() {
      return debounce(() => {
        if (this.isShow && !this.loading) {
          if (this.needAutoScroll) {
            this.clearTimer()
            this.resetPropertyValue()
            this.doScrollStrategy()
          } else {
            this.assertIfScroll()
          }
        }
      }, 500)
    },

    // -------------------- 自动滚动相关 --------------------
    resetPropertyValue() {
      this.inited = false
      this.initing = false
      this.index = 0
      this.scrollTop = 0
      this.transitionDuration = 0
    },

    doScrollStrategy() {
      if (this.rejectPrevPrepareScrollStrategy) {
        this.rejectPrevPrepareScrollStrategy()
      }
      // this.initing = true
      let _reject
      const cancelPromise = new Promise((resolve, reject) => {
        this.rejectPrevPrepareScrollStrategy = reject
        _reject = reject
      })
      Promise.race([
        new Promise((resolve) => {
          this.innerTableData = [...this.tableData]
          this.$nextTick().then(() => {
            if (this.needScroll()) {
              this.isMoveToTop().then(resolve)
            } else {
              resolve()
            }
          })
        }),
        cancelPromise,
      ])
        .then(() => {
          if (_reject !== this.rejectPrevPrepareScrollStrategy) return // 表示该流程已失效，异步队列中存在更新的doScrollStrategy操作
          if (this.needScroll()) {
            this.innerTableData = this.getInnerTableData()
            this.setScrollTimer()
          }
          this.initing = false
          this.inited = true
        })
        .catch(() => { /*  */ })
    },

    clearTimer() {
      clearTimeout(this.scrollTimer)
      clearInterval(this.toTopTimer)
    },

    mousewheel(e) {
      if (!this.needAutoScroll) return
      e.preventDefault()
    },

    mouseenter() {
      if (!this.needAutoScroll) return
      this.stopDoScroll = true
    },

    mouseleave() {
      if (!this.needAutoScroll) return
      this.stopDoScroll = false
    },

    needScroll() {
      if (this.tableData.length === 0) return false
      if (this.$refs.$table_body_wrapper.clientHeight >= this.$refs.$native_table.clientHeight) {
        return false
      }
      return true
    },

    getInnerTableData() {
      const data = [...this.tableData]
      if (this.tableData.length === 0) return data
      if (this.$refs.$table_body_wrapper.clientHeight >= this.$refs.$native_table.clientHeight) {
        return data
      }
      const container = this.$refs.$table_body_wrapper
      let extraHeight = 0
      let rowIndex = 0
      while (extraHeight < container.clientHeight) {
        const tr = container.querySelectorAll('tr')[rowIndex]
        extraHeight += tr.clientHeight
        data.push(this.tableData[rowIndex])
        rowIndex += 1
      }
      this.extraIndex = this.tableData.length
      return data
    },

    transformEnd(e) {
      // 内部元素可能也存在transform
      if (e.target !== this.$refs.$native_table) return
      this.index += 1
      if (this.index === this.extraIndex) {
        this.index = 0
        this.scrollTop = 0
        this.transitionDuration = 0
        this.isMoveToTop().then(() => {
          this.setScrollTimer()
        })
      } else {
        this.setScrollTimer()
      }
    },

    setScrollTimer() {
      this.scrollTimer = setTimeout(this.scroll, this.interval)
    },

    isMoveToTop() {
      return new Promise((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(resolve)
        })
        // const maxLoop = 10000
        // let i = 0
        // this.toTopTimer = setInterval(() => {
        //   i += 1
        //   if (i > maxLoop) {
        //     clearInterval(this.toTopTimer)
        //     console.error('interval larger than 10000')
        //     return
        //   }
        //   const { $table_body_wrapper, $native_table } = this.$refs
        //   if ($table_body_wrapper.getClientRects()[0].top === $native_table.getClientRects()[0].top) {
        //     clearInterval(this.toTopTimer)
        //     resolve()
        //   }
        //   // try {
        //   // } catch {
        //   //   resolve()
        //   // }
        // }, 16.7)
      })
    },

    scroll(distance = this.getScrollOffset()) {
      // console.log('scroll')
      if (this.stopDoScroll) {
        this.setScrollTimer()
        return
      }
      if (this.$refs.$table_body_wrapper.clientHeight >= this.$refs.$native_table.clientHeight) {
        return
      }
      this.transitionDuration = distance / this.speed
      // FIXME: 存在未知的1px距离
      this.scrollTop = (this.scrollTop === 0 ? 1 : this.scrollTop) + distance
    },

    getScrollOffset(rowIndex = this.index) {
      const container = this.$refs.$table_body_wrapper
      const tr = container.querySelectorAll('tr')[rowIndex]
      // console.log('tr.clientHeight', tr.getClientRects()[0].height)
      return tr.getClientRects()[0].height
    },

    // ------------------------------------- 固定列相关 -------------------------------------
    assertIfScroll() {
      const { $table_body_wrapper, $native_table } = this.$refs
      if (!$native_table) {
        this.scrollX = false
        this.scrollY = false
        return
      }
      this.scrollX = this.$el.clientWidth < $native_table.clientWidth
      this.scrollY = $table_body_wrapper.clientHeight < $native_table.clientHeight
      this.$nextTick(() => {
        if (this.fixedLeftConfigs.length) {
          this.assertReachLeftSideOfTable()
          this.calcLeftFixedWidth()
        }
        if (this.fixedRightConfigs.length) {
          this.assertReachRightSideOfTable()
          this.calcRightFixedWidth()
        }
      })
    },

    assertReachLeftSideOfTable() {
      if (this.fixedLeftConfigs.length && this.tableData.length) {
        this.reachLeftSideOfTable = this.$refs.$scroll_container.scrollLeft === 0
      } else {
        this.reachLeftSideOfTable = false
      }
    },
    assertReachRightSideOfTable() {
      if (this.fixedRightConfigs.length && this.tableData.length) {
        this.reachRightSideOfTable = Math.round(this.$refs.$scroll_container.scrollLeft) + this.$el.clientWidth === this.$refs.$align_container.clientWidth
      } else {
        this.reachRightSideOfTable = false
      }
    },

    calcFixedWidth(fixedConfigs) {
      if (fixedConfigs.length === 0 || this.tableData.length === 0) {
        return { fixedLayerWidth: 0 }
      }
      const flatedFixedConfigs = this.flatTableConfigs(fixedConfigs)
      const tds = Array.from(this.$refs.$native_table.querySelector('tr').children).slice(flatedFixedConfigs[0].colIndex, flatedFixedConfigs[flatedFixedConfigs.length - 1].colIndex + 1)
      const width = tds.reduce((prev, td) => prev + td.clientWidth, 0)
      return { fixedLayerWidth: width }
    },
    calcLeftFixedWidth() {
      const { fixedLayerWidth } = this.calcFixedWidth(this.fixedLeftConfigs)
      this.fixedLeftLayerWidth = fixedLayerWidth
      this.fixedLeftTableWidth = this.$refs.$align_container.clientWidth
    },
    calcRightFixedWidth() {
      let { fixedLayerWidth } = this.calcFixedWidth(this.fixedRightConfigs)
      if (this.scrollY) {
        fixedLayerWidth += this.scrollBarWidth
      }
      this.fixedRightLayerWidth = fixedLayerWidth
      this.fixedRightTableWidth = this.$refs.$align_container.clientWidth
      this.$nextTick(() => {
        this.$el.querySelector('.right-fixed-layer').scrollLeft = this.$refs.$align_container.clientWidth - fixedLayerWidth
      })
    },

    syncScrollTopForTable(refNames) {
      return throttle((e) => {
        refNames.forEach((refName) => {
          if (this.$refs[refName]) {
            this.$refs[refName].scrollTop = e.target.scrollTop
          }
        })
      }, 17, { leading: false })
    },

    getMaxDeep(configs = [], countDeep = 1) {
      const temp = []
      for (let i = 0; i < configs.length; i += 1) {
        const config = configs[i]
        if (config.subHeads?.length) {
          temp.push(this.getMaxDeep(config.subHeads, countDeep + 1))
        } else {
          temp.push(countDeep)
        }
      }
      return Math.max.apply(null, temp)
    },
    flatTableConfigs(configs) {
      return configs.reduce((prev, config) => {
        if (config.subHeads?.length) {
          return prev.concat(this.flatTableConfigs(config.subHeads))
        }
        return prev.concat(config)
      }, [])
    },
    // --------------------- 渲染 ---------------------
    renderHead(tableConfigs = this.innerTableConfigs) {
      const maxDeep = this.getMaxDeep(tableConfigs)// 多级头部最大深度
      return (
        <div class="table-header__wrapper">
          <table>
            <thead>
              {
                (() => {
                  const nodes = []
                  for (let deep = 1; deep <= maxDeep; deep += 1) {
                    let configs = tableConfigs
                    for (let i = 2; i <= deep; i += 1) {
                      configs = configs.reduce((prev, config) => prev.concat(config.subHeads || []), [])
                    }
                    const node = (
                    <tr>
                      {
                        configs.map((config) => {
                          let content
                          if (config.renderHead) {
                            content = config.renderHead()
                          } else if (this.$scopedSlots.head) {
                            content = this.$scopedSlots.head(config)
                          } else {
                            content = config.label
                          }
                          return <th
                            key={config.prop}
                            style={{
                              /* eslint-disable-next-line */
                              width: config.width ? (typeof config.width === 'number' ? `${config.width}px` : config.width) : '',
                              ...(config.headStyle || config.cellStyle),
                            }}
                            rowspan={config.headRowspan || 1}
                            colspan={config.headColspan || 1}
                          >
                            {content}
                          </th>
                        })
                      }
                      {this.scrollY && deep === 1 ? <th class="gutter" rowspan={maxDeep} style={{ width: `${this.scrollBarWidth}px` }}></th> : null}
                    </tr>
                    )
                    nodes.push(node)
                  }
                  return nodes
                })()
              }
            </thead>
          </table>
        </div>
      )
    },

    renderContent(tableConfigs = this.innerTableConfigs, fixedPosition) {
      // const h = this.$createElement
      if (this.tableData.length === 0) {
        if (this.loading) {
          return (
            <div class="loading">
              <i></i>加载中...
            </div>
          )
        }
        const defaultEmptyNode = <div style="max-height:100%" class="flex flex-col items-center flex-auto">
          <img src="https://zjwater-public-files.oss-cn-hangzhou.aliyuncs.com/qtj/packageStatic/pc/static/images/no_data.png" style="flex:1;min-height:0;max-width:240px;"/>
          <p class="flex-none">暂无数据</p>
        </div>
        const content = this.emptyContent || this.$slots.empty || defaultEmptyNode
        return <div class="no-data">{content}</div>
      }
      let overflowY = 'auto'
      if (this.needAutoScroll) {
        overflowY = 'hidden'
      }
      if (this.scrollY) {
        overflowY = 'scroll'
      }
      let onScroll = noop
      if (fixedPosition) {
        onScroll = this.syncScrollTopForTable(['$table_body_wrapper', `$${fixedPosition === FIXED_LEFT ? FIXED_RIGHT : FIXED_LEFT}_fixed_table_body_wrapper`])
      } else {
        onScroll = this.syncScrollTopForTable([`$${FIXED_LEFT}_fixed_table_body_wrapper`, `$${FIXED_RIGHT}_fixed_table_body_wrapper`])
      }
      const skipRowMap = {}

      return (
        <div
          ref={fixedPosition ? `$${fixedPosition}_fixed_table_body_wrapper` : '$table_body_wrapper'}
          class={{ 'table-body__wrapper': true, 'no-scroll-bar': this.exactScrollBarWidth === 0 }}
          style={{ overflowY }}
          onScroll={onScroll}
          // onMousewheel={this.mousewheel}
          onMouseenter={this.mouseenter}
          onMouseleave={this.mouseleave}
        >
          <table
            ref={fixedPosition ? '' : '$native_table'}
            onTransitionend={this.transformEnd}
            style={{ transform: `translateY(-${this.scrollTop}px)`, transition: `transform linear ${this.transitionDuration}ms` }}
          >
            <tbody>
              {this.innerTableData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  onClick={() => {
                    // eslint-disable-next-line no-unused-expressions
                    this.rowClick && this.rowClick(row)
                  }}
                  style={{ cursor: this.rowClick ? 'pointer' : '' }}
                >
                  {
                    this.flatTableConfigs(tableConfigs).map((config) => {
                      if (skipRowMap[config.prop] > 0) {
                        skipRowMap[config.prop] -= 1
                        return null
                      }
                      const rowspan = config.getRowspan?.() || 1
                      skipRowMap[config.prop] += (rowspan - 1)

                      let content
                      if (config.render) {
                        content = config.render(row[config.prop], row, rowIndex)
                      } else if (this.$scopedSlots.default) {
                        content = this.$scopedSlots.default({ row, config })
                      } else {
                        content = row[config.prop]
                      }

                      return (
                        <td
                          key={config.prop}
                          style={{
                            /* eslint-disable-next-line */
                            width: config.width ? (typeof config.width === 'number' ? `${config.width}px` : config.width) : '',
                            ...config.cellStyle,
                          }}
                          colspan={config.headColspan || 1}
                          rowspan={rowspan}
                        >
                          <div class="div-cell">
                            {content}
                          </div>
                        </td>
                      )
                    })
                  }
                  {/* this.fixedConfigs.length && !isFixedTable ? <td style={{ width: this.scrollBarWidth + 'px', padding: 0 }}></td> : null */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    },
  },
  render() {
    const fixedNodes = []
    if (!this.loading && !this.needAutoScroll) {
      if (this.innerTableData.length && this.fixedLeftConfigs.length) {
        fixedNodes.push(<div class={`shadow ${FIXED_LEFT}`} style={{ display: this.reachLeftSideOfTable ? 'none' : '', left: `${this.fixedLeftLayerWidth}px` }}></div>)
        fixedNodes.push(
          <div
            class={`${FIXED_LEFT}-fixed-layer`}
            style={{ bottom: this.scrollX ? `${this.scrollBarWidth}px` : 0, width: `${this.fixedLeftLayerWidth}px` }}
          >
            <div class="fixed-table" style={{ width: `${this.fixedTableWidth}px` }}>
              {this.renderHead()}
              {this.renderContent(this.innerTableConfigs, FIXED_LEFT)}
            </div>
          </div>,
        )
      }
      if (this.innerTableData.length && this.fixedRightConfigs.length) {
        fixedNodes.push(<div class={`shadow ${FIXED_RIGHT}`} style={{ display: this.reachRightSideOfTable ? 'none' : '', right: `${this.fixedRightLayerWidth}px` }}></div>)
        fixedNodes.push(
          <div
            class={`${FIXED_RIGHT}-fixed-layer`}
            style={{ bottom: this.scrollX ? `${this.scrollBarWidth}px` : 0, width: `${this.fixedRightLayerWidth}px` }}
          >
            <div class="fixed-table" style={{ width: `${this.fixedTableWidth}px` }}>
              {this.renderHead()}
              {this.renderContent(this.innerTableConfigs, FIXED_RIGHT)}
            </div>
          </div>,
        )
      }
    }
    return (
      // <div class="table" vLoading={this.loading}>
      <div class="table">
        <div
          ref="$scroll_container" class="scroll-container"
          onScroll={this.scrollX ? () => { this.assertReachLeftSideOfTable(); this.assertReachRightSideOfTable() } : noop}
        >
          <div ref="$align_container" class="align-container">
            {this.renderHead()}
            {this.renderContent()}
          </div>
        </div>
        {fixedNodes}
      </div>
    )
  },
}
</script>

<style lang="less" scoped>
.table {
  height: 100%;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 0;
  table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    tr {
      &:nth-child(odd) {
        background-color: #dfe7f6;
      }
      &:nth-child(even) {
        background-color: #cbd9f7;
      }
    }
    td,
    th {
      text-align: center;
      font-size: 16px;
      line-height: 24px;
      padding: 8px;
      white-space: pre-wrap;
      // padding-left: 30px;
      // padding-right: 4px;
    }
    th {
      // padding-top: 11px;
      // padding-bottom: 11px;
      // font-weight: bold;
      color: #415b97;
      background-color: #b0c6f6;
      // border-bottom: 1PX solid #ebeff2;
    }
    th.gutter {
      padding: 0px;
    }
    td {
      // padding-top: 13px;
      // padding-bottom: 13px;
      // border-bottom: 1PX solid #ebeff2;
      color: #333;
      a{
        color: #37a8ff;
      }
    }
  }
  .div-cell {
    word-break: break-all;
    // max-width: 100%;
    // overflow: hidden;
    // text-overflow: ellipsis;
    // white-space: nowrap;
  }
  .loading {
    margin: 16px 0;
    line-height: 20px;
    font-size: 14px;
    text-align: center;
    color: #707683;
    > * {
      vertical-align: middle;
    }
    i {
      display: inline-block;
      box-sizing: content-box !important;
      height: 10px;
      width: 10px;
      border: 1px solid;
      box-sizing: border-box;
      border-radius: 100%;
      border-right-color: transparent;
      margin-right: 8px;
      animation: loading_indication 1000ms linear infinite both;
      vertical-align: -2px;
    }
  }
  .no-data {
    color: #a6becc;
    // color:#fff;
    padding: 16px 0;
    line-height: 20px;
    font-size: 14px;
    text-align: center;
    letter-spacing: 1px;

    min-height: 0;
    flex: 1;
    display: flex;
    align-items: center;
  }
}
.table-header__wrapper {
  flex: 0 0 auto;
  min-width: 100%;
  // overflow: hidden;
  align-self: flex-start;
}
.table-body__wrapper {
  overflow: hidden;
  min-width: 100%;
  align-self: flex-start;
  flex: 1 1 auto;
  min-height: 0;
  // border-bottom: 1PX solid #ebeff2;
  &.no-scroll-bar::-webkit-scrollbar{
    display:none;
  }
  tbody tr:last-child {
    td {
      border-bottom-color: transparent;
    }
  }
}
.scroll-container {
  overflow-y: hidden;
  flex: auto;
  height: 100%;
  display: flex;
  flex-direction: column;
}
// 对齐头部和内容的宽度，尤其是内容无数据时
.align-container {
  display: inline-flex;
  flex-direction: column;
  flex: 1;
  align-self: flex-start;
  min-width: 100%;
  min-height: 0;
  position: relative;
}
.left-fixed-layer,.right-fixed-layer {
  right: 0;
  top: 0;
  bottom: 0;
  position: absolute;
  background-color: #fff;
  overflow: hidden;
}
.left-fixed-layer{
  left:0;
  right:auto;
}
.fixed-table {
  display: flex;
  height: 100%;
  flex-direction: column;
}
.shadow {
  position: absolute;
  right: 0;
  width: 1px;
  top: 4px;
  bottom: 4px;
  box-shadow: 0 0 4px 0px #9e9e9e;
}
::v-deep .el-button--text {
  padding: 0;
}
::v-deep svg.circular {
  margin: 0 auto;
}
</style>

<style>
@keyframes loading_indication {
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
