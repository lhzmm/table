import Vue from "vue";
// import Example from "./example.vue";
import router from './router'

new Vue({
  el: "#app",
  router,
  render() {
    return <router-view />;
  },
});
