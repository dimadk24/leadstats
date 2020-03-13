/* eslint-disable no-restricted-syntax,no-param-reassign,no-use-before-define */
import CSV from 'comma-separated-values/csv'
import swal from 'sweetalert'
import flatpickr from 'flatpickr'
import 'flatpickr/dist/flatpickr.min.css'
import { Russian } from 'flatpickr/dist/l10n/ru'
import $ from 'jquery'
import 'select2'
import 'select2/dist/css/select2.min.css'
import 'datatables.net-dt'
import 'datatables.net-dt/css/jquery.dataTables.min.css'
import './style.css'
import './radioGroup.css'
import './spinner.css'
import { VkMessagesService } from './vk-messages-service'
import { vk } from './vk-utils'
import { SwalUtils } from './swal-utils'
import { LicenseService } from './license-service'

flatpickr.localize(Russian)

let adCabinetId = 0
let fileContent = ''
const fileData = []
let licenseData = {
  hasAccess: false,
  trialFinished: false,
}
let adAccounts = []
let agencyClient
let statsRange
let calendarInput

VkMessagesService.initMessages()

function initCalendars() {
  calendarInput = flatpickr('#calendar-input', {
    mode: 'range',
    dateFormat: 'j.m.Y',
  })
}

function checkInputs() {
  let error
  if (!adCabinetId) error = 'Не выбран кабинет.\nВыбери его сверху'
  else if (!fileContent)
    error = 'Не выбран файл от Анкет.\nПеретащи или выбери его'
  return error
}

function getDatesRange() {
  const { selectedDates } = calendarInput
  return selectedDates || undefined
}

async function onStart() {
  statsRange = getDatesRange()
  const error = checkInputs()
  if (error) await SwalUtils.showErrorAlert({ text: error })
  else if (licenseData.hasAccess) {
    work()
  } else if (!licenseData.trialFinished) {
    const startedTrial = await LicenseService.showStartTrialAlert()
    if (startedTrial) work()
  } else {
    await LicenseService.showTrialFinishedAlert()
  }
}

async function onLoad() {
  licenseData = await LicenseService.initUserState()
  initSelect()
  initDropzone()
  initCalendars()
  $('button.start').on('click', onStart)
}

function convertCabinetsToOptions(array) {
  return array.map((item) => {
    return { name: item.account_name, id: item.account_id }
  })
}

function addCabinetsToSelect(array, select) {
  const optionArray = convertCabinetsToOptions(array)
  if (optionArray.length === 0)
    optionArray.push({
      name: 'У тебя нет активных рекламных кабинетов :(',
      id: 0,
    })
  addItemsToSelect(optionArray, select)
}

function addItemsToSelect(array, select) {
  const options = array.map(
    (item) => new Option(item.name, item.id, false, false)
  )
  select.append(...options).trigger('change')
}

function filterCabinets(array) {
  array = array.filter(
    (item) =>
      item.account_status && ['admin', 'manager'].includes(item.access_role)
  )
  return array
}

function setAdAccounts(array) {
  adAccounts = array.map((item) => {
    return { id: item.account_id, type: item.account_type }
  })
}

function removePlaceholderOption() {
  $('option#placeholder').remove()
}

function addPlaceholderOption() {
  $('select#ad-acc-select').html(
    '<option id="placeholder" value="0" disabled="disabled">Загружаю клиентов кабинета</option>'
  )
}

function loadSelectData() {
  vk({ method: 'ads.getAccounts' }).then((accounts) => {
    removePlaceholderOption()
    accounts = filterCabinets(accounts)
    setAdAccounts(accounts)
    addCabinetsToSelect(accounts, $('select#ad-acc-select'))
  })
}

function cabinetIsAgency(cabinetId) {
  const cabinetObj = adAccounts.find(
    (acc) => acc.id === parseInt(cabinetId, 10)
  )
  return cabinetObj.type === 'agency'
}

