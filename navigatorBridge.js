import {Navigation} from 'react-native-navigation';
import * as layoutConverter from './layoutConverter';
import * as optionsConverter from './optionsConverter';
import {generateGuid} from './utils';
import {BackHandler} from 'react-native';
import { node } from 'prop-types';

const modalsPresented = [];
const originalShowModal = Navigation.showModal.bind(Navigation);
const originalDismissModal = Navigation.dismissModal.bind(Navigation);
const originalSetRoot = Navigation.setRoot.bind(Navigation);
const originalSetStackRoot = Navigation.setStackRoot.bind(Navigation);
const originalPush = Navigation.push.bind(Navigation);

Navigation.setRoot = async (layout) => {
  injectNavigator(layout);
  originalSetRoot(layout);
}

Navigation.push = async (componentId, layout) => {
  injectNavigator(layout);
  originalPush(componentId, layout);
}

Navigation.setStackRoot = async (componentId, layout) => {
  injectNavigator(layout);
  originalSetStackRoot(componentId, layout);
}

Navigation.showModal = async (params) => {
  if (isV2ShowModalAPI(params)) {
    injectNavigator(params);
    return await originalShowModal(params);
  }

  setPropsCommandType(params, "ShowModal");
  mergeAnimationType('showModal', params);
  const layout = layoutConverter.convertComponentStack(params);
  modalsPresented.push(layout.stack.children[0].component.id);
  return await originalShowModal(layout);
};

Navigation.dismissModal = async (params) => {
  if (isV2DismissModalAPI(params)) {
    return await originalDismissModal(params);
  }

  const topModalComponentId = modalsPresented.pop();
  if (params) {
    mergeAnimationType('dismissModal', params);
    Navigation.mergeOptions(topModalComponentId, params);
  }

  if (topModalComponentId) {
    return await originalDismissModal(topModalComponentId);
  } else {
    return;
  }
};

function isV2ShowModalAPI(params) {
  return params.screen == undefined;
}

function isV2DismissModalAPI(params) {
  return (typeof params === 'string' || params instanceof String);
}

export function generateNavigator(componentId) {
  const navigator = {
    id: componentId ? componentId : generateGuid(),
    isVisible: false,
    eventListeners: [],
    push(params) {
      setPropsCommandType(params, "Push");
      appendBackHandlerIfNeeded(this, params);
      mergeAnimationType('push', params);
      Navigation.push(this.id, layoutConverter.convertComponent(params));
    },
    pop(params) {
      mergeAnimationType('pop', params);
      Navigation.pop(this.id);
    },
    popToRoot() {
      Navigation.popToRoot(this.id);
    },
    resetTo(params) {
      Navigation.setStackRoot(this.id, layoutConverter.convertComponent(params));
    },
    handleDeepLink({ link, payload }){
      if (!link) return;

      let event = {
        type: 'DeepLink',
        link,
        ...(payload ? { payload } : {})
      };

      setTimeout(() => {
        window.notificationEventBus.trigger("rn-nav-handleDeepLink", event);
      }, 200)
    },
    async showModal(params) {
      appendBackHandlerIfNeeded(this, params);
      return await Navigation.showModal(params);
    },
    async dismissModal(params) {
      return await Navigation.dismissModal(params);
    },
    dismissAllModals() {
      Navigation.dismissAllModals();
    },
    setButtons(buttons) {
      if (buttons.rightButtons || buttons.leftButtons || buttons.fab) {
        Navigation.mergeOptions(this.id, {
          topBar: {
            ...optionsConverter.convertButtons(buttons)
          }
        });
      }
    },
    setTitle({title}) {
      Navigation.mergeOptions(this.id, {
        topBar: {
          title: {
            text: title
          }
        }
      });
    },
    setSubTitle({subtitle}) {
      Navigation.mergeOptions(this.id, {
        topBar: {
          subtitle: {
            text: subtitle
          }
        }
      });
    },
    toggleTabs({to, animated}) {
      Navigation.mergeOptions(this.id, {
        bottomTabs: {
          visible: (to === 'shown' || to === 'show'),
          animated
        }
      });
    },
    toggleDrawer({side, animated}) {
      Navigation.mergeOptions(this.id, {
        sideMenu: {
          [side]: {
            visible: true
          }
        }
      });
    },
    setTabBadge({badge}) {
      Navigation.mergeOptions(this.id, {
        bottomTab: {
          badge
        }
      });
    },
    switchToTab(tab) {
      const options = tab ? {
        currentTabIndex: tab.tabIndex
      } : {
        currentTabId: this.id
      };

      Navigation.mergeOptions(this.id, {
        bottomTabs: options
      });
    },
    toggleNavBar({to, animated}) {
      Navigation.mergeOptions(this.id, {
        topBar: {
          visible: to === 'shown',
          animate: animated
        }
      });
    },
    setStyle(style) {
      if (style && Object.keys(style).length) {
        const convertedStyle = optionsConverter.convertStyle(style);
        Navigation.mergeOptions(this.id, convertedStyle);
      }
    },
    screenIsCurrentlyVisible() {
      return this.isVisible;
    },
    addOnNavigatorEvent(func) {
      this.eventListeners.push(func);
    },
    setOnNavigatorEvent(func) {
      this.eventListeners = [func];
    },
    eventFunc(params) {
      this.eventListeners.forEach(listener => {
        listener(params);
      });
    }
  };

  return navigator;
}

