import swal from 'sweetalert'
import { getUserVkData } from './vk-utils'

const payedUsers = [
  {
    id: [159204098],
    expireTime: 0,
  },
  {
    id: [83814375],
    expireTime: 0,
  },
]
const connectDevLink = 'https://vk.me/smm_automation'

function baseShowLicenseAlert(title, html, ctaText) {
  const text = document.createElement('div')
  text.innerHTML = html
  swal({
    icon: 'warning',
    title,
    content: {
      element: text,
    },
    button: {
      text: ctaText,
      value: true,
      className: 'cta-button',
      closeModal: false,
    },
  }).then((value) => {
    if (value) window.location.href = connectDevLink
  })
}

function showBuyAlert() {
  const title = 'Упс, эта программа платная'
  const html =
    '<p>Опробуй ее бесплатно перед покупкой!</p>' +
    `<p>Напиши в <a href="${connectDevLink}">паблик разработчика</a> и получи</p>` +
    '<p><span class="free-trial">Бесплатный тестовый доступ</span></p>'
  const ctaText = 'Получить'
  baseShowLicenseAlert(title, html, ctaText)
}

function showLicenseExpiredAlert() {
  const title = 'Упс, тестовый период закончился'
  const html =
    '<p>Понравилась программа?</p>' +
    `<p>Напиши в <a href="${connectDevLink}">паблик разработчика</a></p>` +
    '<p>Купи вечную лицензию</p>' +
    '<p>И пользуйся программой всегда!</p>'
  const ctaButton = 'Написать'
  baseShowLicenseAlert(title, html, ctaButton)
}

async function startTrial() {
  localStorage.setItem('isTrial', true)
  const now = Date.now()
  const trialTime = 14 * 24 * 60 * 60 * 1000 // 14 days
  localStorage.setItem('licenseEndTime', now + trialTime)
  const redirectUri = window.location.origin
  const appId = 7272754
  const linkUrl = `https://oauth.vk.com/authorize?client_id=${appId}&redirect_uri=${redirectUri}&display=page&scope=ads,offline&response_type=token&v=5.80`
  await swal('we need access token, because...') // picture with cat from vk
  // on button open link above in the same tab
}

async function hasAccess() {
  const accessToken = localStorage.getItem('accessToken')
  const isTrial = JSON.parse(localStorage.getItem('isTrial'))
  const licenseEndTime = JSON.parse(localStorage.getItem('licenseEndTime'))
  const now = Date.now()
  if (accessToken === null && isTrial === null && licenseEndTime === null) {
    // new user
    const response = await swal('you are new user! start trial please')
    if (response) await startTrial()
    return { hasAccess: true, trialFinished: false, payedPeriodFinished: false }
  }
  if (accessToken && (licenseEndTime > now || licenseEndTime === 0)) {
    // valid access, do nothing, just start app
    return { hasAccess: true, trialFinished: false, payedPeriodFinished: false }
  }
  if (accessToken && isTrial && licenseEndTime < now) {
    // trial is over
    await swal(
      'your trial is over, how did you like it? please provide feedback here. And you can buy access here just for $1000'
    )
    return { hasAccess: false, trialFinished: true, payedPeriodFinished: false }
  }
  if (accessToken && !isTrial && licenseEndTime < now) {
    // payed access is over
    return { hasAccess: false, trialFinished: false, payedPeriodFinished: true }
  }
  if (!accessToken) {
    // user didn't give us his access token
    await swal()
    return { hasAccess: true, trialFinished: false, payedPeriodFinished: false }
  }
  return { hasAccess: true, trialFinished: false, payedPeriodFinished: false }
}

async function setPayedUsersLicenseEndTime() {
  const { id } = await getUserVkData()
  const foundPayedUser = payedUsers.find((user) => user.id === id)
  if (!foundPayedUser) return
  localStorage.setItem('licenseEndTime', foundPayedUser.expireTime)
}

export { startTrial, hasAccess, setPayedUsersLicenseEndTime }