function removeUselessAgencyClientStuff(item) {
  return { name: item.name, id: item.id }
}

function getAgencyClients(accountId) {
  return new Promise((resolve) =>
    vk({
      method: 'ads.getClients',
      data: { account_id: accountId },
    }).then((res) => resolve(res.map(removeUselessAgencyClientStuff)))
  )
}

function onCabinetSelect(e, select) {
  adCabinetId = e.params.data.id
  if (cabinetIsAgency(adCabinetId)) {
    select.html('')
    addPlaceholderOption()
    getAgencyClients(adCabinetId).then((clients) => {
      select.off('select2:select')
      $('label[for="ad-acc-select"]').html(
        'Выбери клиента агентского кабинета:'
      )
      removePlaceholderOption()
      addItemsToSelect(clients, select)
      if (clients.length === 1) agencyClient = clients[0].id
      else
        select.on('select2:select', (event) => {
          agencyClient = event.params.data.id
        })
    })
  }
}

function initSelect() {
  const select = $('select#ad-acc-select')
  select.select2({ placeholder: 'Выбрать', language: 'ru' })
  loadSelectData()
  select.on('select2:select', (e) => onCabinetSelect(e, select))
}

function removeShit(str) {
  return str && str.includes('&') ? str.split('&', 1)[0] : str
}

function convertRecord(obj) {
  const newObj = {}
  newObj.utm_1 = removeShit(obj.utm_1)
  newObj.utm_2 = removeShit(obj.utm_2)
  newObj.utm_3 = removeShit(obj.utm_3)
  newObj.str_utm = newObj.utm_1 + newObj.utm_2 + newObj.utm_3
  newObj.count = 1
  return newObj
}

function formatDate4VK(dateObj) {
  return flatpickr.formatDate(dateObj, 'Y-m-d')
}

function convertDatesRange4VK(dateRange) {
  if (dateRange.length === 0) return [0, 0]
  return dateRange.map((date) => formatDate4VK(date))
}

function getAdsStats(ads) {
  const vkStatsRange = convertDatesRange4VK(statsRange)
  const period = statsRange.length ? 'day' : 'overall'
  const data = {
    account_id: adCabinetId,
    ids_type: 'ad',
    ids: JSON.stringify(ads),
    period,
    date_from: vkStatsRange[0],
    date_to: vkStatsRange[1],
  }
  if (agencyClient) data.client_id = agencyClient
  return vk({
    method: 'ads.getStatistics',
    data,
  })
}

function addToData(record) {
  record = convertRecord(record)
  const foundRecord = fileData.find((item) => item.str_utm === record.str_utm)
  if (foundRecord) {
    foundRecord.count += 1
  } else {
    fileData.push(record)
  }
}

function parseCsv() {
  const csv = new CSV(removeHeader(fileContent), {
    header: true,
    cast: false,
  }).parse()
  csv.forEach(addToData)
}

function addLoader(elem) {
  const wrapper = $('<div class="loading"></div>')
  const loading = $('<div class="sk-circle"></div>')
  let innerHtml = ''
  for (let i = 1; i <= 12; i += 1) {
    innerHtml += `<div class="sk-circle${i.toString()} sk-child"></div>`
  }
  loading.html(innerHtml)
  wrapper.html(loading)
  elem.html(wrapper)
}

function showLoader() {
  const main = $('main')
  main.children().fadeOut(400, () => {
    main.empty()
    addLoader(main)
  })
}

function removeLoader() {
  return new Promise((resolve) => {
    const main = $('main')
    main.children().fadeOut(600, () => {
      main.empty()
      resolve()
    })
  })
}

