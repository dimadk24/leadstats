import CSV from 'comma-separated-values/csv';
import catta from 'catta';
import swal from 'sweetalert';
import flatpickr from 'flatpickr';
import {Russian} from 'flatpickr/dist/l10n/ru'

flatpickr.localize(Russian);

const api_url = 'https://api.vk.com/method/';
const api_version = "5.80";
let ad_cabinet_id = 0;
let file_content = '';
let fileData = [];
let request_time = 0;
let license_checked = false;
let user;
const legal_users = getLegalUsers();
const connect_dev_link = 'https://vk.me/dimadk24';
let adAccounts = [];
let agencyClient;
let statsRange;
let calendarInput;

function getLegalUsers() {
    let users = [
        {
            id: ['1', '5', '9', '2', '0', '4', '0', '9', '8'],
            expireTime: 0
        },
        {
            id: ['8', '3', '8', '1', '4', '3', '7', '5'],
            expireTime: 0
        }
    ];
    return users
        .map(setIsHasAccess)
        .map(convertLegalUserId);
}

function setIsHasAccess(user) {
    const foreverAccess = user.expireTime === 0;
    const expireTime = new Date(user.expireTime * 1000).getTime();
    const nowTime = new Date().getTime();
    user.hasAccess = foreverAccess || nowTime < expireTime;
    return user;

}

function convertLegalUserId(user) {
    let id = '';
    for (let number of user.id) {
        id += number;
    }
    user.id = +id;
    return user;
}

function getErrorText(error_code) {
    const errors = {
        1: 'Неизвестная для ВК ошибка. Попробуй позже',
        5: 'Авторизация не удалась, обнови токен доступа.\n' +
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
        603: 'Произошла ошибка при работе с РК'
    };
    const error_text = errors[error_code];
    return error_text ? error_text : 'Неизвестная ошибка';
}

function vk(options) {
    let data = options.data || {};
    data.access_token = access_token;
    data.v = api_version;
    return new Promise((resolve, reject) => {
        const now = Date.now();
        const difference = now - request_time;
        if (request_time && difference < 500) setTimeout(request, difference);
        else request();

        function request() {
            request_time = now;
            // noinspection JSUnresolvedFunction
            catta({
                type: 'jsonp', timeout: 2,
                url: api_url + options.method, data: data,
            })
                .then(res => {
                    if (res.response) {
                        resolve(res.response)
                    } else {
                        const error_code = res.error.error_code;
                        const error_message = res.error.error_msg;
                        const error_nice_text = getErrorText(error_code);
                        showErrorAlert({
                            title: 'Возникла ошибка при работе с ВК',
                            text: error_nice_text
                        });
                        console.error(res.error);
                        throw new Error(`#${error_code}: ${error_message}`);
                    }
                }, err => {
                    showErrorAlert({
                        text: 'Сетевая ошибка.\n' +
                        'Проверь соединие с Интернетом и обнови страницу'
                    });
                    console.log(err);
                    reject(err);
                })
        }
    });
}

function getUserVkData() {
    return new Promise(resolve => vk({
        method: 'users.get'
    }).then(res => resolve(res[0])));
}

function showBuyAlert() {
    const title = 'Упс, эта программа платная';
    const html = '<p>Опробуй ее бесплатно перед покупкой!</p>' +
        '<p>Напиши <a href="https://vk.com/dimadk24">разработчику</a> и получи</p>' +
        '<p><span class="free-trial">Бесплатный тестовый доступ</span></p>';
    const ctaText = 'Получить';
    baseShowLicenseAlert(title, html, ctaText);
}

function showLicenseExpiredAlert() {
    const title = 'Упс, тестовый период закончился';
    const html = '<p>Понравилась программа?</p>' +
        '<p>Напиши <a href="https://vk.com/dimadk24">разработчику</a></p>' +
        '<p>Купи вечную лицензию</p>' +
        '<p>И пользуйся программой всегда!</p>';
    const ctaButton = 'Написать';
    baseShowLicenseAlert(title, html, ctaButton);
}

function baseShowLicenseAlert(title, html, ctaText) {
    let text = document.createElement('div');
    text.innerHTML = html;
    swal({
        icon: 'warning',
        title: title,
        content: {
            element: text
        },
        button: {
            text: ctaText,
            value: true,
            className: 'cta-button',
            closeModal: false
        }
    }).then(value => {
        if (value)
            window.location.href = connect_dev_link;
    });
}

