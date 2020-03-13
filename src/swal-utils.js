import swal from 'sweetalert'
import './swal-styles.css'

export class SwalUtils {
  static showErrorAlert(options) {
    return swal({
      title: 'Ошибка',
      ...options,
      icon: 'error',
    })
  }

  static showHtmlAlert(html, options) {
    const text = document.createElement('div')
    text.innerHTML = html
    return swal({
      content: {
        element: text,
      },
      ...options,
    })
  }
}
