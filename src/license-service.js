import swal from 'sweetalert'
import { getUserVkData } from './vk-utils'
import { Utils } from './utils'
import { SwalUtils } from './swal-utils'

const APP_ID = 7272754

const payedUsers = [
  {
    id: 159204098,
  },
  {
    id: 83814375,
  },
]

export class LicenseService {
  static async startTrial() {
    const licenseEndTime = Date.now() + 14 * 24 * 60 * 60 * 1000 // 14 days
    localStorage.setItem('licenseEndTime', JSON.stringify(licenseEndTime))
    await swal('Запустил триал! У тебя есть 14 дней чтобы опробовать программу')
  }

  static async showStartTrialAlert() {
    const html = `
    <p>Добро пожаловать!</p>
    <p>Программа платная, опробуй её бесплатно перед покупкой</p>
    <p>Запусти триал и тестируй программу бесплатно 14 дней</p>
  `
    const response = await SwalUtils.showHtmlAlert(html, {
      buttons: {
        cancel: {
          value: null,
          visible: true,
          text: 'Спасибо, не сейчас',
        },
        agree: {
          text: 'Запустить триал!',
          value: true,
          className: 'cta-button',
        },
      },
    })
    if (response) {
      await LicenseService.startTrial()
      return true
    }
    return false
  }

  static async getIsUserPayed() {
    const { id } = await getUserVkData()
    return Boolean(payedUsers.find((user) => user.id === id))
  }

  static async tryToSetUserDataFromUrl() {
    const { location } = window
    const { hash } = location
    if (!hash) return
    const vkTokenHashRegex = /^#access_token=([0-9a-f]*)&expires_in=0&user_id=(\d*)$/
    const match = hash.match(vkTokenHashRegex)
    if (!match) return
    const accessToken = match[1]
    localStorage.setItem('accessToken', accessToken)
    const userId = match[2]
    localStorage.setItem('vkUserId', userId)
    await swal({
      icon: 'success',
      text: 'Ты успешно авторизовался! Теперь можно пользоваться сервисом',
    })
    window.history.replaceState(
      {},
      '',
      location.href.slice(0, location.href.indexOf('#'))
    )
  }

  static async authenticate(
    mainMessage = 'Добро пожаловать!\nДля начала нужно авторизоваться ВКонтакте',
    buttonText = 'Авторизоваться ВК',
    doubleTry = true,
    showCancel = false
  ) {
    const redirectUri = window.location.href
    const authUrl = `https://oauth.vk.com/authorize?client_id=${APP_ID}&redirect_uri=${redirectUri}&display=page&scope=ads,offline&response_type=token&v=5.80`
    const buttons = {
      cancel: showCancel && {
        visible: true,
        value: null,
        text: 'Отмена',
      },
      proceed: {
        value: true,
        text: buttonText,
      },
    }
    let response = await swal({
      text: mainMessage,
      buttons,
    })
    const redirect = async () => {
      window.location = authUrl
      // redirect takes some time
      // need to wait for it
      // another way we suppose that user is authenticated
      // and try to use undefined access token
      await Utils.waitForTimeout(300)
    }
    if (response) await redirect()
    else if (doubleTry) {
      response = await swal({
        icon: 'warning',
        text: 'К сожалению, без авторизации программа не сможет работать',
        buttons,
      })
      if (response) await redirect()
    }
  }

  static async showTrialFinishedAlert() {
    const html = `
  <p>Триальный период закончился</p>
  <p>Как тебе программа?</p>
  <p>Оставь, пожалуйста, отзыв
  <a href="https://vk.com/topic-169568508_39034852" rel="noopener noreferrer" target="_blank">в сообществе разработчика</a></p>
  <p>И покупай полную версию
  <a href="https://vk.com/im?sel=-169568508" rel="noopener noreferrer" target="_blank">тут</a></p>
  `
    const options = {
      button: {
        text: 'Перейти в паблик разработчика',
        className: 'cta-button',
      },
    }
    const response = await SwalUtils.showHtmlAlert(html, options)
    if (response) {
      window.open('https://vk.com/smm_automation', '_blank', 'noopener')
    }
  }

  static async initLicenseData() {
    const accessToken = localStorage.getItem('accessToken')
    const licenseEndTime = JSON.parse(localStorage.getItem('licenseEndTime'))
    if (!accessToken) {
      // user didn't give us his access token
      await LicenseService.authenticate()
      return { hasAccess: false, trialFinished: false }
    }
    const isPayedUser = await LicenseService.getIsUserPayed()
    if (!isPayedUser && licenseEndTime === null) {
      // new user
      const startedTrial = await LicenseService.showStartTrialAlert()
      return { hasAccess: startedTrial, trialFinished: false }
    }
    const now = Date.now()
    if (accessToken && (isPayedUser || licenseEndTime > now)) {
      // valid access, do nothing, just start app
      return { hasAccess: true, trialFinished: false }
    }
    if (accessToken && !isPayedUser && licenseEndTime <= now) {
      await LicenseService.showTrialFinishedAlert()
      return { hasAccess: false, trialFinished: true }
    }
    // eslint-disable-next-line no-console
    console.error('unexpected state')
    return { hasAccess: false, trialFinished: false }
  }

  static async initUserState() {
    await LicenseService.tryToSetUserDataFromUrl()
    return LicenseService.initLicenseData()
  }
}
