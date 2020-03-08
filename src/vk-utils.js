import catta from 'catta'
import { showErrorAlert } from './swal-utils'

let requestTime = 0
const apiUrl = 'https://api.vk.com/method/'
const apiVersion = '5.80'

function getErrorText(errorCode) {
  const errors = {
    1: 'Неизвестная для ВК ошибка. Попробуй позже',
    5:
      'Авторизация не удалась, обнови токен доступа.\n' +
      'Как это сделать читай в ReadMe',
    6: 'Слишком много запросов в секунду',
    7: 'Нет прав для выполнения данного действия',
    9: 'Слишком много однотипных действий',
    10: 'Внутренняя ошибка ВК. Попробуй позже',
    14: 'Требуется ввод капчи, но ее обработка не сделана',
    15: 'Доступ к контенту запрещен',
    17: 'Требуется валидация пользователя',
    29: 'Достигнут количественный лимит ВК',
    600: 'Нет прав на выполнения этого действия с РК',
    601: 'Превышено количество запросов за день.\nПопробуй позже',
    603: 'Произошла ошибка при работе с РК',
  }
  const errorText = errors[errorCode]
  return errorText || 'Неизвестная ошибка'
}

function vk(options) {
  const data = options.data || {}
  data.access_token = window.access_token
  data.v = apiVersion
  return new Promise((resolve, reject) => {
    const now = Date.now()
    function request() {
      requestTime = now
      catta({
        type: 'jsonp',
        timeout: 2,
        url: apiUrl + options.method,
        data,
      }).then(
        (res) => {
          if (res.response) {
            resolve(res.response)
          } else {
            const { error_code: errorCode } = res.error
            const errorMessage = res.error.error_msg
            const errorNiceText = getErrorText(errorCode)
            showErrorAlert({
              title: 'Возникла ошибка при работе с ВК',
              text: errorNiceText,
            })
            // eslint-disable-next-line no-console
            console.error(res.error)
            throw new Error(`#${errorCode}: ${errorMessage}`)
          }
        },
        (err) => {
          showErrorAlert({
            text:
              'Сетевая ошибка.\n' +
              'Проверь соединие с Интернетом и обнови страницу',
          })
          // eslint-disable-next-line no-console
          console.log(err)
          reject(err)
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
