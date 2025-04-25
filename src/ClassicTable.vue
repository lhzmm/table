<script>
import {BASE_TABLE_PROPS} from './mixin'
import {renderTableHead, renderTableBody, getScrollBarWidth, renderTableFoot, TABLE_HEAD} from './render'
import {LhResizeObserver} from '@lhzmm/tools'
import debounce from 'lodash/debounce'
import {createId, inject$createElement} from './utils'

export default inject$createElement({
  name:'DcClassicTable',
  props:{
    ...BASE_TABLE_PROPS,
    needScrollBarResetToTopWhenDataChange:{
      type:Boolean,
      default:true,
    },
    fixedBottomRows:{
      type:Number,
      default:0
    }
  },
  data(){
    return {
      overflowX:'auto',
      overflowY:'auto',
      scrollLeft:0,
      scrollTop:0,
      reachLeftSide:false,
      reachRightSide:false,
      dataId:createId()
    }
  },
  mounted(){
    if(this.loading){
      this.initLoading()
    }else if(!this.data.length){
      this.initNoData()
    }else{
      this.initData()
    }

    this._onResize=debounce(()=>{
      if(this.$el.clientWidth){// 组件可见时
        this.onResize()
      }
    },500)
    this.ob=new LhResizeObserver()
    this.ob.observe(this.$el,this._onResize)
  },
  // vue2中组件销毁时调用
  beforeDestroy(){
    this.ob.unobserve(this.$el,this._onResize)
  },
  // vue3中组件销毁时调用
  beforeUnmount(){
    this.ob.unobserve(this.$el,this._onResize)
  },
  computed:{
    fixedLeftTableConfigs(){
      return this.findFixedConfigs(this.tableConfigs,'left')
    },
    fixedRightTableConfigs(){
      return this.findFixedConfigs(this.tableConfigs,'right')
    },
    tableData(){
      if(this.fixedBottomRows){
        return this.data.slice(0,-this.fixedBottomRows)
      }
      return this.data
    },
    bottomTableData(){
      if(this.fixedBottomRows){
        return this.data.slice(-this.fixedBottomRows)
      }
      return []
    },
    statusId(){
      return this.loading +';'+ this.data.length +';'+ this.dataId
    }
  },
  watch:{
    data:{
      handler(){
        this.dataId=createId()
      },
    },
    statusId(...args){
      const prevStatus=args[1]
      let [prevLoading,prevDataLength]=prevStatus.split(';')
      prevDataLength=Number(prevDataLength)
      prevLoading = prevLoading === 'true'
      if(this.loading){
        if(prevLoading!==this.loading){// 第一次加载loading视图
          this.resetOverflow(this.initLoading)
        }
      }else{
        if(prevLoading!==this.loading){
          if(this.data.length){
            // 第一次加载数据视图
            this.resetOverflow(this.initData)
          }else{
            // 第一次加载无数据视图
            this.resetOverflow(this.initNoData)
          }
        }else{// 数据视图更新
          if(prevDataLength===0 && prevDataLength===this.data.length){// 无 -> 无
            /* not do anything */
          }else if(prevDataLength>0 && !this.data.length){ // 有 -> 无
            this.resetOverflow(this.initNoData)
          } else { // 无 -> 有、有 -> 有
            this.resetOverflow(this.initData)// 数据更新
          }
        }
      }
    },
    tableConfigs(){
      this.onResize()
    },
  },
  activated(){
    // 当组件从keep-alive缓存中取出插入DOM时，会触发resizeObserver，自动调用onResize函数
  },
  methods:{
    /**
     * 优先使用cb的形式，保证在如下微任务队列中按正确顺序回调：
     * 
     * cb形式：
     * ajax then回调 => then回调中产生的renderWatcher => then回调执行完成后，添加一个finally的回调 => [ then回调中产生的renderWatcher的执行过程中nextTick的cb, finally回调产生的renderWatcher]
     * 
     * then形式：
     * ajax then回调 => then回调中产生的renderWatcher => then回调执行完成后，添加一个finally的回调 => [ then回调中产生的renderWatcher的执行过程中nextTick的Promise的resolve, finally回调产生的renderWatcher] => nextTick的then
     * 
     * @param {Function} cb 组件渲染后的回调
     * @return {Promise} Promise
     */
    resetOverflow(cb){
      this.overflowX='auto'
      this.overflowY='auto'
      return this.$nextTick(cb)
    },
    initLoading(){
      this.stopSyncTableScrollPositionWhenScroll()// 移除之前的滚动监听
      this.syncTableScrollPositionWhenScroll()// 重新添加滚动监听

      this.syncTableWidth()
      // resize和tableConfigs变化时，恢复视图为初始状态，重新计算滚动的可能性
      this.$refs.loading.style.setProperty('height','')
      
      this.assertOverflow()
      
      if(this.overflowX==='scroll' && this.overflowY==='scroll'){
        // y轴出现滚动条，表头padding-right模拟滚动条宽度时，可能导致表头宽度变化，导致loading容器宽度变小，可能会影响loading容器的高度变小，导致y轴滚动条无意义
        // 所以，固定loading容器高度
        this.$refs.loading.style.setProperty('height',this.$refs.loading.offsetHeight + 'px')

        this.$nextTick().then(()=>{
          // 表头宽度可能变化，需要重新同步一次
          this.syncTableWidth() 
          // 本身表格宽度大于容器宽度时，同步宽度不会引起布局变化
          // 但当仅是y轴溢出时，同步宽度可能会使x轴的溢出消失，但不影响y轴的溢出
          this.assertOverflow()

          // 恢复scrollLeft
          this.$refs.mainTableHeadWrapper.scrollLeft = this.scrollLeft
          this.scrollLeft = this.$refs.mainTableHeadWrapper.scrollLeft // 有可能this.scrollLeft大于最大可滚动的距离
          this.$refs.mainTableBodyWrapper.scrollLeft = this.scrollLeft
        })
      }

      if(this.overflowX==='scroll'&&this.overflowY==='hidden'){
        // 恢复scrollLeft
        this.$refs.mainTableHeadWrapper.scrollLeft = this.scrollLeft
        this.scrollLeft = this.$refs.mainTableHeadWrapper.scrollLeft // 有可能this.scrollLeft大于最大可滚动的距离
        this.$refs.mainTableBodyWrapper.scrollLeft = this.scrollLeft
      }

      if(this.overflowX==='hidden' && this.overflowY==='hidden'){
        this.scrollLeft = 0
      }

      if(this.needScrollBarResetToTopWhenDataChange){
        this.scrollTop = 0
        this.$refs.mainTableBodyWrapper.scrollTop = 0
      }else{
        this.$refs.mainTableBodyWrapper.scrollTop=this.scrollTop
        // 有可能this.scrollTop大于最大可滚动的距离，需要重新同步下当前的scrollTop
        this.scrollTop=this.$refs.mainTableBodyWrapper.scrollTop
      }
    },
    initNoData(){
      this.stopSyncTableScrollPositionWhenScroll()// 移除之前的滚动监听
      this.syncTableScrollPositionWhenScroll()// 重新添加滚动监听

      this.syncTableWidth()
      // resize和tableConfigs变化时，恢复视图为初始状态，重新计算滚动的可能性
      this.$refs.noData.querySelector('.no-data-icon').style.setProperty('width','')
      
      this.assertOverflow()

      if(this.overflowX==='scroll' && this.overflowY==='scroll'){
        // y轴出现滚动条，表头padding-right模拟滚动条宽度时，可能导致表头宽度变化，导致noData容器宽度变小，使no-data-icon元素的高度变小，导致y轴不溢出，滚动条无意义
        // 所以，固定noData容器宽度
        this.$refs.noData.querySelector('.no-data-icon').style.setProperty('width',this.$refs.noData.querySelector('.no-data-icon').offsetWidth+'px')

        this.$nextTick().then(()=>{
          // 表头宽度可能变化，需要重新同步一次
          this.syncTableWidth() 
          // 本身表格宽度大于容器宽度时，同步宽度不会引起布局变化
          // 但当仅是y轴溢出时，同步宽度可能会使x轴的溢出消失，但不影响y轴的溢出
          this.assertOverflow()

          // 恢复scrollLeft
          this.$refs.mainTableHeadWrapper.scrollLeft = this.scrollLeft
          this.scrollLeft = this.$refs.mainTableHeadWrapper.scrollLeft // 有可能this.scrollLeft大于最大可滚动的距离
          this.$refs.mainTableBodyWrapper.scrollLeft = this.scrollLeft
        })
      }

      if(this.overflowX==='scroll'&&this.overflowY==='hidden'){
        // 恢复scrollLeft
        this.$refs.mainTableHeadWrapper.scrollLeft = this.scrollLeft
        this.scrollLeft = this.$refs.mainTableHeadWrapper.scrollLeft // 有可能this.scrollLeft大于最大可滚动的距离
        this.$refs.mainTableBodyWrapper.scrollLeft = this.scrollLeft
      }

      if(this.overflowX==='hidden' && this.overflowY==='hidden'){
        this.scrollLeft = 0
      }
      
      if(this.needScrollBarResetToTopWhenDataChange){
        this.scrollTop = 0
        this.$refs.mainTableBodyWrapper.scrollTop = 0
      }else{
        this.$refs.mainTableBodyWrapper.scrollTop=this.scrollTop
        // 有可能this.scrollTop大于最大可滚动的距离，需要重新同步下当前的scrollTop
        this.scrollTop=this.$refs.mainTableBodyWrapper.scrollTop
      }
    },
    initData(){
      this.stopSyncTableScrollPositionWhenScroll()// 移除之前的滚动监听
      this.syncTableScrollPositionWhenScroll()// 重新添加滚动监听

      this.assertOverflow()

      // if(this.overflowY==='scroll'&&this.fixedBottomRows){
      //   // 等待dc-fixed-bottom-table渲染后，重新添加滚动监听
      //   this.$nextTick(()=>{
      //     this.syncTableScrollPositionWhenScroll()
      //   })
      // }else{
      //   this.syncTableScrollPositionWhenScroll()// 重新添加滚动监听
      // }

      // 恢复或初始化纵向滚动条
      if(this.needScrollBarResetToTopWhenDataChange){
        this.scrollTop = 0
        this.$refs.mainTableBodyWrapper.scrollTop = this.scrollTop
      }else{
        this.$refs.mainTableBodyWrapper.scrollTop=this.scrollTop
        // 有可能this.scrollTop大于最大可滚动的距离，需要重新同步下当前的scrollTop
        this.scrollTop=this.$refs.mainTableBodyWrapper.scrollTop
      }
      
      // 同步左右固定表格的scrollTop
      if(this.$refs.leftFixedTableBodyWrapper){
        this.$refs.leftFixedTableBodyWrapper.scrollTop = this.scrollTop
      }
      if(this.$refs.rightFixedTableBodyWrapper){
        this.$refs.rightFixedTableBodyWrapper.scrollTop = this.scrollTop
      }

      // 如果表格内容会纵向滚动的话，渲染后table-header__wrapper宽度会扣除纵向滚动条的宽度
      this.$nextTick().then(()=>{
        // 等table-header__wrapper宽度确定后

        // 恢复或初始化横向滚动条
        this.$refs.mainTableHeadWrapper.scrollLeft = this.scrollLeft
        this.scrollLeft = this.$refs.mainTableHeadWrapper.scrollLeft // 有可能this.scrollLeft大于最大可滚动的距离
        this.$refs.mainTableBodyWrapper.scrollLeft = this.scrollLeft

        if(this.fixedLeftTableConfigs.length){
          this.calcFixedLeft()
        }
        
        if(this.fixedRightTableConfigs.length){
          this.calcFixedRight() 
        }

        this.calcReachStatus()
      })
    },
    onResize(){
      // console.log('resize')
      if(this.loading){
        this.resetOverflow(this.initLoading)
      }else if(!this.data.length){
        this.resetOverflow(this.initNoData)
      }else{
        this.resetOverflow(this.initData)
      }
    },
    assertOverflow(){
      this.assertOverflowX()
      this.assertOverflowY()
    },
    assertOverflowX(){
      this.overflowX = this.$refs.mainTableBodyWrapper.scrollWidth > this.$refs.mainTableBodyWrapper.clientWidth ? 'scroll':'hidden'
      // this.overflowX = this.$refs.mainTableBodyWrapper.offsetHeight > this.$refs.mainTableBodyWrapper.clientHeight ? 'scroll':'hidden'
    },
    assertOverflowY(){
      this.overflowY = this.$refs.mainTableBodyWrapper.scrollHeight > this.$refs.mainTableBodyWrapper.clientHeight ? 'scroll':'hidden'
      // this.overflowY = this.$refs.mainTableBodyWrapper.offsetWidth > this.$refs.mainTableBodyWrapper.clientWidth ? 'scroll':'hidden'
    },
    calcReachStatus(){
      this.reachLeftSide = this.scrollLeft === 0
      this.reachRightSide = this.$refs.mainTableBodyWrapper.scrollWidth - this.$refs.mainTableBodyWrapper.clientWidth - this.scrollLeft < 1
    },
    calcFixedLeft(){
      // const width = Array.from(this.$refs.mainTableHeadWrapper.querySelectorAll('table thead tr:first-child th'))
      //   .slice(0, this.fixedLeftTableConfigs.length)
      const width = this.fixedLeftTableConfigs
        .map(config=>{
          return this.$refs.mainTableHeadWrapper
            .querySelector(`table thead tr:nth-child(${config._rowIndex+1}) th:nth-child(${config._columnIndex+1})`)
        })
        .reduce((prev, node) => prev + Number(getComputedStyle(node).width.replace('px','')), 0)
        .toFixed()-0
      const borderLeftWidth = 1

      const refs=[
        {
          ref:this.$refs.dcFixedLeftTable,
          tableHeaderWrapperSelector:'.table-header__wrapper',
          tableBodyWrapperSelector:'.table-body__wrapper',
          tableBodyOverflowSelector:'.table-body__overflow',
        },
        {
          ref:this.$refs.dcBottomFixedLeftTable,
          tableBodyWrapperSelector:'.table-footer__wrapper',
        }
      ]
      refs.forEach((item)=>{
        const {ref}=item
        
        if(!ref) return

        ref.style.setProperty('width', width + borderLeftWidth + 'px')
        const headWidth=this.$refs.mainTableHeadWrapper.querySelector('table').offsetWidth
        const bodyWidth=this.$refs.mainTableBodyWrapper.querySelector('table').offsetWidth
  
        if(item.tableHeaderWrapperSelector){
          ref.querySelector(item.tableHeaderWrapperSelector+' table').style.setProperty('width',headWidth+'px')
        }
        if(item.tableBodyWrapperSelector){
          ref.querySelector(item.tableBodyWrapperSelector+' table').style.setProperty('width',bodyWidth+'px')
        }
        if(item.tableBodyOverflowSelector){
          if(this.overflowY==='scroll'){
            ref.querySelector(item.tableBodyOverflowSelector).style.setProperty('margin-right',`-${getScrollBarWidth.call(this)}`)
          }else{
            ref.querySelector(item.tableBodyOverflowSelector).style.setProperty('margin-right','')
          }
        }
      })
    },
    calcFixedRight(){
      // const thsWidth = Array.from(this.$refs.mainTableHeadWrapper.querySelectorAll('table thead tr:first-child th'))
      //   .slice(-this.fixedRightTableConfigs.length)
      const thsWidth = this.fixedRightTableConfigs
        .map((config) => {
          const ths = this.$refs.mainTableHeadWrapper.querySelectorAll(`table thead tr:nth-child(${config._rowIndex + 1}) th`)
          return ths[ths.length - 1 - config._columnIndex]
        })
        .reduce((prev, node) => prev + Number(getComputedStyle(node).width.replace('px','')), 0)
        .toFixed()-0
        const borderRightWidth = 1
        const headWidth=this.$refs.mainTableHeadWrapper.querySelector('table').offsetWidth
        const bodyWidth=this.$refs.mainTableBodyWrapper.querySelector('table').offsetWidth
        const refs=[
          {
            ref:this.$refs.dcFixedRightTable,
            tableHeaderWrapperSelector:'.table-header__wrapper',
            tableBodyWrapperSelector:'.table-body__wrapper',
            tableBodyOverflowSelector:'.table-body__overflow',
          },
          {
            ref:this.$refs.dcBottomFixedRightTable,
            tableBodyWrapperSelector:'.table-footer__wrapper',
          }
        ]
        
        refs.forEach(item=>{
          const {ref}=item
          if(!ref) return

          ref.style.setProperty('width', `calc(${thsWidth + borderRightWidth}px + ${this.overflowY === 'scroll' ? getScrollBarWidth.call(this) : '0px'})`)
          if(item.tableHeaderWrapperSelector){
            ref.querySelector(item.tableHeaderWrapperSelector+' table').style.setProperty('width',headWidth+'px')
            const headWrapper = ref.querySelector(item.tableHeaderWrapperSelector)
            headWrapper.scrollLeft = headWrapper.scrollWidth - thsWidth
          }
          if(item.tableBodyWrapperSelector){
            ref.querySelector(item.tableBodyWrapperSelector+' table').style.setProperty('width',bodyWidth+'px')
            const bodyWrapper = ref.querySelector(item.tableBodyWrapperSelector)
            bodyWrapper.scrollLeft = bodyWrapper.scrollWidth - thsWidth
          }
        })


      // // 等待DOM节点的overflow状态更新后，再修改scrollLeft
      // this.$nextTick(()=>{
        // const head = dcFixedRightTable.querySelector('.table-header__wrapper')
        // head.scrollLeft = head.scrollWidth - thsWidth
        // const body = dcFixedRightTable.querySelector('.table-body__wrapper')
        // body.scrollLeft = body.scrollWidth - thsWidth
      // })
    },
    syncTableWidth(){
      /**
       * TODO
       * 使用伪元素模拟table-header__wrapper的border，从而保证1px大小正确。
       * 或者重构单元格边框的实现，不要使用`border-collapse:collapse`
       */
      const width = this.$refs.mainTableHeadWrapper.querySelector('table').clientWidth - 1 + 'px'

      const nodes = [
        this.$refs.loading,
        this.$refs.noData,
      ].filter(Boolean)
      
      nodes.forEach(node=>{
        node.style.setProperty('width',width)
      })
    },
    /**
     * 找到每一个fixed项对应的配置并标记其th标签在表头DOM结构中的行列位置
     * 当左固定时，当前tr的第一个th标记_columnIndex为0，_columnIndex从左到右递增
     * 当右固定时，当前tr的最后一个th标记_columnIndex为0，_columnIndex从右到左递增
     */
    findFixedConfigs(configs, position) {
      let rowIndex = -1
      const rowIndexMapToColumnIndex = {}
      function _findFixedConfigs(configs, position) {
        const result = []

        function dealWith(config) {
          if (config.fixed === position) {
            const _rowIndex = rowIndex + 1
            rowIndexMapToColumnIndex[_rowIndex] = (rowIndexMapToColumnIndex[_rowIndex] ?? -1) + 1
            result.push({ ...config, _rowIndex, _columnIndex: rowIndexMapToColumnIndex[_rowIndex] })
          } else if (config.children && config.children.length) {
            const rowspan = config.getRowSpan?.(TABLE_HEAD) || 1
            const originRowIndex = rowIndex
            rowIndex = rowIndex + rowspan
            result.push(..._findFixedConfigs(config.children, position))
            rowIndex = originRowIndex
          }
        }

        switch (position) {
          case 'left':
            // 正序循环
            for (let i = 0; i < configs.length; i += 1) {
              dealWith(configs[i])
            }
            break
          case 'right':
            // 倒序循环
            for (let i = configs.length - 1; i > -1; i -= 1) {
              dealWith(configs[i])
            }
            break
          default:
        }

        return result
      }

      return _findFixedConfigs(configs, position)
    },
    syncTableScrollPositionWhenScroll(){
      const {mainTableHeadWrapper, mainTableBodyWrapper, rightFixedTableBodyWrapper, leftFixedTableBodyWrapper, mainTableFootWrapper}=this.$refs
      mainTableHeadWrapper.addEventListener('scroll', this.onScroll, {passive:true})
      mainTableBodyWrapper.addEventListener('scroll', this.onScroll, {passive:true})
      if(leftFixedTableBodyWrapper){
        leftFixedTableBodyWrapper.addEventListener('scroll',this.onScroll, {passive:true})
      }
      if(rightFixedTableBodyWrapper){
        rightFixedTableBodyWrapper.addEventListener('scroll',this.onScroll, {passive:true})
      }
      if(mainTableFootWrapper){
        mainTableFootWrapper.addEventListener('scroll',this.onScroll, {passive:true})
      }
    },
    stopSyncTableScrollPositionWhenScroll(){
      const {mainTableHeadWrapper,mainTableBodyWrapper,rightFixedTableBodyWrapper,leftFixedTableBodyWrapper, mainTableFootWrapper}=this.$refs
      mainTableHeadWrapper.removeEventListener('scroll', this.onScroll)
      mainTableBodyWrapper.removeEventListener('scroll', this.onScroll)
      if(leftFixedTableBodyWrapper){
        leftFixedTableBodyWrapper.removeEventListener('scroll',this.onScroll)
      }
      if(rightFixedTableBodyWrapper){
        rightFixedTableBodyWrapper.removeEventListener('scroll',this.onScroll)
      }
      if(mainTableFootWrapper){
        mainTableFootWrapper.removeEventListener('scroll',this.onScroll)
      }
    },
    onScroll(e){
      const {
        mainTableHeadWrapper,
        mainTableBodyWrapper, 
        leftFixedTableBodyWrapper, 
        rightFixedTableBodyWrapper, 
        mainTableFootWrapper 
      } = this.$refs
      // 同步主表格表头和内容以及底部固定表格的横向滚动
      if(
        // 仅检测可横向滚动容器的scrollLeft变化，因为当非横向滚动但能纵向滚动的元素纵向滚动时，scrollLeft为0
        [mainTableHeadWrapper, mainTableBodyWrapper, mainTableFootWrapper].includes(e.target)
        && e.target.scrollLeft!==this.scrollLeft
      ){
        this.scrollLeft=e.target.scrollLeft
        mainTableHeadWrapper.scrollLeft=this.scrollLeft
        mainTableBodyWrapper.scrollLeft=this.scrollLeft
        if(mainTableFootWrapper) mainTableFootWrapper.scrollLeft=this.scrollLeft
        this.calcReachStatus()
      }
      // 同步主表格和可能存在的左右固定表格的纵向滚动距离
      if(
        // 仅检测可纵向滚动容器的scrollTop变化，因为当非纵向滚动但能横向滚动的元素横向滚动时，scrollTop为0
        [mainTableBodyWrapper, leftFixedTableBodyWrapper, rightFixedTableBodyWrapper].includes(e.target) 
        && e.target.scrollTop!==this.scrollTop
      ){// 纵向滚动 
        this.scrollTop=e.target.scrollTop
        mainTableBodyWrapper.scrollTop=this.scrollTop
        if(leftFixedTableBodyWrapper) leftFixedTableBodyWrapper.scrollTop=this.scrollTop
        if(rightFixedTableBodyWrapper) rightFixedTableBodyWrapper.scrollTop=this.scrollTop
        this.$emit('scrollY', this.scrollTop, e.target)
      }
    },
    renderFixedTableView(){
      const { tableConfigs, tableData, fixedLeftTableConfigs, fixedRightTableConfigs, loading } = this;
      
      const nodes = []
      if (fixedLeftTableConfigs.length) {
        const node = <div class={['dc-fixed-left-table', 'slice-shadow']} ref="dcFixedLeftTable" style={{ bottom: this.overflowX === 'scroll' ? getScrollBarWidth.call(this) : 0 }}>
          <div class={['shadow', this.reachLeftSide ? '' : 'active']}>
            {renderTableHead.call(this, {
              tableConfigs,
              overflowX: 'hidden',
              overflowY: 'hidden',
            })}
            {renderTableBody.call(this, {
              refName: 'leftFixedTableBodyWrapper',
              tableData,
              tableConfigs,
              overflowX: 'hidden',
              overflowY: this.overflowY,
            })}
          </div>
        </div>
        nodes.push(node)
      }

      if (fixedRightTableConfigs.length) {
        const node = <div class={['dc-fixed-right-table', 'slice-shadow']} ref="dcFixedRightTable" style={{ bottom: this.overflowX === 'scroll' ? getScrollBarWidth.call(this) : 0 }}>
          <div class={['shadow', this.reachRightSide ? '' : 'active']}>
            {renderTableHead.call(this, {
              tableConfigs,
              overflowX: 'hidden',
              overflowY: this.overflowY,
            })}
            {renderTableBody.call(this, {
              refName: 'rightFixedTableBodyWrapper',
              tableData,
              tableConfigs,
              overflowX: 'hidden',
              overflowY: this.overflowY,
            })}
          </div>
        </div>
        nodes.push(node)
      }

      return nodes
    },
    renderBottomTable(){
      const { bottomTableData, tableConfigs, overflowY }=this
      return <div class="bottom-table-container" style={{marginTop: this.border?'-1px':''}}>
        {renderTableFoot.call(this, {
          refName:'mainTableFootWrapper',
          tableData: bottomTableData,
          tableConfigs,
          overflowX: 'scroll',
          overflowY,
        })}

        {
          this.fixedLeftTableConfigs.length
           ? <div class={['dc-bottom-fixed-left-table', 'slice-shadow']} ref="dcBottomFixedLeftTable">
              <div class={['shadow', this.reachLeftSide ? '' : 'active']}>
                {renderTableFoot.call(this, {
                  tableData: bottomTableData,
                  tableConfigs,
                  overflowX: 'hidden',
                  overflowY: 'hidden',
                })}
              </div>
            </div>
           : null
        }

        {
          this.fixedRightTableConfigs.length
           ? <div class={['dc-bottom-fixed-right-table', 'slice-shadow']} ref="dcBottomFixedRightTable">
              <div class={['shadow', this.reachRightSide ? '' : 'active']}>
                {renderTableFoot.call(this, {
                  tableData: bottomTableData,
                  tableConfigs,
                  overflowX: 'hidden',
                  overflowY,
                })}
              </div>
            </div>
           : null
        }
      </div>
    }
  },
  render(h){
    const { tableConfigs, tableData, loading } = this;
    h = this.$createElement
    return (
      <div class={{"dc-table": true,border: this.border,'overflow-x': this.overflowX!=='hidden','overflow-y': this.overflowY!=='hidden'}}>
        <div class="table-container">
          {renderTableHead.call(this, {
            refName:'mainTableHeadWrapper',
            tableConfigs,
            overflowX: 'scroll',
            overflowY: this.overflowY,
          })}
          {
            renderTableBody.call(this, {
              refName:'mainTableBodyWrapper',
              loading,
              tableData,
              tableConfigs,
              overflowX: this.overflowX,
              overflowY: this.overflowY,
            })
          }

          {
            !this.loading && tableData.length
              ? this.renderFixedTableView()
              : null
          }

        </div>

        
        {
          !this.loading && tableData.length && this.bottomTableData.length
            ? this.renderBottomTable()
            : null
        }
      </div>
    )
  }
})
</script>