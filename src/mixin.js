export const BASE_TABLE_PROPS={
  data: {
    type: Array,
    require:true,
    default: () => [],
  },
  tableConfigs: {
    type: Array,
    default: () => [],
  },
  loading:{
    type:Boolean,
    default:false
  },
  exactScrollBarWidth:{
    type:[Number,String],
    default:17
  },
  rowClick: { type: Function, default: undefined },
  getRowStyle: { type: Function, default: undefined },
  // 是否显示表格边框（目前仅适配了ClassicTable）
  // 将该属性放在mixin中是为了防止在AutoScrollTable的render过程中报warning
  border:{
    type:Boolean,
    default:false,
  },
}