function verifyLicense() {
    getUserVkData()
        .then(data => {
            const user_vk_id = data.id;
            user = legal_users.find(user => user.id === user_vk_id) || false;
            if (!user)
                showBuyAlert();
            else if (!user.hasAccess)
                showLicenseExpiredAlert();
            license_checked = true;
        });
}

function initCalendars() {
    calendarInput = flatpickr('#calendar-input', {
        mode: 'range',
        dateFormat: 'j.m.Y'
    });
}

function checkInputs() {
    let error;
    if (!ad_cabinet_id)
        error = 'Не выбран кабинет.\nВыбери его сверху';
    else if (!file_content)
        error = 'Не выбран файл от Анкет.\nПеретащи или выбери его';
    return error;
}

function getDatesRange() {
    const selectedDates = calendarInput.selectedDates;
    return selectedDates ? selectedDates : undefined;
}

function onStart() {
    statsRange = getDatesRange();
    const error = checkInputs();
    if (error)
        showErrorAlert({text: error});
    else {
        if (license_checked) {
            if (!user)
                showBuyAlert();
            else if (!user.hasAccess)
                showLicenseExpiredAlert();
        } else
            verifyLicense();
        if (user && user.hasAccess)
            work();
    }
}

function onLoad() {
    verifyLicense();
    initSelect();
    initDropzone();
    initCalendars();
    $('button.start').on('click', onStart);
}

function convertCabinetsToOptions(array) {
    return array.map(item => {
        return {name: item.account_name, id: item.account_id}
    });
}

function addCabinetsToSelect(array, select) {
    let optionArray = convertCabinetsToOptions(array);
    if (optionArray.length === 0)
        optionArray.push({name: 'У тебя нет активных рекламных кабинетов :(', id: 0});
    addItemsToSelect(optionArray, select);
}

function addItemsToSelect(array, select) {
    const options = array.map(item => new Option(item.name, item.id, false, false));
    select.append(...options).trigger('change');
}

function filterCabinets(array) {
    array = array.filter(item =>
        item.account_status && ['admin', 'manager'].includes(item.access_role)
    );
    return array;
}

function setAdAccounts(array) {
    adAccounts = array.map(item => {
        return {id: item.account_id, type: item.account_type}
    });
}

function removePlaceholderOption() {
    $('option#placeholder').remove();
}

function addPlaceholderOption() {
    // noinspection XmlDefaultAttributeValue
    $('select#ad-acc-select').html(
        '<option id="placeholder" value="0" disabled="disabled">Загружаю клиентов кабинета</option>'
    );
}

function loadSelectData() {
    vk({method: 'ads.getAccounts'})
        .then(accounts => {
            removePlaceholderOption();
            accounts = filterCabinets(accounts);
            setAdAccounts(accounts);
            addCabinetsToSelect(accounts, $('select#ad-acc-select'));
        });
}

function cabinetIsAgency(cabinet_id) {
    const cabinet_obj = adAccounts.find(acc => acc.id === parseInt(cabinet_id));
    return cabinet_obj.type === 'agency'
}

function removeUselessAgencyClientStuff(item) {
    return {name: item.name, id: item.id}
}

function getAgencyClients(accountId) {
    return new Promise(
        resolve => vk({
            method: 'ads.getClients',
            data: {account_id: accountId}
        })
            .then(res => resolve(res.map(removeUselessAgencyClientStuff)))
    );
}

function onCabinetSelect(e, select) {
    ad_cabinet_id = e.params.data.id;
    if (cabinetIsAgency(ad_cabinet_id)) {
        select.html('');
        addPlaceholderOption();
        getAgencyClients(ad_cabinet_id)
            .then(clients => {
                select.off('select2:select');
                $('label[for="ad-acc-select"]').html('Выбери клиента агентского кабинета:');
                removePlaceholderOption();
                addItemsToSelect(clients, select);
                if (clients.length === 1)
                    agencyClient = clients[0].id;
                else
                    select.on('select2:select', e => agencyClient = e.params.data.id);
            });
    }
}

