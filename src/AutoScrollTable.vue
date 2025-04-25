<script>
import { renderTableHead, renderTableBody, FAKE_KEY } from "./render";
import debounce from "lodash/debounce";
import { BASE_TABLE_PROPS } from './mixin';
import {LhResizeObserver} from '@lhzmm/tools'
import {inject$createElement} from './utils'
/**
 * tableConfigs:[
 *  {
 *    label:'',
 *    prop:'',
 *    render(){},
 *    cellStyle(){},
 *    getColSpan(){},
 *    getRowSpan(){},
 *    children:[
 *      {
 *        label
 *        prop
 *        render
 *        children:[
 *          {
 *            label
 *            prop
 *            render
 *          }
 *        ]
 *      }
 *    ]
 *  }
 *  ...
 * ]
 */
export default inject$createElement({
  name:'DcAutoScrollTable',
  props: {
      ...BASE_TABLE_PROPS,
      interval: {
        type: Number,
        default: 1000,
      },
      touchEndDelay: {
        type: Number,
        default: 1000,
      },
      speed: {
        type: Number,
        default: 50 / 1000,
      },
  },
  data() {
      return {
        modifiedTableData: [],
        isOverflowY: false,
        offsetY: 0,
      };
  },
  created() {
      this.isShowScroll = false; // 是否展示滚动滑块
      this.isDragSlider = false; // 是否拖拽滑块
      this.isInTableBodyWrapper = false; // 鼠标是否在表格内容内
      
      this.sliderHeight = 0;// 滑块高度
      this.originalHeight = 0;// 原数据高度
      this.rafId = null;
      this.intervalTimer = null;
      this.startPoint = null;// 拖拽计算的开始节点
      this.movingRowIndex = 0;// 正在过渡的行对应的索引
      this.touchEndTimer = null;
  },
  mounted() {
      this.init();

      const delayReset=debounce(()=>{
        this.reset()
      },500)
      // requestAnimationFrame会在ResizeObserver前触发
      this.onResize = () => {
        if(this.$el.clientWidth){ // 组件可见时
          delayReset()// 延迟后，当执行时组件不可见，isOverflowY为false，不执行动画
        }else{
          // 停止动画
          // cancelAnimationFrame(this.rafId); // 已在nextFrame中做可见判断
          clearTimeout(this.intervalTimer);
          if(this.isInTableBodyWrapper){
            this.onMouseLeave()
          }
        }
      }
      this.ob=new LhResizeObserver()
      this.ob.observe(this.$el,this.onResize)
  
      this.$refs.slider.addEventListener("mousedown", this.onMouseDown);
      this.$refs.slider.addEventListener("dragstart", ()=>{
        // console.log('dragstart')
        // 默认情况下，dragstart后不会触发mouseup，故只要触发了dragstart就手动触发mouseup，实现事件解绑
        window.dispatchEvent(new Event('mouseup'))
      });
  
      this.delayHiddenScroll = debounce(() => {
        this.$refs.slider.dispatchEvent(new Event("mouseup"));
        this.$refs.track.style.setProperty("opacity", "0");
        setTimeout(() => {
          this.$refs.track.style.setProperty("display", "none");
          this.isShowScroll = false;
        }, 500);
      }, 10000);
  },
  activated() {
      // 当组件从keep-alive缓存中取出插入DOM时，会触发resizeObserver，自动调用onResize函数
  },
  // vue2中组件销毁时调用
  beforeDestroy() {
      this.ob.unobserve(this.$el, this.onResize);
  },
  // vue3中组件销毁时调用
  beforeUnmount() {
      this.ob.unobserve(this.$el, this.onResize);
  },
  watch: {
      data() {
        this.reset();
      },
      offsetY(val) {
        const { tableBodyWrapper, slider } = this.$refs;
  
        if(!this.isInTableBodyWrapper){// 自动滚动
          const table = tableBodyWrapper.querySelector("table");
          table.style.setProperty("transform", `translate3d(0, -${val}px, 0)`);
        }
  
        const sliderY= Math.min(this.offsetY,  this.maxOffsetY)*(tableBodyWrapper.clientHeight - this.sliderHeight)/this.maxOffsetY
        slider.style.setProperty("transform", `translate3d(0, ${sliderY}px, 0)`);
      },
      isOverflowY(val) {
        const eventMap={
          mouseenter:this.onMouseEnter,
          mouseleave:this.onMouseLeave,
          touchstart:this.onTouchStart,
          touchend:this.onTouchEnd,
        }
        // isOverflow为true时，添加交互事件；反之，则尝试移除上一个状态可能添加的交互事件
        Object.entries(eventMap).forEach(([eventName,handle])=>{
          this.$refs.tableBodyWrapper[val?'addEventListener':'removeEventListener'](eventName, handle);
        })
      },
  },
  methods: {
      init() {
        if(this.loading||!this.data.length) return
        this.assertScroll();
        if (this.isOverflowY) {
          this.useModifiedTableData();
          this.$nextTick(this.startAnimation);
        }
      },
      reset() {
        this.offsetY = 0;
        this.$refs.tableBodyWrapper.scrollTop = 0
        this.isOverflowY = false;
        cancelAnimationFrame(this.rafId);
        clearTimeout(this.intervalTimer);
        this.$nextTick(() => {
          this.init();
        });
      },
  
      onTouchStart(){
        if(this.touchEndTimer){
          // 说明onTouchEnd中的延迟回调还没执行，表格仍处于静止状态，仅需清除上一次onTouchEnd设置的计时器
          clearTimeout(this.touchEndTimer)
        }else{
          // 表格属于自动滚动状态，需要先停止滚动，并设置对应的scrollTop
          this.onMouseEnter()
        }
      },
      onTouchEnd(){
        this.touchEndTimer=setTimeout(()=>{
          // 在可见状态变化为不可见时，onResize中会执行一次onMouseLeave，这里也会执行一次，添加判断让只执行1次
          if(this.isInTableBodyWrapper){
            this.onMouseLeave()
          }
          // 标识onTouchEnd的延时回调已执行，表格已重新开始滚动
          this.touchEndTimer=null
        },this.touchEndDelay)
      },
  
      onMouseDown(e) {
        // console.log('mousedown')
        this.delayHiddenScroll();
        this.isDragSlider=true
        this.startPoint = { x: e.clientX, y: e.clientY };
        window.addEventListener("mousemove", this.onMouseMove);
        window.addEventListener("mouseup", this.onMouseUp);
  
        // 防止拖拽时选中表格文本
        this.$refs.tableBodyWrapper.style.setProperty('user-select','none')
      },
      onMouseMove(e) {
        this.delayHiddenScroll();
  
        const { tableBodyWrapper } = this.$refs;
  
        const diffY = e.clientY - this.startPoint.y;
  
        const maxOffsetY = this.maxOffsetY;
  
        const sliderY = (Math.min(this.offsetY, maxOffsetY) / this.maxOffsetY) * (tableBodyWrapper.clientHeight - this.sliderHeight);
  
        this.offsetY = (sliderY + diffY) / (tableBodyWrapper.clientHeight - this.sliderHeight) * this.maxOffsetY;
        this.offsetY = Math.max(0, this.offsetY);
        this.offsetY = Math.min(maxOffsetY, this.offsetY);
  
        if(this.isInTableBodyWrapper){
          this.$refs.tableBodyWrapper.scrollTop = this.offsetY
        }
  
        this.startPoint = { x: e.clientX, y: e.clientY };
      },
      onMouseUp() {
        // console.log('mouseup')
        this.isDragSlider=false
  
        window.removeEventListener("mousemove", this.onMouseMove);
        window.removeEventListener("mouseup", this.onMouseUp);
        
        this.movingRowIndex=this.getMovingRowIndex()
        if(!this.isInTableBodyWrapper){// 鼠标在拖拽滑块的结束时，不在表格内部
          this.nextFrame()
        }
  
        this.$refs.tableBodyWrapper.style.setProperty('user-select','')
      },
  
      onMouseEnter() {
        // console.log('mouseenter')
        this.isInTableBodyWrapper=true
        window.cancelAnimationFrame(this.rafId);
        window.clearTimeout(this.intervalTimer);
  
        if(this.offsetY > this.maxOffsetY){
          this.offsetY = this.maxOffsetY
        }
  
        // 滚动条继承偏移值
        this.$refs.tableBodyWrapper.scrollTop = this.offsetY
        
        // 偏移样式归零
        this.$refs.tableBodyWrapper.querySelector("table").style.setProperty("transform", `none`);
        
        // 延迟添加scroll监听函数，防止鼠标移入时，因为滚动条继承偏移值导致触发滚动事件
        requestAnimationFrame(()=>{
          this.$refs.tableBodyWrapper.addEventListener('scroll',this.onScroll)
        })
      },
      onScroll(e){
        // console.log('scroll')
        if(this.loading||!this.data.length) return
        if (!this.isShowScroll) {
          this.isShowScroll = true;
          this.$refs.track.style.setProperty("display", "block");
          this.afterStyleRender(() => {
            this.$refs.track.style.setProperty("opacity", "1");
          });
        }
        this.delayHiddenScroll();
        if(e.currentTarget.scrollTop > this.maxOffsetY){
          e.currentTarget.scrollTop = this.maxOffsetY
          e.preventDefault()
        }
        this.offsetY = e.currentTarget.scrollTop
      },
      onMouseLeave(e) {
        // mouseleave，v-if切换为不可见时不触发，v-show切换为不可见时触发
        // 不可见状态下，对原生触发事件不做处理，统一到onResize中调用
        if(!this.$el.clientWidth && e instanceof Event) {
          // console.log('origin mouseleave',e)
          return
        }

        // console.log('mouseleave')
        this.isInTableBodyWrapper=false
        this.$refs.tableBodyWrapper.removeEventListener('scroll',this.onScroll)
        
        // 恢复translate
        this.$refs.tableBodyWrapper.querySelector("table").style.setProperty("transform", `translate3d(0, -${this.offsetY}px, 0)`);
  
        // 滚动条归零
        this.$refs.tableBodyWrapper.scrollTop = 0
        
        if(!this.isDragSlider && this.$el.clientWidth){// 未拖拽滑块且组件可见的情况下，鼠标移出表格内容
          this.movingRowIndex = this.getMovingRowIndex()
          this.nextFrame();
        }
      },
  
      afterStyleRender(fn) {
        requestAnimationFrame(() => {
          requestAnimationFrame(fn);
        });
      },
      getMovingRowIndex(){
        return Array.from(this.$refs.tableBodyWrapper.querySelectorAll("tr")).findIndex((tr) => {
            if (
              tr.getClientRects()[0].bottom >=
              this.$refs.tableBodyWrapper.getClientRects()[0].top
            ) {
              return true;
            }
          });
      },
      nextFrame() {
        const startTime = Date.now();
        this.rafId = window.requestAnimationFrame(() => {
          if(!this.$el.clientWidth) return // 组件不可见时，终止动画
          this.offsetY += (Date.now() - startTime) * this.speed;

          const movingTr = this.$refs.tableBodyWrapper.querySelectorAll("tr")[this.movingRowIndex];
          /* getClientRects受css transform scale影响 */
          const renderSize = movingTr.getClientRects()[0]
          // scale后渲染视图中的距离
          const distance = renderSize.bottom - this.$refs.tableBodyWrapper.querySelector("table").getClientRects()[0].top;
          const computedStyle = getComputedStyle(movingTr)
          // tr css盒子的原始高度
          const computedBoxHeight = [computedStyle.height,computedStyle.borderTopWidth,computedStyle.borderBottomWidth,computedStyle.paddingTop,computedStyle.paddingBottom].reduce((prev,str)=>prev+Number(str.replace('px','')),0)
          // scale的反比，用于计算scale前的大小
          const revertScale = computedBoxHeight / renderSize.height
          // 实际距离
          const targetOffsetY = distance * revertScale;

          if (this.offsetY >= targetOffsetY) {
            // 当期行过渡完成时
            this.offsetY = targetOffsetY;
            this.intervalTimer = setTimeout(() => {
              if (this.movingRowIndex === this.data.length - 1) {
                // 回到头部
                this.offsetY = 0;
                this.movingRowIndex = 0;
              } else {
                this.movingRowIndex += 1;
              }
              this.nextFrame();
            }, this.interval);
          } else {
            this.nextFrame();
          }
        });
      },
      startAnimation() {
        this.movingRowIndex = 0;
        this.intervalTimer = setTimeout(() => {
          this.nextFrame();
        }, this.interval);
      },
      useModifiedTableData() {
        const tableData = this.data;
        const trs = this.$refs.tableBodyWrapper.querySelector("tbody").children;
        const fidx = [...trs].findIndex((tr) => {
          if (
            tr.getClientRects()[0].bottom >
            this.$refs.tableBodyWrapper.getClientRects()[0].bottom
          ) {
            return true;
          }
        });
        this.modifiedTableData = tableData.concat(
          tableData
            .slice(0, fidx + 1)
            .map((item) => ({ ...item, [FAKE_KEY]: true }))
        );
      },
      assertScroll() {
        const { slider, tableBodyWrapper } = this.$refs;
        this.sliderHeight = tableBodyWrapper.clientHeight / 5
        this.originalHeight = tableBodyWrapper.querySelector("table").offsetHeight;
        this.maxOffsetY = this.originalHeight - tableBodyWrapper.clientHeight
        this.isOverflowY = tableBodyWrapper.querySelector("table").clientHeight > tableBodyWrapper.clientHeight;
        if(this.isOverflowY){
          slider.style.setProperty("height", this.sliderHeight + "px");
        }
      },
  },
  render(h) {
      const { tableConfigs } = this;
      const tableData = this.isOverflowY ? this.modifiedTableData : this.data;
      h = this.$createElement
      return (
        <div class="dc-table">
          {renderTableHead.call(this, {
            tableData,
            tableConfigs,
            overflowY: 'hidden',
          })}
          {renderTableBody.call(this, {
            tableData,
            tableConfigs,
            simulateScroll: true,
            overflowY: 'scroll',
          })}
        </div>
      );
  },
});
</script>
  