function initTable(ads) {
  const table =
    '<table id="data-table" class="display"><thead><tr>' +
    '<th>UTM 1</th><th>UTM 2</th><th>UTM 3</th><th>Количество лидов</th><th>Потрачено</th><th>CPL</th>' +
    '</tr></thead><tbody></tbody></table>'
  $('main').append(table)
  $('#data-table').DataTable({
    language: {
      processing: 'Подождите...',
      search: 'Поиск:',
      lengthMenu: 'Показать _MENU_ записей',
      info: 'Записи с _START_ до _END_ из _TOTAL_ записей',
      infoEmpty: 'Записи с 0 до 0 из 0 записей',
      infoFiltered: '(отфильтровано из _MAX_ записей)',
      infoPostFix: '',
      loadingRecords: 'Загрузка записей...',
      zeroRecords: 'Записи отсутствуют.',
      emptyTable: 'В таблице отсутствуют данные',
      paginate: {
        first: 'Первая',
        previous: 'Предыдущая',
        next: 'Следующая',
        last: 'Последняя',
      },
      aria: {
        sortAscending: ': активировать для сортировки столбца по возрастанию',
        sortDescending: ': активировать для сортировки столбца по убыванию',
      },
    },
    pageLength: 50,
    data: ads,
    columnDefs: [
      { targets: '_all', className: 'dt-center' },
      { targets: [2, 3, 4], searchable: false },
    ],
    columns: [
      { data: 'utm_1' },
      { data: 'utm_2' },
      { data: 'utm_3' },
      { data: 'leads' },
      { data: 'spent' },
      { data: 'cpl' },
    ],
  })
}

function countSummaryInfo(ads) {
  const leads = ads.reduce((accumulator, ad) => accumulator + ad.leads, 0)
  const spents = +ads
    .reduce((accumulator, ad) => accumulator + ad.spent, 0)
    .toFixed(2)
  const cpl = countCpl(leads, spents)
  return { leads, spents, cpl }
}

function createSummaryText(leads, spents, cpl) {
  return `лидов: ${leads}, потрачено ${spents} руб, средняя цена лида: ${cpl} руб`
}

function appendSummaryText(text) {
  const wrapper = $('<div class="summary-wrapper"></div>')
  wrapper.append('<p>Суммарно:</p>')
  wrapper.append(`<p>${text}</p>`)
  $('main').append(wrapper)
}

function addSummaryText(ads) {
  const { leads, spents, cpl } = countSummaryInfo(ads)
  const text = createSummaryText(leads, spents, cpl)
  appendSummaryText(text)
}

function getAdsLinks() {
  const data = {
    account_id: adCabinetId,
    include_deleted: 0,
  }
  if (agencyClient) data.client_id = agencyClient
  return new Promise((resolve) =>
    vk({
      method: 'ads.getAdsLayout',
      data,
    }).then((res) => {
      res = res.map((item) => {
        return {
          id: parseInt(item.id, 10),
          link: item.link_url,
        }
      })
      resolve(res)
    })
  )
}

function appendPostIdToAd(ad) {
  const searchElement = 'vk.com/wall'
  ad.postId = ad.link.slice(
    ad.link.indexOf(searchElement) + searchElement.length
  )
  return ad
}

function getAdsPosts(ads) {
  let i = 0
  const step = 100
  const resultPosts = []
  return new Promise((resolve) => {
    const promises = []
    do {
      const partAds = ads.slice(i, i + step)
      let strPosts = partAds.reduce(
        (accumulator, currentAd) => `${accumulator + currentAd.postId},`,
        ''
      )
      strPosts = strPosts.slice(0, -1)
      promises.push(
        vk({
          method: 'wall.getById',
          data: { posts: strPosts },
        })
      )
      i += step
    } while (i < ads.length)
    Promise.all(promises).then((res) => {
      for (const promisePosts of res) resultPosts.push(...promisePosts)
      resolve(resultPosts)
    })
  })
}

function removeUselessPostStuff(post) {
  return {
    id: `${post.owner_id}_${post.id}`,
    text: post.text,
    attachments: post.attachments,
  }
}

function getAttachmentsLink(post) {
  let link = false
  if (!post.attachments) return link
  for (const attachment of post.attachments) {
    if (attachment.type === 'link') {
      link = attachment.link.url
      break
    }
  }
  return link
}