function initSelect() {
    const select = $('select#ad-acc-select');
    select.select2({placeholder: "Выбрать", language: "ru"});
    loadSelectData();
    select.on('select2:select', (e) => onCabinetSelect(e, select));
}

function removeShit(str) {
    return str.includes('&') ? str.split('&', 1)[0] : str;
}

function getAds(campaigns) {
    const data = {
        account_id: ad_cabinet_id,
        campaign_ids: JSON.stringify(campaigns),
        include_deleted: 0,
    };
    if (agencyClient)
        data.client_id = agencyClient;
    return vk({
        method: 'ads.getAds',
        data: data
    });
}

function convertRecord(obj) {
    let new_obj = {};
    new_obj.utm_1 = removeShit(obj.utm_1).replace(/^\D+/g, '');
    new_obj.utm_2 = removeShit(obj.utm_2);
    new_obj.str_utm = new_obj.utm_1 + new_obj.utm_2;
    new_obj.count = 1;
    return new_obj;
}

function formatDate4VK(dateObj) {
    return flatpickr.formatDate(dateObj, "Y-m-d");
}

function convertDatesRange4VK(dateRange) {
    if (dateRange.length === 0)
        return [0, 0];
    else
        return dateRange.map(date => formatDate4VK(date));
}

function getAdsStats(ads) {
    const vkStatsRange = convertDatesRange4VK(statsRange);
    const period = statsRange.length ? 'day' : 'overall';
    const data = {
        account_id: ad_cabinet_id,
        ids_type: 'ad',
        ids: JSON.stringify(ads),
        period: period,
        date_from: vkStatsRange[0],
        date_to: vkStatsRange[1],
    };
    if (agencyClient)
        data.client_id = agencyClient;
    return vk({
        method: 'ads.getStatistics',
        data: data
    });
}

function addToData(record) {
    record = convertRecord(record);
    const found_record = fileData.find(item => item.str_utm === record.str_utm);
    found_record ? found_record.count++ : fileData.push(record);
}

function parseCsv() {
    // noinspection JSUnresolvedFunction
    const csv = new CSV(remove_header(file_content), {header: true, cast: false}).parse();
    csv.forEach(addToData);
}

function addLoader(elem) {
    let wrapper = $('<div class="loading"></div>');
    let loading = $('<div class="sk-circle"></div>');
    let inner_html = '';
    for (let i = 1; i <= 12; i++) {
        inner_html += '<div class="sk-circle' + i.toString() + ' sk-child"></div>'
    }
    loading.html(inner_html);
    wrapper.html(loading);
    elem.html(wrapper);
}

function showLoader() {
    const main = $('main');
    // noinspection JSValidateTypes
    main.children().fadeOut(400, () => {
        main.empty();
        addLoader(main);
    });
}

function removeLoader() {
    return new Promise((resolve) => {
        const main = $('main');
        // noinspection JSValidateTypes
        main.children().fadeOut(600, () => {
            main.empty();
            resolve();
        });
    })
}

function initTable(ads) {
    const table = "<table id='data-table' class='display'><thead><tr>" +
        "<th>UTM 1</th><th>UTM 2</th><th>Количество лидов</th><th>Потрачено</th><th>CPL</th>" +
        "</tr></thead><tbody></tbody></table>";
    $('main').append(table);
    $('#data-table').DataTable({
        language: {
            "processing": "Подождите...",
            "search": "Поиск:",
            "lengthMenu": "Показать _MENU_ записей",
            "info": "Записи с _START_ до _END_ из _TOTAL_ записей",
            "infoEmpty": "Записи с 0 до 0 из 0 записей",
            "infoFiltered": "(отфильтровано из _MAX_ записей)",
            "infoPostFix": "",
            "loadingRecords": "Загрузка записей...",
            "zeroRecords": "Записи отсутствуют.",
            "emptyTable": "В таблице отсутствуют данные",
            "paginate": {
                "first": "Первая",
                "previous": "Предыдущая",
                "next": "Следующая",
                "last": "Последняя"
            },
            "aria": {
                "sortAscending": ": активировать для сортировки столбца по возрастанию",
                "sortDescending": ": активировать для сортировки столбца по убыванию"
            }
        },
        pageLength: 50,
        data: ads,
        columnDefs: [
            {targets: '_all', className: 'dt-center'},
            {targets: [2, 3, 4], searchable: false}
        ],
        columns: [
            {data: 'utm_1'},
            {data: 'utm_2'},
            {data: 'leads'},
            {data: 'spent'},
            {data: 'cpl'}
        ]
    });
}

