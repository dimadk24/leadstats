import swal from 'sweetalert'

function showErrorAlert(options) {
  return swal({
    title: 'Ошибка',
    ...options,
    icon: 'error',
  })
}

export { showErrorAlert }