function appendLinkFromAttachments(post) {
  const link = getAttachmentsLink(post)
  if (!link) post.link = undefined
  else post.link = link
  return post
}

function execResOnString(reArray, stringArray) {
  for (const re of reArray) {
    for (const string of stringArray) {
      if (string) {
        const match = re.exec(string)
        if (match) return match
      }
    }
  }
  return false
}

function findAndAppendTargetLink(post) {
  const anketsRe = /vk\.com\/app5619682_-\d+(#\d+(_[A-Za-z0-9_-]*)?)?/
  const vkCcRe = /vk\.cc\/[A-Za-z0-9_-]+/
  const res = [anketsRe, vkCcRe]
  // eslint-disable-next-line prefer-destructuring
  post.targetLink = execResOnString(res, [post.text, post.link])[0]
  return post
}

function anyIncludesAny(strings, subStrings) {
  for (const string of strings) {
    for (const subStr of subStrings) {
      if (string && subStr && string.includes(subStr)) return true
    }
  }
  return false
}

function isPostIncludesTargetLinks(post) {
  const basicLinks = ['vk.com/app5619682_', 'vk.cc']
  return anyIncludesAny([post.text, post.link], basicLinks)
}

function removeAttachments(post) {
  post.attachments = undefined
  return post
}

function removePostText(post) {
  post.text = undefined
  return post
}

function mergeAdsAndPosts(ads, posts) {
  for (const ad of ads) {
    ad.id = parseInt(ad.id, 10)
    let i = 0
    for (const post of posts) {
      if (ad.postId === post.id) {
        ad.anketsLink = post.targetLink
        posts.splice(i, 1)
        break
      }
      i += 1
    }
    if (!posts.length) break
  }
  return ads
}

function adIncludesAnketsLink(ad) {
  return Boolean(ad.anketsLink)
}

function sliceFromIndexOf(string, searchString) {
  return string.slice(string.indexOf(searchString) + searchString.length)
}

function parseUtms(ad) {
  if (ad.anketsLink.includes('#')) {
    ad.anketsLink = sliceFromIndexOf(ad.anketsLink, '#')
    const [anketId, ...utms] = ad.anketsLink.split('_', 4)
    ad.anketId = anketId
    ad.utms = utms
    ad.anketId = parseInt(ad.anketId, 10)
    // eslint-disable-next-line prefer-destructuring
    if (ad.utms && ad.utms[0]) ad.utms[0] = ad.utms[0]
    ad.str_utm = ''
    if (ad.utms.length) for (const utm of ad.utms) ad.str_utm += utm
  }
  ad.anketsLink = undefined
  return ad
}

function removeLinkAndPostId(ad) {
  ad.link = undefined
  ad.postId = undefined
  return ad
}

function getAnketId(ad) {
  return ad.anketId
}

function adHasAnketId(ad) {
  return Boolean(ad.anketId)
}

function isPromotedPost(ad) {
  return ad.link.includes('vk.com/wall-')
}

function showManyAnketsIdsAlert(...anketIds) {
  $(document).on('click', '.inputGroup > input', onAnketIdRadioClicked)
  const form = $('<form class="form"></form>')
  for (const id of anketIds) {
    const inputGroup = $('<div class="inputGroup"></div>')
    const radioId = `radio${id}`
    const input = $(`<input>`, {
      type: 'radio',
      name: 'anketId',
      value: id,
      id: radioId,
    })
    const label = $(`<label for="${radioId}" class="ankets">${id}</label>`)
    inputGroup.append(input, label)
    form.append(inputGroup)
  }
  form
    .find('input')
    .first()
    .attr('checked', 'checked')
  const firstValue = form
    .find('input')
    .first()
    .val()
  return swal({
    title: 'В кабинете несколько Анкет.\nС какой из них я должен работать?',
    icon: 'info',
    content: form[0],
    button: {
      text: 'Выбрать',
      visible: true,
      className: 'anketIdChoose',
      closeModal: true,
      value: firstValue,
    },
  })
}

function onAnketIdRadioClicked(e) {
  const value = $(e.target).val()
  swal.setActionValue(value)
}

function isAnketIdEqualsTo(ad, id) {
  return ad.anketId === id
}

function getIds(ads) {
  const ids = new Set()
  for (const ad of ads) {
    ids.add(ad.id)
  }
  return [...ids]
}

function addSpentsToAds(ads, vkStats) {
  for (const ad of ads) {
    ad.spent = 0.0
    for (const adStats of vkStats) {
      if (ad.id === adStats.id) {
        for (const period of adStats.stats) {
          ad.spent += parseFloat(period.spent || 0)
        }
      }
    }
    ad.spent = +ad.spent.toFixed(2)
  }
  return ads
}

function convertRecordToAd(record) {
  const utms = [record.utm_1, record.utm_2]
  return {
    spent: 0.0,
    str_utm: record.str_utm,
    utms,
    leads: record.count,
  }
}

function addLeadsToAds(ads, localFileData) {
  for (const ad of ads) {
    ad.leads = 0
    for (const record of localFileData) {
      if (ad.str_utm === record.str_utm) {
        ad.leads += record.count
        record.addedToAds = true
      }
    }
  }
  for (const record of localFileData) {
    if (!record.addedToAds) {
      ads.push(convertRecordToAd(record))
    }
  }
  return ads
}

function removeAnketIdAndId(ad) {
  ad.anketId = undefined
  ad.id = undefined
  return ad
}

function countCpl(leads, spent) {
  if (leads || !(leads || spent)) return spent ? +(spent / leads).toFixed(2) : 0
  return `>${spent}`
}

function addCplToAds(ads) {
  ads = ads.map((ad) => {
    ad.cpl = countCpl(ad.leads, ad.spent)
    return ad
  })
  return ads
}

function convetUtmsArrayToFields(ad) {
  ad.utm_1 = ''
  ad.utm_2 = ''
  ad.utm_3 = ''
  if (ad.utms.length) {
    ad.utm_1 = ad.utms[0] || ''
    ad.utm_2 = ad.utms[1] || ''
    ad.utm_3 = ad.utms[2] || ''
    ad.utms = undefined
  }
  return ad
}

function mergeDuplicates(ads) {
  const newAds = []
  for (const ad of ads) {
    const alreadyExistingItem = newAds.find(
      (item) => ad.str_utm === item.str_utm
    )
    if (!alreadyExistingItem) newAds.push(ad)
    else alreadyExistingItem.spent += ad.spent
  }
  return newAds
}

function containsVkCcLink(posts) {
  const links = []
  for (const post of posts) {
    links.push(post.targetLink)
  }
  return anyIncludesAny(links, ['vk.cc/'])
}

function convertVkCcLinks(res) {
  return { url: res.url, key: res.key }
}

function loadVkCcLinks() {
  return new Promise((resolve) =>
    vk({
      method: 'utils.getLastShortenedLinks',
      data: {
        count: 100,
      },
    }).then((res) => resolve(res.items.map(convertVkCcLinks)))
  )
}

function resolveShortLinks(posts, shortLinks) {
  for (const post of posts) {
    const searchStr = 'vk.cc/'
    const indexOfSearchStr = post.targetLink.indexOf(searchStr)
    if (indexOfSearchStr !== -1) {
      const key = post.targetLink.slice(indexOfSearchStr + searchStr.length)
      post.targetLink = shortLinks.find((item) => item.key === key).url
    }
  }
  return posts
}

function work() {
  showLoader()
  parseCsv()
  getAdsLinks()
    .then((ads) => {
      ads = ads.filter(isPromotedPost).map(appendPostIdToAd)
      getAdsPosts(ads)
        .then((posts) => {
          posts = posts
            .map(removeUselessPostStuff)
            .map(appendLinkFromAttachments)
            .map(removeAttachments)
            .filter(isPostIncludesTargetLinks)
            .map(findAndAppendTargetLink)
            .map(removePostText)
          if (containsVkCcLink(posts)) {
            return new Promise((resolve) => {
              loadVkCcLinks().then((shortLinks) => {
                posts = resolveShortLinks(posts, shortLinks)
                resolve(posts)
              })
            })
          }
          return Promise.resolve(posts)
        })
        .then((posts) => {
          ads = mergeAdsAndPosts(ads, posts)
            .map(removeLinkAndPostId)
            .filter(adIncludesAnketsLink)
            .map(parseUtms)
            .filter(adHasAnketId)
          const anketIds = new Set(ads.map(getAnketId))
          if (anketIds.size > 1) {
            return new Promise((resolve) =>
              showManyAnketsIdsAlert(...anketIds).then((id) => {
                id = parseInt(id, 10)
                ads = ads.filter((ad) => isAnketIdEqualsTo(ad, id))
                resolve(ads)
              })
            )
          }
          return Promise.resolve(ads)
        })
        .then((localAds) => {
          const ids = getIds(localAds)
          if (!ids.length) {
            SwalUtils.showErrorAlert({
              text: 'Нет объявлений с ссылкой на Анкеты',
            }).then(() => removeLoader())
            throw new Error('No ads')
          }
          return getAdsStats(ids)
        })
        .then((stats) => {
          ads = addSpentsToAds(ads, stats).map(removeAnketIdAndId)
          ads = mergeDuplicates(ads)
          ads = addLeadsToAds(ads, fileData)
          ads = addCplToAds(ads)
          return removeLoader()
        })
        .then(() => {
          addSummaryText(ads)
          ads = ads.map(convetUtmsArrayToFields)
          initTable(ads)
        })
    })
    // eslint-disable-next-line no-console
    .catch((err) => console.error(err))
}

function removeHeader(text) {
  return text.split('\n\n')[1]
}

function readFile(file) {
  const reader = new FileReader()
  reader.onload = (e) => {
    fileContent = e.target.result
  }
  reader.readAsText(file, 'cp1251')
}

function checkFile(file) {
  return !file.name.endsWith('.csv')
    ? 'Неверный файл!\nУ него расширение не .csv'
    : ''
}

function safeCheckFile(file) {
  const error = checkFile(file)
  if (error) {
    SwalUtils.showErrorAlert({ text: error })
    throw new Error(error)
  }
  return file
}

const dropzoneHoverClass = 'hover'
const dropzoneDroppedClass = 'dropped'

function removeDroppedClass($elem) {
  $elem.removeClass(dropzoneDroppedClass)
}

function handleFileAndClasses($elem) {
  let file
  try {
    file = $('input.file-input')[0].files[0]
    file = safeCheckFile(file)
    $elem.addClass(dropzoneDroppedClass)
    const textElements = $elem.children('p.inner-text')
    $(textElements[0]).text(`Файл ${file.name} успешно загружен`)
    $(textElements[1]).text('Беру данные из него')
  } catch (e) {
    removeDroppedClass($elem)
    throw e
  }
  readFile(file)
}

function onFileInputChange() {
  const $elem = $('#dropzone')
  $elem.removeClass(dropzoneHoverClass)
  if (!this.files[0]) {
    removeDroppedClass($elem)
  } else {
    handleFileAndClasses($elem)
  }
}

function initDropzone() {
  const dropzone = document.getElementById('dropzone')
  dropzone.addEventListener('dragenter', () =>
    dropzone.classList.add(dropzoneHoverClass)
  )
  dropzone.addEventListener('dragleave', () =>
    dropzone.classList.remove(dropzoneHoverClass)
  )
  $('input.file-input')[0].addEventListener('change', onFileInputChange)
}

$(document).ready(onLoad)
