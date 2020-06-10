import {generateGuid} from './utils';
import {Platform} from 'react-native';
import {Navigation} from 'react-native-navigation';
import _ from 'lodash';

export function convertStyle(paramStyle = {}, buttons) {
  const style = {...paramStyle, ...paramStyle.navigatorStyle}
  if (style.navigatorButtons) {
    buttons = convertButtons(style.navigatorButtons, style.navBarButtonColor);
  } else if (buttons) {
    buttons = convertButtons(buttons, style.navBarButtonColor);
  }

  const convertedStyle = {
    layout: {
      backgroundColor: style.screenBackgroundColor,
      componentBackgroundColor: style.screenBackgroundColor,
    },
    orientation: style.orientation,
    statusBar: {
      blur: style.statusBarBlur,
      hideWithTopBar: style.statusBarHideWithNavBar,
      style: style.statusBarTextColorScheme,
      visible: style.statusBarHidden ? !style.statusBarHidden : undefined,
      drawBehind: style.drawUnderStatusBar
    },
    animations: style.animations,
    popGesture: style.disabledBackGesture ? !style.disabledBackGesture : undefined,
    backgroundImage: style.screenBackgroundImageName,
    rootBackgroundImage: style.rootBackgroundImageName,
    modalPresentationStyle: style.modalPresentationStyle,
    topBar: {
      elevation: style.topBarElevationShadowEnabled ? 5 : 0,
      visible: style.navBarHidden ? !style.navBarHidden : undefined,
      hideOnScroll: style.navBarHideOnScroll,
      buttonColor: style.navBarButtonColor,
      translucent: style.navBarTranslucent,
      transparent: style.navBarTransparent,
      drawBehind: style.drawUnderNavBar,
      noBorder: style.navBarNoBorder,
      blur: style.navBarBlur,
      largeTitle: {
        visible: style.largeTitle
      },
      backButtonImage: style.backButtonImage,
      hideBackButtonTitle: style.hideBackButtonTitle,
      ...buttons,
      backButton: {
        image: style.backButtonImage,
        showTitle: (() => {
          if (style.hideBackButtonTitle) return false;
          if (style.hideBackButtonTitle === false) return true;
          return undefined;
        })(),
        color: style.navBarButtonColor,
      },
      leftButtonColor: style.navBarButtonColor,
      rightButtonColor: style.navBarButtonColor,
      title: {
        text: style.title,
        fontSize: style.navBarTextFontSize,
        color: style.navBarTextColor,
        fontFamily: style.navBarTextFontFamily,
        component: {
          name: style.navBarCustomView,
          alignment: style.navBarComponentAlignment,
          passProps: style.navBarCustomViewInitialProps
        }
      },
      subtitle: {
        text: style.subtitle,
        fontSize: style.navBarSubtitleFontSize,
        color: style.navBarSubtitleColor,
        fontFamily: style.navBarSubtitleFontFamily
      },
      background: {
        color: style.navBarTransparent ? 'transparent' : style.navBarBackgroundColor,
        translucent: style.navBarTranslucent,
        blur: style.navBarBlur,
      }
    },
    fab: buttons ? buttons.fab : undefined,
    bottomTab: {
      text: style.label,
      testID: style.testID,
      icon: style.icon,
      selectedIcon: style.selectedIcon,
      iconInsets: style.iconInsets,
      iconColor: style.tabBarButtonColor,
      selectedIconColor: style.tabBarSelectedButtonColor,
      tabBarTextColor: style.tabBarTextColor,
      selectedTextColor: style.tabBarSelectedTextColor,
      fontFamily: style.tabBarTextFontFamily,
      fontSize: style.tabBarTextFontSize,
    },
    bottomTabs: {
      visible: style.tabBarHidden ? !style.tabBarHidden : undefined,
      drawBehind: style.drawUnderTabBar,
      titleDisplayMode: (() => {
        if (style.titleDisplayMode) return style.titleDisplayMode;
        if (style.forceTitlesDisplay === true) return 'alwaysShow';
        if (style.forceTitlesDisplay === false) return 'alwaysHide';
        return undefined;
      })(),
    }
  };
  console.log('CONVERTED STYLE', convertedStyle, style);
  deleteUndefinedProperies(convertedStyle);
  deleteEmptyObjects(convertedStyle);

  return convertedStyle;
}

function deleteUndefinedProperies(obj) {
  Object.keys(obj).forEach(key => {
    if (obj[key] && typeof obj[key] === 'object') deleteUndefinedProperies(obj[key]);
    else if (obj[key] === undefined) delete obj[key];
  });
  return obj;
}

function deleteEmptyObjects(parentObject, key) {
  const obj = key ? parentObject[key] : parentObject;
  Object.keys(obj).forEach(key => {
    if (_.isPlainObject(obj[key]))
      deleteEmptyObjects(obj, key);
  });

  if (parentObject && _.isPlainObject(parentObject[key]) && Object.keys(parentObject[key]).length === 0) {
    delete parentObject[key];
  }
}

export function convertButtons(buttons, color) {
  const converted = {};
  if (buttons.leftButtons) {
    converted.leftButtons = processButtonsArray(buttons.leftButtons, 'leftButtons', color);
  }
  if (buttons.rightButtons) {
    converted.rightButtons = processButtonsArray(buttons.rightButtons, 'rightButtons', color);
  }
  if (buttons.fab) {
    converted.fab = processFab(buttons.fab)
  }
  return converted;
}

function processButtonsArray(buttons, type, color) {
  return buttons.map((button) => {
    if (typeof button.component === 'string') {
      button.component = {
        name: button.component,
        passProps: button.passProps
      };
      button.id = button.id ? button.id : generateGuid();
    }
    if (type === 'leftButtons' && button.id === 'back' && Platform.OS === 'android') {
      button.id = 'RNN.back'
    }
    button.enabled = !button.disabled;
    button.text = button.title;

    return button;
  });
}

function processFab(fab) {
  return {
    id: fab.collapsedId,
    backgroundColor: fab.backgroundColor,
    icon: fab.collapsedIcon,
    alignHorizontally: 'right',
  }
}