function showErrorAlert(options) {
    options = options || {};
    options.title = options.title || 'Ошибка';
    options.icon = 'error';
    return swal(options);
}

function removeUselessCampaignStuff(campaign) {
    return {
        id: campaign.id,
        name: campaign.name
    }
}

function filterCampaigns(campaigns) {
    return campaigns.filter(
        campaign => ['normal', 'promoted_posts'].includes(campaign.type)
    );
}

function getCampaigns() {
    let data = {
        account_id: ad_cabinet_id,
        include_deleted: 0,
    };
    if (agencyClient)
        data.client_id = agencyClient;
    return new Promise(
        (resolve, reject) =>
            vk({
                method: 'ads.getCampaigns',
                data: data
            })
                .then(res => {
                    resolve(filterCampaigns(res).map(removeUselessCampaignStuff));
                })
    );
}

function countSummaryInfo(ads) {
    const leads = ads.reduce((accumulator, ad) => accumulator + ad.leads, 0);
    const spents = +ads.reduce(
        (accumulator, ad) => accumulator + ad.spent,
        0).toFixed(2);
    const cpl = countCpl(leads, spents);
    return {leads, spents, cpl};
}

function createSummaryText(leads, spents, cpl) {
    return `лидов: ${leads}, потрачено ${spents} руб, средняя цена лида: ${cpl}`;
}

function appendSummaryText(text) {
    const wrapper = $('<div class="summary-wrapper"></div>');
    wrapper.append('<p>Суммарно:</p>');
    wrapper.append(`<p>${text}</p>`);
    $('main').append(wrapper);
}

function addSummaryText(ads) {
    const {leads, spents, cpl} = countSummaryInfo(ads);
    const text = createSummaryText(leads, spents, cpl);
    appendSummaryText(text);
}

function getAdsLinks() {
    let data = {
        account_id: ad_cabinet_id,
        include_deleted: 0,
    };
    if (agencyClient)
        data.client_id = agencyClient;
    return new Promise(
        (resolve, reject) => vk({
            method: 'ads.getAdsLayout',
            data: data
        })
            .then(res => {
                res = res.map(item => {
                    return {
                        id: parseInt(item.id),
                        link: item.link_url
                    }
                });
                resolve(res);
            })
    );
}

function appendPostIdToAd(ad) {
    const searchElement = 'vk.com/wall';
    ad.postId = ad.link.slice(ad.link.indexOf(searchElement) + searchElement.length);
    return ad;
}

function getAdsPosts(ads) {
    let i = 0;
    const step = 100;
    let resultPosts = [];
    return new Promise(resolve => {
        let promises = [];
        do {
            let partAds = ads.slice(i, i + step);
            let strPosts = partAds.reduce(
                (accumulator, currentAd) => accumulator + currentAd.postId + ',',
                '');
            strPosts = strPosts.slice(0, -1);
            promises.push(
                vk({
                    method: 'wall.getById',
                    data: {posts: strPosts}
                })
            );
            i += step;
        } while (i < ads.length);
        Promise.all(promises)
            .then(res => {
                for (let promisePosts of res)
                    resultPosts.push(...promisePosts);
                resolve(resultPosts);
            });
    });
}

function removeUselessPostStuff(post) {
    return {
        id: `${post.owner_id}_${post.id}`,
        text: post.text,
        attachments: post.attachments
    };
}

function attachmentsIncludesLink(post) {
    let link = false;
    if (!post.attachments)
        return link;
    for (let attachment of post.attachments) {
        if (attachment.type === 'link') {
            link = attachment.link.url;
            break;
        }
    }
    return link;
}

function appendLinkFromAttachments(post) {
    const link = attachmentsIncludesLink(post);
    if (!link)
        post.link = undefined;
    else
        post.link = link;
    return post;
}