function getPushAndPopAnimations(method, params) {
  if ((method === 'push' || method === 'pop')
    && params && params.animationType) {
    const animation = (() => {
      if (params.animationType === 'none') return { enabled: false };
      const anim = (() => {
        if (params.animationType === 'fade') {
          return {
            enabled: true,
            content: {
              alpha: {
                from: 0,
                to: 1,
                duration: 300,
              }
            }
          }
        }
        return {};
      })();
      return anim;
    })();
    params.animations = {
      [method]: animation,
      [method === 'push' ? 'pop' : 'push']: animation,
    }
  }
}

function getShowAndDismissModalAnimations(method, params) {
  if ((method === 'showModal' || method === 'dismissModal')
    && params && params.animationType) {
    const animation = (() => {
      if (params.animationType === 'none') return { enabled: false };
      const anim = (() => {
        if (params.animationType === 'fade') {
          return {
            enabled: true,
            alpha: {
              from: 0,
              to: 1,
              duration: 300,
            }
          }
        }
        return {};
      })();
      return anim;
    })();
    params.animations = {
      [method]: animation,
    }
  }
}

function mergeAnimationType(method, params) {
  if (params && params.animationType) {
    getPushAndPopAnimations(method, params);
    getShowAndDismissModalAnimations(method, params);
  }
}

function appendBackHandlerIfNeeded(navigator, params) {
  if (params.overrideBackPress) {
    BackHandler.addEventListener('hardwareBackPress', function () {
      navigator.eventFunc({
        id: 'backPress',
        type: 'NavBarButtonPress'
      });
    });
  }
}

function setPropsCommandType(params, commandType) {
  if (params && params.passProps) {
    params.passProps.commandType = commandType;
  } else {
    params.passProps = {commandType}
  }
}

function injectNavigator(layout) {
  if (Array.isArray(layout)) {
    layout.forEach(element => {
      injectNavigator(element);
    });
  } else {
    Object.keys(layout).forEach(key => {
      if (key === 'component') {
        const componentId = layout[key].id;
        const navigator = generateNavigator(componentId);
        layout[key].passProps = { ...layout[key].passProps, navigator }
        layout[key].id = navigator.id;
      } else if (isObject(layout[key])) {
        injectNavigator(layout[key]);
      }
    });
  }

  function isObject(value) {
    return Array.isArray(value) || (value && typeof value === 'object' && value.constructor === Object);
  }
}
