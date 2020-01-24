import Vue from 'vue'
import App from './App.vue'
import AsyncComputed from 'vue-async-computed';
import VueInputMask from "vue-inputmask";
import { library } from '@fortawesome/fontawesome-svg-core';
import { faClock } from '@fortawesome/free-solid-svg-icons';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import VueRouter from 'vue-router'

library.add(faClock);
library.add(faExclamationTriangle);
Vue.component('font-awesome-icon', FontAwesomeIcon);
Vue.use(VueInputMask.default);
Vue.use(VueRouter);
Vue.config.productionTip = false

Vue.use(AsyncComputed);

const routes = [
  {
    path: '/kiosk/home/:locationId',
    component: App
  }
];

const router = new VueRouter ({
  mode: 'history',
  routes
})

new Vue({
  render: h => h(App),
  router
}).$mount('#app')