function findAndAppendAnketsLink(post) {
    let re = /vk\.com\/app5619682_-\d+(#\d+(_[A-Za-z0-9_-]*)?)?/;
    const match = re.exec(post.text) || (post.link && re.exec(post.link));
    post.anketsLink = match[0];
    return post;
}

function isPostIncludesAnketsLink(post) {
    const basicAnketsLink = 'vk.com/app5619682_';
    return (
        post.text.includes(basicAnketsLink) ||
        (post.link && post.link.includes(basicAnketsLink))
    );
}

function removeAttachments(post) {
    post.attachments = undefined;
    return post;
}

function removePostText(post) {
    post.text = undefined;
    return post;
}

function mergeAdsAndPosts(ads, posts) {
    for (let ad of ads) {
        ad.id = parseInt(ad.id);
        let i = 0;
        for (let post of posts) {
            if (ad.postId === post.id) {
                ad.anketsLink = post.anketsLink;
                posts.splice(i, 1);
                break;
            }
            i++;
        }
        if (!posts.length)
            break;
    }
    return ads;
}

function adIncludesAnketsLink(ad) {
    return Boolean(ad.anketsLink);
}

function sliceFromIndexOf(string, searchString) {
    return string.slice(string.indexOf(searchString) + searchString.length);
}

function parseUtms(ad) {
    if (ad.anketsLink.includes('#')) {
        ad.anketsLink = sliceFromIndexOf(ad.anketsLink, '#');
        [ad.anketId, ...ad.utms] = ad.anketsLink.split('_', 3);
        ad.anketId = parseInt(ad.anketId);
        if (ad.utms && ad.utms[0])
            ad.utms[0] = ad.utms[0].replace(/^\D+/g, '');
        ad.str_utm = '';
        if (ad.utms.length)
            for (let utm of ad.utms)
                ad.str_utm += utm;
    }
    ad.anketsLink = undefined;
    return ad;
}

function removeLinkAndPostId(ad) {
    ad.link = undefined;
    ad.postId = undefined;
    return ad;
}

function getAnketId(ad) {
    return ad.anketId;
}

function adHasAnketId(ad) {
    return Boolean(ad.anketId);
}

function isPromotedPost(ad) {
    return ad.link.includes('vk.com/wall-');
}

function showManyAnketsIdsAlert(...anketIds) {
    $(document).on('click', '.inputGroup > input', onAnketIdRadioClicked);
    let form = $('<form class="form"></form>');
    for (let id of anketIds) {
        let inputGroup = $('<div class="inputGroup"></div>');
        const radioId = `radio${id}`;
        let input = $(`<input>`, {
            type: 'radio',
            name: 'anketId',
            value: id,
            id: radioId,
        });
        let label = $(`<label for="${radioId}" class="ankets">${id}</label>`);
        inputGroup.append(input, label);
        form.append(inputGroup);
    }
    form.find('input').first().attr("checked", "checked");
    const firstValue = form.find('input').first().val();
    return swal({
        title: 'В кабинете несколько Анкет.\n' +
        'С какой из них я должен работать?',
        icon: 'info',
        content: form[0],
        button: {
            text: 'Выбрать',
            visible: true,
            className: 'anketIdChoose',
            closeModal: true,
            value: firstValue
        }
    });
}

function onAnketIdRadioClicked(e) {
    const value = $(e.target).val();
    swal.setActionValue(value);
}

function isAnketIdEqualsTo(ad, id) {
    return ad.anketId === id;
}

function getIds(ads) {
    let ids = new Set();
    for (let ad of ads) {
        ids.add(ad.id);
    }
    return [...ids];
}

function addSpentsToAds(ads, vk_stats) {
    for (let ad of ads) {
        ad.spent = 0.0;
        for (let ad_stats of vk_stats) {
            if (ad.id === ad_stats.id) {
                for (let period of ad_stats.stats) {
                    ad.spent += parseFloat(period.spent || 0);
                }
            }
        }
        ad.spent = +ad.spent.toFixed(2);
    }
    return ads;
}

function convertRecordToAd(record) {
    const utms = [record.utm_1, record.utm_2];
    return {
        spent: 0.0,
        str_utm: record.str_utm,
        utms: utms,
        leads: record.count
    }
}

function addLeadsToAds(ads, fileData) {
    for (let ad of ads) {
        ad.leads = 0;
        for (let record of fileData) {
            if (ad.str_utm === record.str_utm) {
                ad.leads += record.count;
                record.addedToAds = true;
            }
        }
    }
    for (let record of fileData) {
        if (!record.addedToAds) {
            ads.push(convertRecordToAd(record));
        }
    }
    return ads;
}

function removeAnketIdAndId(ad) {
    ad.anketId = undefined;
    ad.id = undefined;
    return ad;
}

function countCpl(leads, spent) {
    if (leads || !(leads || spent))
        return spent ? +(spent / leads).toFixed(2) : 0;
    return `>${spent}`
}

function addCplToAds(ads) {
    ads = ads.map(ad => {
        ad.cpl = countCpl(ad.leads, ad.spent);
        return ad
    });
    return ads;
}

function convetUtmsArrayToFields(ad) {
    ad.utm_1 = '';
    ad.utm_2 = '';
    if (ad.utms.length) {
        ad.utm_1 = ad.utms[0];
        ad.utm_2 = ad.utms[1];
        ad.utms = undefined;
    }
    return ad;
}

function work() {
    showLoader();
    parseCsv();
    getAdsLinks()
        .then(ads => {
            ads = ads
                .filter(isPromotedPost)
                .map(appendPostIdToAd);
            getAdsPosts(ads)
                .then(posts => {
                    posts = posts
                        .map(removeUselessPostStuff)
                        .map(appendLinkFromAttachments)
                        .map(removeAttachments)
                        .filter(isPostIncludesAnketsLink)
                        .map(findAndAppendAnketsLink)
                        .map(removePostText);
                    ads = mergeAdsAndPosts(ads, posts)
                        .map(removeLinkAndPostId)
                        .filter(adIncludesAnketsLink)
                        .map(parseUtms)
                        .filter(adHasAnketId);
                    let anketIds = new Set(ads.map(getAnketId));
                    if (anketIds.size > 1) {
                        return new Promise(resolve =>
                            showManyAnketsIdsAlert(...anketIds)
                                .then(id => {
                                    id = parseInt(id);
                                    ads = ads.filter(ad => isAnketIdEqualsTo(ad, id));
                                    resolve(ads);
                                }));
                    }
                    return Promise.resolve(ads);
                })
                .then(ads => {
                    const ids = getIds(ads);
                    if (!ids.length) {
                        showErrorAlert({
                            text: "Нет объявлений с ссылкой на Анкеты"
                        })
                            .then(() => removeLoader());
                        throw new Error('No ads');
                    }
                    return getAdsStats(ids)
                })
                .then(stats => {
                    ads = addSpentsToAds(ads, stats)
                        .map(removeAnketIdAndId);
                    ads = addLeadsToAds(ads, fileData);
                    ads = addCplToAds(ads);
                    return removeLoader();
                })
                .then(() => {
                    addSummaryText(ads);
                    ads = ads.map(convetUtmsArrayToFields);
                    initTable(ads);
                });
        }).catch(err => console.error(err));
}

function remove_header(text) {
    return text.split('\n\n')[1]
}

function readFile(file) {
    const reader = new FileReader();
    reader.onload = e => file_content = e.target.result;
    reader.readAsText(file, 'cp1251')
}

function check_file(file) {
    return !file.name.endsWith('.csv') ? 'Неверный файл!\nУ него расширение не .csv' : '';
}

function safe_check_file(file) {
    const error = check_file(file);
    if (error) {
        showErrorAlert({text: error});
        throw new Error(error);
    }
    return file;
}

const dropzone_hover_class = 'hover';
const dropzone_dropped_class = 'dropped';

function removeDroppedClass($elem) {
    $elem.removeClass(dropzone_dropped_class);
}

function handleFileAndClasses($elem) {
    $elem.addClass(dropzone_dropped_class);
    let file;
    try {
        file = safe_check_file($('input.file-input')[0].files[0]);
    } catch (e) {
        removeDroppedClass($elem);
        throw e;
    }
    readFile(file);
}

function onFileInputChange() {
    const $elem = $('#dropzone');
    $elem.removeClass(dropzone_hover_class);
    if (!this.files[0]) {
        removeDroppedClass($elem);
    }
    else {
        handleFileAndClasses($elem);
    }
}

function initDropzone() {
    const dropzone = document.getElementById("dropzone");
    dropzone.addEventListener("dragenter", () => dropzone.classList.add(dropzone_hover_class));
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove(dropzone_hover_class));
    $('input.file-input')[0].addEventListener("change", onFileInputChange);
}

$(document).ready(onLoad);