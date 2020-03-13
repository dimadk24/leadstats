import catta from 'catta'
import swal from 'sweetalert'
import { SwalUtils } from './swal-utils'

let requestTime = 0
const apiUrl = 'https://api.vk.com/method/'
const apiVersion = '5.80'

function getNiceErrorText(errorCode, errorMessage) {
  const errors = {
    1: 'Неизвестная для ВК ошибка. Попробуй позже',
    5: 'Авторизация не удалась, обнови токен доступа',
    6: 'Слишком много запросов в секунду',
    7: 'Нет прав для выполнения данного действия',
    9: 'Слишком много однотипных действий',
    10: 'Внутренняя ошибка ВК. Попробуй позже',
    14: 'Требуется ввод капчи, но ее обработка не сделана',
    15: 'Доступ к контенту запрещен',
    17: 'Требуется валидация пользователя',
    29: 'Достигнут количественный лимит ВК',
    103: 'Превышено ограничение на количество переменных',
    113: 'Неверная ссылка на пользователя ВК',
    600: 'Нет прав на выполнения этого действия с РК',
    601: 'Превышено количество запросов за день.\nПопробуй позже',
    602: 'Часть данных не была сохранена',
    603: 'Произошла ошибка при работе с РК',
  }
  const niceErrorText = errors[errorCode] || 'Неизвестная ошибка'
  return `${niceErrorText}\n${errorMessage}`
}

function vk(options) {
  const {
    method,
    data = {},
    hardRetryIfNetworkError = false,
    retryModalText,
  } = options
  data.access_token = data.accessToken || localStorage.getItem('accessToken')
  data.v = apiVersion
  return new Promise((resolve, reject) => {
    const now = Date.now()
    function request() {
      requestTime = now
      catta({
        type: 'jsonp',
        timeout: 10,
        url: apiUrl + method,
        data,
      }).then(
        (res) => {
          if (res.response) {
            resolve(res.response)
          } else {
            const { error_code: errorCode } = res.error
            const errorMessage = res.error.error_msg
            const errorNiceText = getNiceErrorText(errorCode, errorMessage)
            SwalUtils.showErrorAlert({
              title: 'Возникла ошибка при работе с ВК',
              text: errorNiceText,
            })
            // eslint-disable-next-line no-console
            console.error(res.error)
            reject(new Error(`#${errorCode}: ${errorMessage}`))
          }
        },
        (err) => {
          if (hardRetryIfNetworkError) {
            swal({
              icon: 'error',
              title: 'Сетевая ошибка',
              text: retryModalText,
              button: 'Попробовать еще раз',
              closeOnEsc: false,
              closeOnClickOutside: false,
            }).then(() => {
              vk(options).then(resolve, reject)
            })
          } else {
            SwalUtils.showErrorAlert({
              text:
                'Сетевая ошибка.\n' +
                'Проверь соединие с Интернетом и попробуй еще раз',
            })
            // eslint-disable-next-line no-console
            console.error(err)
            reject(new Error(err.message || err.name))
          }
        }
      )
    }
    const difference = now - requestTime
    if (requestTime && difference < 500) setTimeout(request, difference)
    else request()
  })
}

function getUserVkData() {
  return new Promise((resolve) =>
    vk({
      method: 'users.get',
    }).then((res) => resolve(res[0]))
  )
}

export { getUserVkData, vk }
