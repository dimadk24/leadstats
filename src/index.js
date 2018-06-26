import CSV from 'comma-separated-values/csv';
import catta from 'catta';

const api_url = 'https://api.vk.com/method/';
const api_version = 5.80;
let ad_cabinet_id = 0;
let file_content = '';
let campaigns = [];
let csv_data = [];
let request_time = 0;

function vk(options) {
    let data = options.data || {};
    data.access_token = access_token;
    data.version = api_version;
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
                .then(res => resolve(res.response))
                .catch(err => {
                    console.log(err);
                    reject(err);
                })
        }
    });
}


function onLoad() {
    initSelect();
    initDropzone();
}

function addItemsToSelect(array, select) {
    for (let item of array) {
        if (item.account_status && ['admin', 'manager'].includes(item.access_role)) {
            select.append(`<option value="${item.account_id}">${item.account_name}</option>`);
        }
    }
}

function addLoadedData(array) {
    const select = $('select#ad-acc-select');
    if (array.length === 0) {
        select.append(`<option value="0">У тебя нет рекламных кабинетов :(</option>`);
    } else
        addItemsToSelect(array, select);
}

function loadSelectData() {
    vk({method: 'ads.getAccounts'}).then(accounts => {
        $('option#placeholder').remove();
        addLoadedData(accounts);
    }, err => console.error(err));
}

function initSelect() {
    const select = $('select#ad-acc-select');
    select.select2({placeholder: "Выбрать", language: "ru"});
    loadSelectData();
    select.on('select2:select', (e) => {
        ad_cabinet_id = e.params.data.id;
        work();
    });
}

const dropzone_hover_class = 'dropzone-hover';

function onDragEnter() {
    this.classList.add(dropzone_hover_class);
}

function onDragLeave() {
    this.classList.remove(dropzone_hover_class);
}

function dragOver(e) {
    e.stopPropagation();
    e.preventDefault();
}

function mergeCampaignAndUtm(utm, campaign_name, campaign_id) {
    if (campaign_name.includes(utm)) {
        campaigns.push({'id': campaign_id, 'name': campaign_name, 'utm': utm});
    }
}

function removeShit(str) {
    return str.includes('&') ? str.split('&', 1)[0] : str;
}

function convertVkCampaigns(campaign_array) {
    let campaign_ids = [];
    for (let campaign of campaign_array) {
        campaign_ids.push({id: campaign.id, name: campaign.name})
    }
    return campaign_ids;
}

function load_campaigns() {
    return new Promise((resolse, reject) => vk({
        method: 'ads.getCampaigns',
        data: {account_id: ad_cabinet_id, include_deleted: 0}
    }).then(campaign_array => {
        resolse(convertVkCampaigns(campaign_array));
    }));
}

function mergeCampaigns(campaign_ids) {
    for (let record of csv_data) {
        for (let campaign of campaign_ids) {
            mergeCampaignAndUtm(record.utm_1, campaign.name, campaign.id);
        }
    }
    return campaigns;
}

function get_campaigns_id(campaigns) {
    let ids = [];
    for (let campaign of campaigns) {
        ids.push(campaign.id);
    }
    return ids;
}

function convertVkAd(ad) {
    return {name: ad.name, id: parseInt(ad.id)};
}

function mergeAdsAndCampaigns(ads, campaigns) {
    for (let campaign of campaigns) {
        campaign.ads = [];
        for (let ad of ads)
            if (ad.campaign_id === campaign.id)
                campaign.ads.push(convertVkAd(ad));
    }
    return campaigns;
}

function getAds(campaigns) {
    const ids = get_campaigns_id(campaigns);
    return vk({
        method: 'ads.getAds',
        data: {
            account_id: ad_cabinet_id,
            include_deleted: 0,
            campaign_ids: JSON.stringify(ids)
        }
    });
}

function mergeAdsAndUtm(csv_record, campaigns) {
    const utm_1 = csv_record.utm_1;
    const utm_2 = csv_record.utm_2;
    let ad_utm = utm_1 + utm_2;
    for (let campaign of campaigns) {
        let new_ads = [];
        for (let ad of campaign.ads) {
            if (ad.name.includes(ad_utm)) {
                ad.text_utm = ad_utm;
                ad.utm_1 = utm_1;
                ad.utm_2 = utm_2;
            }
            new_ads.push(ad);
        }
        campaign.ads = new_ads;
    }
}

function mergeCampaignsAdsAndUtm(campaigns) {
    for (let record of csv_data) {
        mergeAdsAndUtm(record, campaigns);
    }
    return campaigns;
}

function changeRecord(obj) {
    obj.utm_1 = removeShit(obj.utm_1);
    obj.utm_1 = obj.utm_1.replace(/^\D+/g, '');
    return obj;
}

function convertCampaignsToAds(campaigns) {
    let ads = [];
    for (let campaign of campaigns) {
        for (let ad of campaign.ads) {
            ads.push(ad);
        }
    }
    return ads;
}

function getAdsStats(ads) {
    return vk({
        method: 'ads.getStatistics',
        data: {
            account_id: ad_cabinet_id,
            ids_type: 'ad',
            ids: JSON.stringify(ads),
            period: 'overall',
            date_from: 0,
            date_to: 0,
        }
    });
}

function getAdsIds(ads) {
    return ads.map(ad => ad.id);
}

function mergeAdsAndStats(ads, stats) {
    for (let ad of ads) {
        for (let obj of stats) {
            ad.spent = obj.id !== ad.id ? ad.spent :
                obj.stats.length ? parseFloat(obj.stats[0].spent) : 0;
        }
    }
    return ads;
}

function work() {
    if (ad_cabinet_id && file_content) {
        // noinspection JSUnresolvedFunction
        const csv = new CSV(remove_header(file_content), {header: true, cast: false}).parse();
        csv.forEach(record => csv_data.push(changeRecord(record)));
        load_campaigns().then(campaign_ids => {
            let campaigns = mergeCampaigns(campaign_ids);
            getAds(campaigns)
                .then(vk_ads => {
                    campaigns = mergeAdsAndCampaigns(vk_ads, campaigns);
                    campaigns = mergeCampaignsAdsAndUtm(campaigns);
                    let ads = convertCampaignsToAds(campaigns);
                    getAdsStats(getAdsIds(ads)).then(res => {
                        ads = mergeAdsAndStats(ads, res);
                        console.log(ads)
                    });
                });
        });
    }
}

function remove_header(text) {
    return text.split('\n\n')[1]
}

function readFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        file_content = e.target.result;
        work();
    };
    reader.readAsText(file, 'cp1251')
}

function check_files(files) {
    return !files.length ? 'Перетащи файл'
        : !files[0].name.endsWith('.csv') ? 'Неверный файл!\nУ него расширение не .csv'
            : '';
}

function safe_get_file(dataTransfer) {
    const files = dataTransfer.files;
    const error = check_files(files);
    if (error) {
        alert(error);
        throw new Error(error);
    }
    return files[0];
}

function changeStyles() {
    const dropzone = $('#dropzone');
    dropzone.removeClass('dropzone-hover');
    dropzone.addClass('dropzone-dropped');
}

function onDrop(e) {
    e.stopPropagation();
    e.preventDefault();
    changeStyles();
    readFile(safe_get_file(e.dataTransfer));
}

function initDropzone() {
    const dropzone = document.getElementById("dropzone");
    dropzone.addEventListener("dragenter", onDragEnter);
    dropzone.addEventListener("dragleave", onDragLeave);
    dropzone.addEventListener("dragover", dragOver);
    dropzone.addEventListener("drop", onDrop);
}

$(document).ready(onLoad);
